import litellm
import os
import json
import logging
from typing import List, Dict, Any
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

    async def parse_command(self, query: str) -> Dict[str, Any]:
        cmd = "search"
        clean_query = query
        if query.startswith("/v "): cmd = "video"; clean_query = query[3:]
        elif query.startswith("/p "): cmd = "palette"; clean_query = query[3:]
        elif query.startswith("/m "): cmd = "memory"; clean_query = query[3:]
        elif query.startswith("/clear"): cmd = "clear"; clean_query = ""
        return {"command": cmd, "query": clean_query}

    async def decompose_intent(self, query_data: Dict, user_id: str = "default_user") -> List[str]:
        cmd = query_data["command"]
        query = query_data["query"]
        
        # 1. Retrieve User Preferences for Self-Evolution
        prefs = self.memory.search("user style preferences layout favorite types", user_id=user_id)
        pref_context = "\n".join([p['text'] for p in prefs]) if prefs else "No specific preferences yet."
        
        mems = self.memory.search(query, user_id=user_id)
        context = "\n".join([m['text'] for m in mems]) if mems else ""
        
        system_prompt = f"Decompose research intent. \nUSER PREFERENCES: {pref_context}\nContext: {context}. "
        if cmd == "video": system_prompt += "Focus on video/YouTube."
        elif cmd == "palette": system_prompt += "Focus on UI/Design."
            
        response = await litellm.acompletion(
            model=self.cheap_model,
            messages=[
                {"role": "system", "content": f"{system_prompt} Return JSON list in 'queries' key."},
                {"role": "user", "content": query}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content).get("queries", [query])

    async def audit_and_summarize(self, query: str, evidences: List[Dict], user_id: str = "default_user") -> Dict:
        context = "\n".join([f"Source: {e['url']}\nContent: {e.get('text', '')[:1000]}" for e in evidences])
        response = await litellm.acompletion(
            model=self.premium_model,
            messages=[
                {"role": "system", "content": "Asymmetric Auditing Agent. Provide structured summary with citations."},
                {"role": "user", "content": f"Query: {query}\nEvidence: {context}"}
            ],
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        return result

    async def learn_from_feedback(self, feedback_data: Dict, user_id: str = "default_user"):
        """Self-Evolution: Analyze feedback and update memory."""
        logger.info(f"Learning from feedback: {feedback_data}")
        # Use LLM to distill preference insight
        response = await litellm.acompletion(
            model=self.cheap_model,
            messages=[
                {"role": "system", "content": "Analyze user feedback on research results and distill a single style/preference rule. Example: 'User prefers video sources over text' or 'User likes high-contrast palettes'."},
                {"role": "user", "content": json.dumps(feedback_data)}
            ]
        )
        preference_rule = response.choices[0].message.content
        self.memory.add(f"PREFERENCE_RULE: {preference_rule}", user_id=user_id, metadata={"type": "preference"})
        return preference_rule
