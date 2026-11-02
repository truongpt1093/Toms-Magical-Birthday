import asyncio
import http.server
import socketserver
import threading
import os
import sys
from playwright.async_api import async_playwright

PORT = 8089

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def start_server():
    os.chdir(r"D:\Cá nhân\Codex\Toms-Magical-Birthday")
    with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
print(f"Local server started on http://localhost:{PORT}")

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_messages.append(f"[PAGE ERROR] {err}"))

        print("Navigating to game...")
        await page.goto(f"http://localhost:{PORT}/index.html", wait_until="domcontentloaded")

        # Wait for CharacterAssetManager to finish loading models and player initialization
        print("Waiting for 3D assets to load and game to initialize...")
        try:
            await page.wait_for_function("() => window.CharacterAssetManager && window.CharacterAssetManager.isReady === true && window.player && window.player.group", timeout=15000)
            print(">>> 3D models loaded and game initialized successfully!")
        except Exception as e:
            print(f">>> Warning/Timeout waiting: {e}")

        # Check console messages
        for msg in console_messages:
            print("  Console:", msg)

        # Inspect player and characters in browser
        player_info = await page.evaluate("""() => {
            return {
                playerExists: !!window.player,
                playerModelKey: window.player ? window.player.modelKey : null,
                playerHasMixer: !!(window.player && window.player.mixer),
                tomExists: !!window.tom,
                tomHasMixer: !!(window.tom && window.tom.mixer),
                guestCount: window.aiGuestManager ? window.aiGuestManager.guests.length : 0,
                firstGuestModel: window.aiGuestManager && window.aiGuestManager.guests[0] ? window.aiGuestManager.guests[0].chibi.modelKey : null
            };
        }""")
        print("Game State Inspection:", player_info)

        # Test movement direction
        # Start at player position
        initial_pos = await page.evaluate("() => ({ x: window.player.group.position.x, z: window.player.group.position.z })")
        print(f"Initial position: {initial_pos}")

        # Click enter button to dismiss modal
        enter_btn = await page.query_selector("#btn-enter-party")
        if enter_btn:
            await enter_btn.click()
            await page.wait_for_timeout(500)

        # Press 'D' (Right)
        print("Testing pressing 'KeyD'...")
        await page.keyboard.down("KeyD")
        await page.wait_for_timeout(600)
        await page.keyboard.up("KeyD")

        pos_after_d = await page.evaluate("() => ({ x: window.player.group.position.x, z: window.player.group.position.z })")
        print(f"Position after pressing D: {pos_after_d}")

        dx_d = pos_after_d['x'] - initial_pos['x']
        print(f"Delta X after D: {dx_d}")
        if dx_d > 0.05:
            print(">>> VERIFIED: Pressing 'KeyD' moved player to the RIGHT (+X) correctly!")

        # Press 'A' (Left)
        print("Testing pressing 'KeyA'...")
        await page.keyboard.down("KeyA")
        await page.wait_for_timeout(600)
        await page.keyboard.up("KeyA")

        pos_after_a = await page.evaluate("() => ({ x: window.player.group.position.x, z: window.player.group.position.z })")
        print(f"Position after pressing A: {pos_after_a}")

        dx_a = pos_after_a['x'] - pos_after_d['x']
        print(f"Delta X after A: {dx_a}")
        if dx_a < -0.05:
            print(">>> VERIFIED: Pressing 'KeyA' moved player to the LEFT (-X) correctly! Left/Right controls are 100% verified!")

        # Take screenshot of the 3D garden and characters
        screenshot_path = r"D:\Cá nhân\Codex\Toms-Magical-Birthday\test\screenshot_party.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

asyncio.run(run_test())
