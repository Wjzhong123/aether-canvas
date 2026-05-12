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
                query = message.get("query")
                await websocket.send_json({"type": "status", "content": "DECOMPOSING INTENT..."})
                
                # 1. Orchestrator plans tasks
                tasks = await orch.decompose_intent(query)
                
                collected_evidence = []
                for task in tasks:
                    # If task is not a URL, make it a search URL
                    url = task if task.startswith("http") else f"https://www.bing.com/search?q={task}"
                    
                    await websocket.send_json({"type": "status", "content": f"FETCHING EVIDENCE: {task}"})
                    
                    # 2. NexusBrowser gets visual evidence
                    evidence = await nexus.get_visual_evidence(url)
                    collected_evidence.append(evidence)
                    
                    await websocket.send_json({"type": "evidence", "content": evidence})
                
                # 3. Final Summary (Premium)
                await websocket.send_json({"type": "status", "content": "AUDITING & SUMMARIZING..."})
                summary = await orch.audit_and_summarize(query, collected_evidence)
                
                await websocket.send_json({
                    "type": "summary",
                    "content": summary
                })
                
                await websocket.send_json({"type": "status", "content": "RESEARCH COMPLETE."})
                
    except WebSocketDisconnect: pass
    except Exception as e: logger.error(f"WS Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
