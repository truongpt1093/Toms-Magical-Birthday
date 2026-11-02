import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. HTTP server tĩnh
const server = http.createServer((req, res) => {
    let filePath = path.join(rootDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }
    const ext = path.extname(filePath);
    let contentType = 'text/html; charset=utf-8';
    if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
    if (ext === '.css') contentType = 'text/css; charset=utf-8';
    if (ext === '.png') contentType = 'image/png';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(8088, async () => {
    console.log('Test server running at http://127.0.0.1:8088');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const chromeProc = spawn(chromePath, [
        '--headless=new',
        '--remote-debugging-port=9223',
        '--disable-gpu',
        '--no-sandbox',
        '--autoplay-policy=no-user-gesture-required',
        'http://127.0.0.1:8088'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const jsonRes = await fetch('http://127.0.0.1:9223/json');
        const tabs = await jsonRes.json();
        const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('8088')) || tabs[0];
        console.log('Connected to target tab:', pageTab.title, pageTab.url);

        const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

        let msgId = 1;
        const pending = new Map();
        const consoleMessages = [];
        const errors = [];

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.id && pending.has(data.id)) {
                pending.get(data.id)(data);
                pending.delete(data.id);
            }
            if (data.method === 'Runtime.consoleAPICalled') {
                const text = data.params.args.map(a => a.value || a.description).join(' ');
                consoleMessages.push(text);
                console.log('[Browser Console]', text);
            }
            if (data.method === 'Runtime.exceptionThrown') {
                const err = data.params.exceptionDetails;
                errors.push(err.text + ' ' + (err.exception?.description || ''));
                console.error('[Browser Exception]', err);
            }
        };

        const send = (method, params = {}) => {
            return new Promise((resolve) => {
                const id = msgId++;
                pending.set(id, resolve);
                ws.send(JSON.stringify({ id, method, params }));
            });
        };

        await new Promise((resolve) => { ws.onopen = resolve; });

        // Kích hoạt domains
        await send('Runtime.enable');
        await send('Page.enable');
        await send('DOM.enable');

        console.log('Waiting 3s for Three.js and scene initialization...');
        await new Promise(r => setTimeout(r, 3000));

        // Hàm evaluate JS trong trang
        const evaluate = async (expr) => {
            const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
            if (res.result && res.result.exceptionDetails) {
                console.error('Eval error for:', expr, res.result.exceptionDetails);
            }
            return res.result?.result?.value;
        };

        // 1. Kiểm tra tiêu đề và canvas Three.js
        const title = await evaluate('document.title');
        console.log('✓ Document Title:', title);

        const canvasExists = await evaluate('!!document.querySelector("canvas")');
        console.log('✓ Three.js Canvas exists:', canvasExists);

        // 2. Nhập tên và bấm Vào Tiệc
        console.log('Entering party with name "Thám Tử Trí Tuệ"...');
        await evaluate(`
            document.getElementById('player-name-input').value = 'Thám Tử Trí Tuệ';
            document.getElementById('btn-enter-party').click();
        `);
        await new Promise(r => setTimeout(r, 1000));

        // Bỏ qua hướng dẫn nếu hiện
        await evaluate(`
            const skipBtn = document.getElementById('btn-guide-skip');
            if (skipBtn) skipBtn.click();
        `);
        await new Promise(r => setTimeout(r, 500));

        // 3. Kiểm tra HUD
        const hudVisible = await evaluate('document.getElementById("game-hud").style.display');
        console.log('✓ HUD Display state:', hudVisible);

        const guestCountText = await evaluate('document.getElementById("hud-guest-counter").textContent');
        console.log('✓ Live guest counter HUD:', guestCountText);

        // 4. Kiểm tra hoạt động thổi nến
        console.log('Testing candle blow activity...');
        await evaluate(`
            const cakeObj = World.interactiveObjects.find(o => o.type === 'cake');
            InteractionSystem.currentAction = cakeObj;
            InteractionSystem.triggerCurrentAction();
        `);
        await new Promise(r => setTimeout(r, 800));

        const candleModalShown = await evaluate('!document.getElementById("candle-modal").classList.contains("hidden")');
        console.log('✓ Candle Modal shown:', candleModalShown);

        // Kích hoạt thổi nến
        await evaluate(`
            Activities.blowPower = 100;
            Activities.finishCandleBlowing();
        `);
        await new Promise(r => setTimeout(r, 800));

        const candleFinishVisible = await evaluate('document.getElementById("candle-finish-message").style.display');
        console.log('✓ Candle finish celebration visible:', candleFinishVisible === 'block');

        await evaluate('document.getElementById("btn-candle-continue").click();');
        await new Promise(r => setTimeout(r, 500));

        // 5. Kiểm tra mở hộp quà bí mật
        console.log('Testing gift box opening...');
        await evaluate(`
            const giftObj = World.interactiveObjects.find(o => o.type === 'gift_table');
            InteractionSystem.currentAction = giftObj;
            InteractionSystem.triggerCurrentAction();
        `);
        await new Promise(r => setTimeout(r, 800));

        const giftTitle = await evaluate('document.getElementById("gift-reveal-title").textContent');
        console.log('✓ Opened Gift Title:', giftTitle);

        await evaluate('document.getElementById("btn-claim-gift").click();');
        await new Promise(r => setTimeout(r, 500));

        // 6. Kiểm tra tùy chỉnh bánh kem và live update
        console.log('Testing cake customization...');
        await evaluate(`
            Activities.openCakeModal();
            // Chọn 3 tầng, màu dâu
            document.querySelector('#cake-tiers-picker [data-tiers="3"]').click();
            document.querySelector('#cake-color-picker [data-color="#FFD1DC"]').click();
            document.getElementById('cake-custom-text').value = 'BÉ TÔM YÊU DẤU';
            document.getElementById('btn-save-cake').click();
        `);
        await new Promise(r => setTimeout(r, 800));

        const savedCakeTiers = await evaluate('StorageManager.data.cakeConfig.tiers');
        console.log('✓ Saved Cake Tiers in LocalStorage:', savedCakeTiers);

        // 7. Kiểm tra gửi lời chúc
        console.log('Testing sending wish...');
        await evaluate(`
            Activities.openWishModal();
            // Chọn chủ đề Sức khỏe
            document.querySelector('.wish-topic-tag[data-topic="Sức khỏe"]').click();
            document.getElementById('btn-send-wish-mailbox').click();
        `);
        await new Promise(r => setTimeout(r, 800));

        const wishCount = await evaluate('StorageManager.data.wishesList.length');
        console.log('✓ Wishes count in storage:', wishCount);

        // 8. Kiểm tra mini-game hứng bóng bay
        console.log('Testing balloon catching mini-game...');
        await evaluate(`
            Activities.startBalloonMiniGame();
        `);
        await new Promise(r => setTimeout(r, 1000));

        const balloonBannerShown = await evaluate('document.getElementById("balloon-game-banner").classList.contains("show")');
        console.log('✓ Balloon game banner shown:', balloonBannerShown);

        await evaluate(`
            Activities.balloonScore = 8;
            Activities.finishBalloonMiniGame();
        `);
        await new Promise(r => setTimeout(r, 500));

        const balloonsCaught = await evaluate('StorageManager.data.balloonsCaughtRecord');
        console.log('✓ Balloons caught record:', balloonsCaught);

        // 9. Kiểm tra Sổ lưu niệm
        console.log('Testing Scrapbook modal...');
        await evaluate(`
            Scrapbook.open();
        `);
        await new Promise(r => setTimeout(r, 500));

        const sbModalShown = await evaluate('!document.getElementById("scrapbook-modal").classList.contains("hidden")');
        console.log('✓ Scrapbook modal opened:', sbModalShown);

        await evaluate('document.querySelector(".btn-modal-close[data-close=\\"scrapbook-modal\\"]").click();');
        await new Promise(r => setTimeout(r, 500));

        // 10. Kiểm tra xuất ảnh Poster 1080x1350
        console.log('Testing 1080x1350 Share Poster generator...');
        await evaluate(`
            SharePosterGenerator.generate((url) => {
                window.__testPosterUrl = url;
            });
        `);
        await new Promise(r => setTimeout(r, 2000));

        const posterUrl = await evaluate('window.__testPosterUrl');
        const posterValid = posterUrl && posterUrl.startsWith('data:image/png');
        console.log('✓ 1080x1350 Poster generated:', posterValid, 'Length:', posterUrl ? posterUrl.length : 0);

        // 11. Kiểm tra sự kiện đặc biệt "Khoảnh khắc sinh nhật"
        console.log('Testing Grand Birthday Moment...');
        await evaluate(`
            triggerSpecialBirthdayMoment();
        `);
        await new Promise(r => setTimeout(r, 800));

        const momentShown = await evaluate('!document.getElementById("moment-modal").classList.contains("hidden")');
        console.log('✓ Grand Birthday Moment modal shown:', momentShown);

        await evaluate('document.getElementById("btn-moment-close").click();');
        await new Promise(r => setTimeout(r, 500));

        // 12. Tổng kết lỗi trình duyệt nếu có
        console.log('--- TEST RESULTS ---');
        console.log('Total console logs captured:', consoleMessages.length);
        console.log('Total JS runtime errors/exceptions:', errors.length);
        if (errors.length > 0) {
            console.error('Errors found:', errors);
        }

        ws.close();
    } catch (err) {
        console.error('Test execution error:', err);
    } finally {
        chromeProc.kill();
        server.close();
        console.log('Server and browser stopped.');
    }
});
