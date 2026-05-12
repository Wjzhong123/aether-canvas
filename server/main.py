from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import logging
import os
from nexus_browser import NexusBrowser
from orchestrator import Orchestrator
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AetherCanvas")

nexus = NexusBrowser()
orch = Orchestrator()

# Localization for status messages
STATUS_LOCALES = {
    "zh": {
        "sync_chat": "核心同步 // 正在对话...",
        "fetching": "正在检索证据: {task}",
        "complete": "系统就绪 // 任务完成",
        "identity_synced": "身份信息已同步",
        "no_evidence": "未发现有效证据",
        "mode": "当前模式: {mode}",
        "memory": "记忆检索: {task}"
    },
    "en": {
        "sync_chat": "SYNC_CHAT // RESPONDING...",
        "fetching": "FETCHING_EVIDENCE: {task}",
        "complete": "SYSTEM_READY // COMPLETE",
        "identity_synced": "IDENTITY_SYNCHRONIZED",
        "no_evidence": "NO_EVIDENCE_FOUND",
        "mode": "MODE: {mode}",
        "memory": "MEMORY_RETRIEVAL: {task}"
    }
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        logger.info("Starting NexusBrowser...")
        await nexus.start()
        logger.info("NexusBrowser started successfully.")
    except Exception as e:
        logger.error(f"NexusBrowser failed to start: {e}")
    yield
    await nexus.stop()

app = FastAPI(title="AetherCanvas API", lifespan=lifespan)

@app.get("/")
async def root():
    return {"status": "alive", "engine": "AetherCanvas Intelligence Bridge"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global task tracker for interruption
active_research_tasks = {}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection accepted.")
    client_id = id(websocket)
    active_research_tasks[client_id] = None
    
    try:
        await websocket.send_json({"type": "identity", "content": orch.identity})
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "interrupt":
                    if active_research_tasks[client_id]:
                        active_research_tasks[client_id].cancel()
                        active_research_tasks[client_id] = None
                        await websocket.send_json({"type": "status", "content": "INTERRUPTED // LISTENING..."})
                    continue

                api_keys = message.get("api_keys", {})
                lang = message.get("lang", "en")
                st = STATUS_LOCALES.get(lang, STATUS_LOCALES["en"])
                
                if message.get("type") == "research":
                    # Cancel existing if any
                    if active_research_tasks[client_id]:
                        active_research_tasks[client_id].cancel()
                    
                    async def run_research(msg):
                        try:
                            raw_query = msg.get("query")
                            cmd_data = await orch.parse_command(raw_query)
                            command = cmd_data["command"]
                            query = cmd_data["query"]

                            if command == "clear":
                                await websocket.send_json({"type": "clear"})
                                return

                            intent = await orch.classify_intent(query, api_keys)
                            if intent == "CHAT":
                                await websocket.send_json({"type": "status", "content": st["sync_chat"]})
                                full_reply = ""
                                async for chunk in orch.chat_stream(query, api_keys):
                                    full_reply += chunk
                                    await websocket.send_json({"type": "summary_chunk", "content": chunk})
                                await websocket.send_json({"type": "summary", "content": {"summary": full_reply, "citations": []}})
                                await websocket.send_json({"type": "status", "content": st["complete"]})
                                return

                            await websocket.send_json({"type": "status", "content": st["mode"].format(mode=command.upper())})
                            tasks = await orch.decompose_intent(cmd_data, api_keys)
                            
                            if command == "memory":
                                await websocket.send_json({"type": "summary", "content": {"summary": "\n".join(tasks), "citations": []}})
                                return

                            evidence_results = await asyncio.gather(*[
                                nexus.get_visual_evidence(t if t.startswith("http") else f"https://www.bing.com/search?q={t}")
                                for t in tasks
                            ])
                            collected_evidence = [e for e in evidence_results if e]
                            
                            for ev in collected_evidence:
                                await websocket.send_json({"type": "evidence", "content": ev})

                            if not collected_evidence:
                                await websocket.send_json({"type": "status", "content": st["no_evidence"]})
                            else:
                                summary = await orch.audit_and_summarize(query, collected_evidence, api_keys)
                                await websocket.send_json({"type": "summary", "content": summary})
                                await websocket.send_json({"type": "status", "content": st["complete"]})
                        except asyncio.CancelledError:
                            logger.info("Task cancelled by user interruption")
                        except Exception as e:
                            logger.error(f"Research Error: {e}")
                            await websocket.send_json({"type": "status", "content": f"ERROR: {str(e)}"})

                    active_research_tasks[client_id] = asyncio.create_task(run_research(message))
                
                elif message.get("type") == "feedback":
                    try:
                        rule = await orch.learn_from_feedback(message.get("data"), api_keys)
                        await websocket.send_json({"type": "status", "content": f"EVOLVED: {rule}"})
                    except Exception as e: logger.error(f"Feedback Error: {e}")
                
                elif message.get("type") == "update_identity":
                    new_identity = message.get("content")
                    with open("agent_identity.json", "w") as f: json.dump(new_identity, f)
                    orch.identity = new_identity
                    await websocket.send_json({"type": "status", "content": st["identity_synced"]})
            except Exception as e:
                logger.error(f"WS Loop Error: {e}")
                await websocket.send_json({"type": "status", "content": f"CRITICAL_ERROR: {str(e)}"})
                
    except WebSocketDisconnect:
        if client_id in active_research_tasks:
            if active_research_tasks[client_id]: active_research_tasks[client_id].cancel()
            del active_research_tasks[client_id]
    except Exception as e: 
        logger.error(f"WS Critical Error: {e}")

@app.websocket("/ws/live")
async def live_audio_endpoint(websocket: WebSocket):
    """Full-duplex audio stream for Aether Live mode"""
    await websocket.accept()
    try:
        while True:
            audio_chunk = await websocket.receive_bytes()
            # In a real scenario, stream this to Whisper / ElevenLabs
            # For now, we simulate back-and-forth signals
            pass
    except WebSocketDisconnect: pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
