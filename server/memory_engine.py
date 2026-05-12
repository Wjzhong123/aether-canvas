from mem0 import Memory
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MemoryEngine")

class MemoryEngine:
    def __init__(self):
        # Using default local configuration for Chromadb
        try:
            self.memory = Memory()
            logger.info("MemoryEngine (Mem0) initialized.")
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
        return self.memory.search(query, user_id=user_id)

    def get_all(self, user_id: str):
        if not self.memory: return []
        return self.memory.get_all(user_id=user_id)
