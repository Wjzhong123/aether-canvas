import litellm
import os
import json
import logging
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Orchestrator")

class Orchestrator:
    def __init__(self):
        # Default models - user can override via ENV
        self.cheap_model = os.getenv("CHEAP_MODEL", "deepseek/deepseek-chat")
        self.premium_model = os.getenv("PREMIUM_MODEL", "gpt-4o")

    async def decompose_intent(self, query: str) -> List[str]:
        logger.info(f"Decomposing intent: {query}")
        try:
            response = await litellm.acompletion(
                model=self.cheap_model,
                messages=[
                    {"role": "system", "content": "You are AetherCanvas Orchestrator. Extract search queries or specific URLs from user intent. Return ONLY a JSON list of strings."},
                    {"role": "user", "content": query}
                ],
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content)
            # Handle cases where model returns dict instead of list
            if isinstance(data, dict):
                for k in ["queries", "urls", "tasks"]:
                    if k in data: return data[k]
                return list(data.values())[0] if data else [query]
            return data
        except Exception as e:
            logger.error(f"Intent decomposition failed: {e}")
            return [query]

    async def audit_and_summarize(self, query: str, evidences: List[Dict]) -> str:
        logger.info(f"Auditing and summarizing {len(evidences)} evidences")
        # Use premium model for synthesis
        try:
            context = "\n".join([f"Source: {e['url']}\nTitle: {e['title']}\nContent: {e.get('text', '')[:1000]}" for e in evidences])
            response = await litellm.acompletion(
                model=self.premium_model,
                messages=[
                    {"role": "system", "content": "You are the Asymmetric Auditing Agent. Synthesize a pixel-perfect summary based on the provided evidence. Always reference source URLs."},
                    {"role": "user", "content": f"User Query: {query}\n\nEvidence:\n{context}"}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Summary failed: {str(e)}"
