import litellm
import os
import json
import logging
from typing import List, Dict
from dotenv import load_dotenv
from memory_engine import MemoryEngine

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Orchestrator")

class Orchestrator:
    def __init__(self):
        self.cheap_model = os.getenv("CHEAP_MODEL", "deepseek/deepseek-chat")
        self.premium_model = os.getenv("PREMIUM_MODEL", "gpt-4o")
        self.memory = MemoryEngine()

    async def decompose_intent(self, query: str, user_id: str = "default_user") -> List[str]:
        mems = self.memory.search(query, user_id=user_id)
        context = "\n".join([m['text'] for m in mems]) if mems else ""
        
        response = await litellm.acompletion(
            model=self.cheap_model,
            messages=[
                {"role": "system", "content": f"Decompose research intent. Previous Context: {context}. Return JSON list in 'queries' key."},
                {"role": "user", "content": query}
            ],
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        return data.get("queries", [query])

    async def audit_and_summarize(self, query: str, evidences: List[Dict], user_id: str = "default_user") -> Dict:
        logger.info(f"Auditing and summarizing {len(evidences)} evidences")
        context = "\n".join([f"Source: {e['url']}\nContent: {e.get('text', '')[:1000]}" for e in evidences])
        
        response = await litellm.acompletion(
            model=self.premium_model,
            messages=[
                {"role": "system", "content": "Asymmetric Auditing Agent. Provide a summary with 'citations'. Each citation must have 'point', 'url', and 'locator_text' (exact text from source). Return JSON object {summary: str, citations: list}."},
                {"role": "user", "content": f"Query: {query}\nEvidence: {context}"}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        self.memory.add(f"Audit Result for {query}: {result.get('summary', '')[:200]}", user_id=user_id)
        return result
