import litellm
import os
import json
import logging
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from memory_engine import MemoryEngine

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Orchestrator")

class Orchestrator:
    def __init__(self):
        self.cheap_model = os.getenv("CHEAP_MODEL", "deepseek/deepseek-chat")
        self.premium_model = os.getenv("PREMIUM_MODEL", "gpt-4o")
        self.temperature = 0.7
        self.memory = MemoryEngine()
        self.identity = self._load_identity()
        self.provider_configs = {}

    def _load_identity(self):
        try:
            with open("agent_identity.json", "r") as f:
                data = json.load(f)
                self.temperature = data.get("temperature", 0.7)
                return data
        except:
            return {"name": "Aether", "role": "CEO", "motto": "Always striving for excellence."}

    def _setup_keys(self, api_keys: Dict[str, Any]):
        self.identity = self._load_identity()
        self.premium_model = self.identity.get("premiumModel", "gpt-4o")
        self.cheap_model = self.identity.get("cheapModel", "deepseek/deepseek-chat")
        self.temperature = self.identity.get("temperature", 0.7)

        for key_name, config in api_keys.items():
            if isinstance(config, dict):
                val = config.get('key')
                base = config.get('baseUrl')
                if val:
                    os.environ[key_name] = val
                    if base: self.provider_configs[key_name] = base
            elif isinstance(config, str) and config:
                os.environ[key_name] = config

        if not self.memory.memory and os.environ.get("OPENAI_API_KEY") and "sk-" in os.environ.get("OPENAI_API_KEY", ""):
            if "deepseek" not in os.environ.get("OPENAI_API_KEY", ""):
                self.memory.reinit()

    def _get_completion_args(self, model: str) -> Dict[str, Any]:
        args = {"model": model, "temperature": self.temperature}
        
        target_base = None
        target_key = None
        
        # 1. Match specific provider by name
        for env_key, base_url in self.provider_configs.items():
            provider_name = env_key.lower().replace("_api_key", "").replace("_key", "")
            if provider_name in model.lower():
                target_base = base_url
                target_key = os.environ.get(env_key)
                break
        
        # 2. Heuristic for custom models
        if not target_base and self.provider_configs and "/" in model:
            env_key = list(self.provider_configs.keys())[0]
            target_base = self.provider_configs[env_key]
            target_key = os.environ.get(env_key)

        if target_base:
            args["api_base"] = target_base
            if target_key: args["api_key"] = target_key
            
            known_providers = ["gpt", "claude", "deepseek", "gemini", "anthropic", "zhipu", "bedrock", "ollama"]
            if not any(model.lower().startswith(p) for p in known_providers):
                if not model.startswith("openai/"):
                    args["model"] = f"openai/{model}"
        
        return args

    async def parse_command(self, raw_query: str) -> Dict[str, Any]:
        """Simple command parser to extract intent prefix."""
        # Check for prefixes like /clear, /memory, /video
        match = re.match(r"^/(\w+)\s*(.*)", raw_query)
        if match:
            return {"command": match.group(1), "query": match.group(2)}
        return {"command": "research", "query": raw_query}

    async def classify_intent(self, query: str, api_keys: Dict[str, Any]) -> str:
        """Aggressively fast intent classification."""
        clean_query = query.strip().lower()
        # Even more comprehensive Fast Path
        greeting_patterns = [
            r"^(hi|hello|hey|你好|您好|在吗|哈喽|早上好|中午好|下午好|晚上好)",
            r"(你是谁|谁是|介绍一下自己|你是哪位|你是啥|你的名字|what are you|who are you|introduce yourself|你的功能|你能做什么)",
            r"^(谢谢|感谢|再见|bye|thanks|ok|好的|行|可以|知道了)"
        ]
        if any(re.search(p, clean_query, re.I) for p in greeting_patterns) or len(clean_query) < 4:
            logger.info(f"Fast Path MATCH: {clean_query}")
            return "CHAT"

        self._setup_keys(api_keys)
        try:
            args = self._get_completion_args(self.cheap_model)
            response = await litellm.acompletion(
                **args,
                messages=[
                    {"role": "system", "content": "Classify: CHAT (casual/intro) or RESEARCH (facts/search). Reply 1 word."},
                    {"role": "user", "content": clean_query}
                ],
                max_tokens=2
            )
            intent = response.choices[0].message.content.strip().upper()
            result = "CHAT" if "CHAT" in intent else "RESEARCH"
            logger.info(f"LLM Classification: {clean_query} -> {result}")
            return result
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            return "CHAT" # Default to CHAT to avoid slow search if classification fails

    async def chat_stream(self, query: str, api_keys: Dict[str, Any], user_id: str = "default_user"):
        self._setup_keys(api_keys)
        mems = self.memory.search(query, user_id=user_id)
        context = "\n".join([m['text'] for m in mems]) if mems else ""
        
        args = self._get_completion_args(self.premium_model)
        response = await litellm.acompletion(
            **args,
            messages=[
                {"role": "system", "content": f"You are {self.identity['name']}, the {self.identity['role']}. Motto: {self.identity['motto']}. Respond concisely in the user's language. Context: {context}"},
                {"role": "user", "content": query}
            ],
            stream=True
        )
        async for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    async def chat(self, query: str, api_keys: Dict[str, Any], user_id: str = "default_user") -> Dict:
        self._setup_keys(api_keys)
        mems = self.memory.search(query, user_id=user_id)
        context = "\n".join([m['text'] for m in mems]) if mems else ""
        
        try:
            args = self._get_completion_args(self.premium_model)
            response = await litellm.acompletion(
                **args,
                messages=[
                    {"role": "system", "content": f"You are {self.identity['name']}, the {self.identity['role']}. Motto: {self.identity['motto']}. Respond concisely in the user's language. Context: {context}"},
                    {"role": "user", "content": query}
                ]
            )
            return {"summary": response.choices[0].message.content, "citations": []}
        except Exception as e:
            return {"summary": f"Connection lost: {str(e)}", "citations": []}

    async def decompose_intent(self, query_data: Dict, api_keys: Dict[str, Any], user_id: str = "default_user") -> List[str]:
        self._setup_keys(api_keys)
        query = query_data["query"]
        prefs = self.memory.search("user style preferences", user_id=user_id)
        pref_context = "\n".join([p['text'] for p in prefs]) if prefs else ""
        mems = self.memory.search(query, user_id=user_id)
        context = "\n".join([m['text'] for m in mems]) if mems else ""
        
        try:
            args = self._get_completion_args(self.cheap_model)
            response = await litellm.acompletion(
                **args,
                messages=[
                    {"role": "system", "content": f"You are {self.identity['name']}. Decompose research intent into JSON list of queries. Return ONLY JSON with 'queries' key."},
                    {"role": "user", "content": query}
                ],
                response_format={"type": "json_object"}
            )
            queries = json.loads(response.choices[0].message.content).get("queries", [])
            return queries if queries else [query]
        except Exception as e:
            return [query]

    async def audit_and_summarize(self, query: str, evidences: List[Dict], api_keys: Dict[str, Any], user_id: str = "default_user") -> Dict:
        self._setup_keys(api_keys)
        # Deep context: Include visual metadata for pixel-level alignment
        context_parts = []
        for e in evidences:
            elements_hint = "\n".join([f"Element: {el['text']} [Rect: {json.dumps(el['rect'])}]" for el in e.get('elements', [])[:10]])
            context_parts.append(f"Source: {e['url']}\nTitle: {e['title']}\nRelevant Elements:\n{elements_hint}\nContent: {e.get('text', '')[:800]}")
        
        context = "\n---\n".join(context_parts)
        
        try:
            args = self._get_completion_args(self.premium_model)
            response = await litellm.acompletion(
                **args,
                messages=[
                    {"role": "system", "content": f"You are {self.identity['name']}, the {self.identity['role']}. ASYMMETRIC AUDITING ENGINE. \n1. Summarize findings in the user's language.\n2. For EACH claim, provide a citation with 'url' and the EXACT 'point' (text segment) found in that source.\n3. Assign an 'importance_score' (0.0 to 1.0) to each source based on its relevance.\nReturn ONLY valid JSON: {{'summary': '...', 'citations': [{{'url': '...', 'point': '...'}}], 'source_weights': {{'url': 0.8}}}}"},
                    {"role": "user", "content": f"Analyze: {query}\n\nEvidence Evidence:\n{context}"}
                ],
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)
            
            # Enrich evidences with weights
            weights = result.get('source_weights', {})
            for e in evidences:
                e['importance'] = weights.get(e['url'], 0.5)

            self.memory.add(f"Audit: {result.get('summary', '')[:200]}", user_id=user_id)
            return result
        except Exception as e:
            return {"summary": f"Error: {str(e)}", "citations": []}

    async def learn_from_feedback(self, feedback_data: Dict, api_keys: Dict[str, Any], user_id: str = "default_user"):
        self._setup_keys(api_keys)
        args = self._get_completion_args(self.cheap_model)
        response = await litellm.acompletion(
            **args,
            messages=[
                {"role": "system", "content": "Analyze user feedback and distill preference rule."},
                {"role": "user", "content": json.dumps(feedback_data)}
            ]
        )
        rule = response.choices[0].message.content
        self.memory.add(f"RULE: {rule}", user_id=user_id, metadata={"type": "preference"})
        return rule
