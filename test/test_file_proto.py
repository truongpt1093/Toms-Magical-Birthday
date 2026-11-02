import asyncio
from playwright.async_api import async_playwright

async def test_file_protocol():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_messages.append(f"[PAGE ERROR] {err}"))

        file_url = "file:///D:/C%C3%A1%20nh%C3%A2n/Codex/Toms-Magical-Birthday/index.html"
        print(f"Opening {file_url} directly...")
        await page.goto(file_url, wait_until="domcontentloaded")

        try:
            await page.wait_for_function("() => window.CharacterAssetManager && window.CharacterAssetManager.isReady === true && window.player && window.player.group", timeout=15000)
            print(">>> SUCCESS: 3D Models loaded via file:// protocol directly!")
        except Exception as e:
            print(f">>> Timeout/Error: {e}")

        for msg in console_messages:
            print("Console:", msg)

        state = await page.evaluate("""() => {
            return {
                isReady: window.CharacterAssetManager.isReady,
                cacheSize: window.CharacterAssetManager.cache.size,
                playerModel: window.player.modelKey,
                playerHasMixer: !!window.player.mixer,
                tomHasMixer: !!window.tom.mixer,
                guestsCount: window.aiGuestManager.guests.length
            };
        }""")
        print("Direct File Protocol State:", state)

        await page.screenshot(path=r"D:\Cá nhân\Codex\Toms-Magical-Birthday\test\screenshot_direct_file.png")
        print("Screenshot direct file saved.")

        await browser.close()

asyncio.run(test_file_protocol())
