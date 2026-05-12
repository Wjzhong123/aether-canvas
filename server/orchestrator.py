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
        prefix_map = {
            "gpt": "OPENAI_API_KEY",
            "deepseek": "DEEPSEEK_API_KEY",
            "nvidia": "NVIDIA_API_KEY",
            "claude": "ANTHROPIC_API_KEY",
            "zhipu": "ZHIPUAI_API_KEY"
        }
        for prefix, env_key in prefix_map.items():
            if prefix in model.lower() and env_key in self.provider_configs:
                args["api_base"] = self.provider_configs[env_key]
                break
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
        context = "\n".join([f"Source: {e['url']}\nContent: {e.get('text', '')[:1000]}" for e in evidences])
        try:
            args = self._get_completion_args(self.premium_model)
            response = await litellm.acompletion(
                **args,
                messages=[
                    {"role": "system", "content": f"You are {self.identity['name']}. Asymmetric Auditing Agent. Provide a summary with citations in JSON format. Ensure the summary is in the same language as the user's query."},
                    {"role": "user", "content": f"Query: {query}\nEvidence: {context}"}
                ],
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)
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
