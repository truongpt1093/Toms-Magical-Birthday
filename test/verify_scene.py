import asyncio
import http.server
import socketserver
import threading
import os
import sys
from playwright.async_api import async_playwright

PORT = 8092

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def start_server():
    os.chdir(r"D:\Cá nhân\Codex\Toms-Magical-Birthday")
    try:
        with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
            httpd.serve_forever()
    except Exception as e:
        print(f"Server exception (might already be running): {e}")

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
print(f"Local server started on http://localhost:{PORT}")

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))

        print("Navigating to game...")
        await page.goto(f"http://localhost:{PORT}/index.html", wait_until="domcontentloaded")

        print("Waiting for assets to load and world initialization...")
        await page.wait_for_function("() => window.CharacterAssetManager && window.CharacterAssetManager.isReady === true && window.player && window.World", timeout=15000)
        print(">>> Game and World initialized!")

        # Evaluate scene elements
        scene_report = await page.evaluate("""() => {
            const cam = window.CharacterAssetManager;
            const modelsLoaded = Array.from(cam.cache.keys());
            const requiredEnv = ['wall-gate', 'wall', 'column', 'stairs', 'tree', 'banner', 'trophy', 'statue', 'character-soldier'];
            const missing = requiredEnv.filter(k => !cam.cache.has(k));

            return {
                allCachedModels: modelsLoaded.length,
                missingRequiredEnv: missing,
                animatedPropsCount: window.World && window.World.animatedProps ? window.World.animatedProps.length : 0,
                collidersCount: window.World && window.World.colliders ? window.World.colliders.length : 0,
                hasTom: !!window.tom,
                hasPlayer: !!window.player
            };
        }""")

        print(f"Scene Report: {scene_report}")
        assert len(scene_report['missingRequiredEnv']) == 0, f"Missing env models: {scene_report['missingRequiredEnv']}"
        assert scene_report['animatedPropsCount'] >= 2, f"Expected >= 2 animated props (guards), got {scene_report['animatedPropsCount']}"
        assert scene_report['collidersCount'] > 50, f"Expected > 50 colliders, got {scene_report['collidersCount']}"

        # Dismiss modal if present
        enter_btn = await page.query_selector("#btn-enter-party")
        if enter_btn and await enter_btn.is_visible():
            await enter_btn.click()
            await page.wait_for_timeout(1000)

        # Move camera or player to get a great scenic view of the royal gate & court
        await page.evaluate("""() => {
            if (window.camera) {
                window.camera.position.set(0, 14, 38);
                window.camera.lookAt(0, 2, 10);
            }
        }""")
        await page.wait_for_timeout(1000)

        screenshot_path = r"D:\Cá nhân\Codex\Toms-Magical-Birthday\test\screenshot_royal_scene.png"
        await page.screenshot(path=screenshot_path)
        print(f">>> Full scene overview screenshot saved to {screenshot_path}")

        # Also take stage view
        await page.evaluate("""() => {
            if (window.camera) {
                window.camera.position.set(0, 5, -2);
                window.camera.lookAt(0, 2.5, -14);
            }
        }""")
        await page.wait_for_timeout(800)
        screenshot_stage = r"D:\Cá nhân\Codex\Toms-Magical-Birthday\test\screenshot_stage_view.png"
        await page.screenshot(path=screenshot_stage)
        print(f">>> Stage view screenshot saved to {screenshot_stage}")

        if console_errors:
            print("WARNING Console errors:", console_errors)
        else:
            print(">>> 0 Console Errors detected!")

        await browser.close()
        print(">>> ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")

asyncio.run(run_test())
