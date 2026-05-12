import asyncio
from playwright.async_api import async_playwright
import base64
from typing import List, Dict, Optional
import logging
import io
from PIL import Image
from colorthief import ColorThief

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NexusBrowser")

class NexusBrowser:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None

    async def start(self):
        logger.info("Starting NexusBrowser...")
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        )

    async def stop(self):
        if self.browser: await self.browser.close()
        if self.playwright: await self.playwright.stop()

    async def get_visual_evidence(self, url: str) -> Dict:
        logger.info(f"Getting visual evidence for: {url}")
        page = await self.context.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=60000)
            await asyncio.sleep(2)
            
            # 1. Screenshot & Palette
            screenshot_bytes = await page.screenshot(full_page=False)
            palette = self._extract_palette(screenshot_bytes)
            
            # 2. Hero Image
            hero_image = await page.evaluate("""() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                const large = imgs.filter(i => i.width > 400 && i.height > 300);
                return large.length > 0 ? large[0].src : null;
            }""")
            
            # 3. Video Frames (Simple detection)
            video_frames = []
            if "youtube.com" in url or "youtu.be" in url:
                video_frames = await self._capture_video_frames(page)

            return {
                "url": url,
                "title": await page.title(),
                "screenshot": base64.b64encode(screenshot_bytes).decode('utf-8'),
                "palette": palette,
                "hero_image": hero_image,
                "video_frames": video_frames,
                "status": "success"
            }
        except Exception as e:
            return {"url": url, "status": "error", "message": str(e)}
        finally:
            await page.close()

    def _extract_palette(self, screenshot_bytes: bytes) -> List[str]:
        try:
            color_thief = ColorThief(io.BytesIO(screenshot_bytes))
            palette = color_thief.get_palette(color_count=5, quality=10)
            return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in palette]
        except:
            return ["#000000", "#ffffff"]

    async def _capture_video_frames(self, page) -> List[str]:
        frames = []
        try:
            player = await page.query_selector('.html5-video-player') or await page.query_selector('video')
            if player:
                for _ in range(2):
                    await asyncio.sleep(1.5)
                    f = await player.screenshot()
                    frames.append(base64.b64encode(f).decode('utf-8'))
        except: pass
        return frames
