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
        page = await self.context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(1)
            
            screenshot_bytes = await page.screenshot(full_page=False)
            palette = self._extract_palette(screenshot_bytes)
            
            # Extract elements for pixel-level alignment
            elements = await page.evaluate("""() => {
                const results = [];
                const selectors = ['h1', 'h2', 'p', 'article', 'section'];
                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 50 && rect.height > 20 && el.innerText.length > 20) {
                            results.push({
                                tag: el.tagName,
                                text: el.innerText.substring(0, 100),
                                rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
                            });
                        }
                    });
                });
                return results;
            }""")

            return {
                "url": url,
                "title": await page.title(),
                "screenshot": base64.b64encode(screenshot_bytes).decode('utf-8'),
                "palette": palette,
                "elements": elements,
                "status": "success"
            }
        except Exception as e:
            return {"url": url, "status": "error", "message": str(e)}
        finally:
            await page.close()

    def _extract_palette(self, screenshot_bytes: bytes) -> List[str]:
        try:
            color_thief = ColorThief(io.BytesIO(screenshot_bytes))
            return [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in color_thief.get_palette(color_count=5)]
        except: return ["#000000", "#ffffff"]
