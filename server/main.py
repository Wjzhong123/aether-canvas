from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import logging
from nexus_browser import NexusBrowser
from orchestrator import Orchestrator
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AetherCanvas")

nexus = NexusBrowser()
orch = Orchestrator()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await nexus.start()
    yield
    await nexus.stop()

app = FastAPI(title="AetherCanvas API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "research":
                cmd_data = await orch.parse_command(message.get("query"))
                command = cmd_data["command"]
                query = cmd_data["query"]

                if command == "clear":
                    await websocket.send_json({"type": "clear"})
                    continue

                await websocket.send_json({"type": "status", "content": f"MODE: {command.upper()}"})
                tasks = await orch.decompose_intent(cmd_data)
                
                collected_evidence = []
                for task in tasks:
                    url = task if task.startswith("http") else f"https://www.bing.com/search?q={task}"
                    await websocket.send_json({"type": "status", "content": f"FETCHING: {task}"})
                    evidence = await nexus.get_visual_evidence(url)
                    collected_evidence.append(evidence)
                    await websocket.send_json({"type": "evidence", "content": evidence})
                
                summary = await orch.audit_and_summarize(query, collected_evidence)
                await websocket.send_json({"type": "summary", "content": summary})
                await websocket.send_json({"type": "status", "content": "COMPLETE."})
            
            elif message.get("type") == "feedback":
                rule = await orch.learn_from_feedback(message.get("data"))
                await websocket.send_json({"type": "status", "content": f"EVOLVED: {rule}"})
                
    except WebSocketDisconnect: pass
    except Exception as e: logger.error(f"WS Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
