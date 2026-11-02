import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(8089, async () => {
    console.log('Mobile test server running at http://127.0.0.1:8089');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const chromeProc = spawn(chromePath, [
        '--headless=new',
        '--remote-debugging-port=9224',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=390,844',
        'http://127.0.0.1:8089'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const jsonRes = await fetch('http://127.0.0.1:9224/json');
        const tabs = await jsonRes.json();
        const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('8089')) || tabs[0];

        const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
        let msgId = 1;
        const pending = new Map();

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.id && pending.has(data.id)) {
                pending.get(data.id)(data);
                pending.delete(data.id);
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

        await send('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            mobile: true
        });

        await send('Page.enable');
        await new Promise(r => setTimeout(r, 2000));

        // 1. Screenshot màn hình mở đầu mobile
        const ss1 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(rootDir, 'test', 'screenshot_mobile_welcome.png'), Buffer.from(ss1.result.data, 'base64'));
        console.log('✓ Saved test/screenshot_mobile_welcome.png');

        // Bấm Vào Tiệc
        await send('Runtime.evaluate', {
            expression: `
                document.getElementById('btn-enter-party').click();
                const skipBtn = document.getElementById('btn-guide-skip');
                if (skipBtn) skipBtn.click();
            `
        });
        await new Promise(r => setTimeout(r, 2000));

        // 2. Screenshot cảnh 3D và Joystick trên mobile
        const ss2 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(rootDir, 'test', 'screenshot_mobile_game.png'), Buffer.from(ss2.result.data, 'base64'));
        console.log('✓ Saved test/screenshot_mobile_game.png');

        // Kiểm tra xem Joystick có hiển thị trên mobile không
        const joyRes = await send('Runtime.evaluate', {
            expression: `
                const zone = document.getElementById('joystick-zone');
                const style = window.getComputedStyle(zone);
                ({ display: style.display, width: style.width, height: style.height })
            `,
            returnByValue: true
        });
        console.log('✓ Mobile Joystick element computed style:', joyRes.result.result.value);

        ws.close();
    } catch (e) {
        console.error('Mobile test error:', e);
    } finally {
        chromeProc.kill();
        server.close();
        console.log('Mobile test completed!');
    }
});
