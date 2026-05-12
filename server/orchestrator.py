import litellm
import os
import json
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from memory_engine import MemoryEngine

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Orchestrator")

class Orchestrator:
    def __init__(self):
        # Fallback to ENV if provided, else wait for dynamic keys
        self.cheap_model = os.getenv("CHEAP_MODEL", "deepseek/deepseek-chat")
        self.premium_model = os.getenv("PREMIUM_MODEL", "gpt-4o")
        self.memory = MemoryEngine()

    def _setup_keys(self, api_keys: Dict[str, str]):
        """Inject dynamic keys into the environment for LiteLLM."""
        if api_keys.get("openai"):
            os.environ["OPENAI_API_KEY"] = api_keys["openai"]
        if api_keys.get("deepseek"):
            os.environ["DEEPSEEK_API_KEY"] = api_keys["deepseek"]

    async def parse_command(self, query: str) -> Dict[str, Any]:
        cmd = "search"
        clean_query = query
        if query.startswith("/v "): cmd = "video"; clean_query = query[3:]
        elif query.startswith("/p "): cmd = "palette"; clean_query = query[3:]
        elif query.startswith("/m "): cmd = "memory"; clean_query = query[3:]
        elif query.startswith("/clear"): cmd = "clear"; clean_query = ""
        return {"command": cmd, "query": clean_query}

    async def decompose_intent(self, query_data: Dict, api_keys: Dict[str, str], user_id: str = "default_user") -> List[str]:
        self._setup_keys(api_keys)
        cmd = query_data["command"]
        query = query_data["query"]
        
        prefs = self.memory.search("user style preferences", user_id=user_id)
        pref_context = "\n".join([p['text'] for p in prefs]) if prefs else ""
        
        mems = self.memory.search(query, user_id=user_id)
        context = "\n".join([m['text'] for m in mems]) if mems else ""
        
        system_prompt = f"Decompose research intent. Prefs: {pref_context}\nContext: {context}. "
        
        response = await litellm.acompletion(
            model=self.cheap_model,
            messages=[
                {"role": "system", "content": f"{system_prompt} Return JSON list in 'queries' key."},
                {"role": "user", "content": query}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content).get("queries", [query])

    async def audit_and_summarize(self, query: str, evidences: List[Dict], api_keys: Dict[str, str], user_id: str = "default_user") -> Dict:
        self._setup_keys(api_keys)
        context = "\n".join([f"Source: {e['url']}\nContent: {e.get('text', '')[:1000]}" for e in evidences])
        
        response = await litellm.acompletion(
            model=self.premium_model,
            messages=[
                {"role": "system", "content": "Asymmetric Auditing Agent. Provide summary with citations."},
                {"role": "user", "content": f"Query: {query}\nEvidence: {context}"}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        self.memory.add(f"Audit: {result.get('summary', '')[:200]}", user_id=user_id)
        return result

    async def learn_from_feedback(self, feedback_data: Dict, api_keys: Dict[str, str], user_id: str = "default_user"):
        self._setup_keys(api_keys)
        response = await litellm.acompletion(
            model=self.cheap_model,
            messages=[
                {"role": "system", "content": "Analyze user feedback and distill preference rule."},
                {"role": "user", "content": json.dumps(feedback_data)}
            ]
        )
        rule = response.choices[0].message.content
        self.memory.add(f"RULE: {rule}", user_id=user_id, metadata={"type": "preference"})
        return rule
