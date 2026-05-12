from mem0 import Memory
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MemoryEngine")

class MemoryEngine:
    def __init__(self):
        self.memory = None
        self.reinit()

    def reinit(self):
        # Using default local configuration for Chromadb
        try:
            # Mem0 requires OPENAI_API_KEY for embedding by default
            if os.environ.get("OPENAI_API_KEY"):
                self.memory = Memory()
                logger.info("MemoryEngine (Mem0) initialized.")
            else:
                logger.warning("MemoryEngine: No API key available for initialization.")
        except Exception as e:
            logger.error(f"Failed to initialize Mem0: {e}")
            self.memory = None

    def add(self, content: str, user_id: str, metadata: dict = None):
        if not self.memory: return
        logger.info(f"Adding memory for {user_id}: {content[:50]}...")
        self.memory.add(content, user_id=user_id, metadata=metadata)

    def search(self, query: str, user_id: str):
        if not self.memory: return []
        logger.info(f"Searching memory for {user_id}: {query}")
        try:
            # Modern Mem0 API uses filters dict
            return self.memory.search(query, filters={"user_id": user_id})
        except Exception as e:
            logger.error(f"Mem0 Search Error: {e}")
            return []

    def get_all(self, user_id: str):
        if not self.memory: return []
        try:
            return self.memory.get_all(filters={"user_id": user_id})
        except:
            return self.memory.get_all(user_id=user_id)
