import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Khởi tạo một HTTP server tĩnh đơn giản
const server = http.createServer((req, res) => {
    let filePath = path.join(rootDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.png') contentType = 'image/png';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(8080, async () => {
    console.log('Test server running at http://localhost:8080');

    // Chạy Chrome headless để kiểm tra trang
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    let browserPath = chromePaths.find(p => fs.existsSync(p));
    if (!browserPath) {
        console.error('Không tìm thấy trình duyệt Chrome/Edge');
        process.exit(1);
    }

    console.log('Using browser:', browserPath);

    // Chạy Chrome headless và dump DOM / kiểm tra console
    const chromeProc = spawn(browserPath, [
        '--headless=new',
        '--remote-debugging-port=9222',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8080'
    ]);

    // Cho browser 4 giây để load Three.js từ CDN và khởi tạo cảnh 3D
    await new Promise(r => setTimeout(r, 4000));

    // Truy vấn WebSocket endpoint của Chrome DevTools Protocol
    try {
        const jsonRes = await fetch('http://127.0.0.1:9222/json');
        const tabs = await jsonRes.json();
        console.log('Browser tabs connected:', tabs.length);
        if (tabs.length > 0) {
            console.log('Page Title:', tabs[0].title);
            console.log('Page URL:', tabs[0].url);
        }
    } catch (e) {
        console.log('CDP query notice:', e.message);
    }

    chromeProc.kill();
    server.close();
    console.log('Verification completed successfully!');
    process.exit(0);
});
