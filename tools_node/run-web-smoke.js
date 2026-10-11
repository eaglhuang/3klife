#!/usr/bin/env node
/**
 * run-web-smoke.js — 對建置好的 Web 版跑冒煙測試（不需要 Cocos 編輯器）
 *
 * 流程：開靜態伺服器 → 用 puppeteer-core 開頁面 → 等 Cocos 引擎啟動 →
 *       收集 console / pageerror / 失敗請求 → 截圖 → 輸出 JSON 報告。
 *
 * Unity 對照：像在 WebGL 包上跑 Playmode 冒煙測試，並收集 Player.log 的錯誤。
 *
 * 用法：
 *   node tools_node/run-web-smoke.js
 *   node tools_node/run-web-smoke.js --dir build/web-desktop --out artifacts/web-smoke
 *   node tools_node/run-web-smoke.js --browser "C:/Program Files/Google/Chrome/Application/chrome.exe"
 *   node tools_node/run-web-smoke.js --timeout 60000 --viewport 1920x1080
 *
 * 結束碼：0 通過；1 偵測到錯誤或引擎沒起來；2 環境問題（找不到建置或瀏覽器）
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const browserCaptureCore = require('./lib/browser-capture-core');

const projectRoot = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.bin': 'application/octet-stream',
    '.cconb': 'application/octet-stream',
    '.plist': 'text/xml',
    '.atlas': 'text/plain',
    '.txt': 'text/plain; charset=utf-8',
};

/** 這些 console 訊息屬於已知的無害噪音，不算失敗（需要時再往這裡加，並註明原因） */
const IGNORED_CONSOLE_PATTERNS = [
    /favicon\.ico/i,
];

/**
 * 瀏覽器對失敗的資源請求會另外吐一行不含網址的 console error（"Failed to load resource..."）。
 * 同一件事已由 response / requestfailed 事件帶網址記錄，這裡略過以免重複計數。
 */
const DUPLICATE_RESOURCE_ERROR = /^Failed to load resource/i;

function parseArgs(argv) {
    const values = {};
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
            values[token.slice(2)] = next;
            i++;
        } else {
            values[token.slice(2)] = true;
        }
    }
    return values;
}

function parseViewport(text) {
    const match = /^(\d+)x(\d+)$/.exec(String(text || '1920x1080'));
    return match ? { width: Number(match[1]), height: Number(match[2]) } : { width: 1920, height: 1080 };
}

function resolveBrowser(explicit) {
    const candidates = [
        explicit,
        process.env.CHROME_PATH,
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/opt/pw-browsers/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
    ].filter((candidate) => typeof candidate === 'string' && candidate);
    return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function startStaticServer(rootDir) {
    const resolvedRoot = path.resolve(rootDir);
    const server = http.createServer((req, res) => {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
        const filePath = path.resolve(resolvedRoot, relative);
        // 擋掉路徑跳脫（../）
        if (filePath !== resolvedRoot && !filePath.startsWith(resolvedRoot + path.sep)) {
            res.writeHead(403).end('forbidden');
            return;
        }
        fs.stat(filePath, (statError, stat) => {
            if (statError || !stat.isFile()) {
                res.writeHead(404).end('not found');
                return;
            }
            res.writeHead(200, {
                'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
                'Cache-Control': 'no-store',
            });
            fs.createReadStream(filePath).pipe(res);
        });
    });
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    });
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEngine(page, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let lastState = null;
    while (Date.now() < deadline) {
        lastState = await page.evaluate(() => {
            const cc = window.cc;
            if (!cc || !cc.director || typeof cc.director.getScene !== 'function') {
                return { engine: false };
            }
            const scene = cc.director.getScene();
            return { engine: true, sceneName: scene ? scene.name : null };
        }).catch(() => ({ engine: false }));
        if (lastState.engine && lastState.sceneName) {
            return lastState;
        }
        await delay(500);
    }
    return lastState || { engine: false };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const buildDir = path.resolve(projectRoot, args.dir || 'build/web-desktop');
    const outDir = path.resolve(projectRoot, args.out || 'artifacts/web-smoke');
    const timeoutMs = Number(args.timeout || 45000);
    const settleMs = Number(args.settle || 3000);
    const viewport = parseViewport(args.viewport);

    if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
        console.error(`[web-smoke] 找不到 ${path.join(buildDir, 'index.html')}，請先執行 node tools_node/build-web.js`);
        return 2;
    }
    const browserPath = resolveBrowser(typeof args.browser === 'string' ? args.browser : '');
    if (!browserPath) {
        console.error('[web-smoke] 找不到 Chrome / Edge，請用 --browser 或環境變數 CHROME_PATH 指定');
        return 2;
    }

    fs.mkdirSync(outDir, { recursive: true });
    const { server, port } = await startStaticServer(buildDir);
    const url = `http://127.0.0.1:${port}/`;
    console.log(`[web-smoke] 服務 ${buildDir} → ${url}`);
    console.log(`[web-smoke] 瀏覽器 ${browserPath}`);

    const errors = [];
    const consoleLines = [];
    let browser = null;
    let engineState = { engine: false };

    try {
        browser = await browserCaptureCore.launchBrowser({
            executablePath: browserPath,
            viewport,
            headless: true,
        });
        const page = await browser.newPage();

        page.on('console', (message) => {
            const text = message.text();
            consoleLines.push(`[${message.type()}] ${text}`);
            if (message.type() === 'error'
                && !DUPLICATE_RESOURCE_ERROR.test(text)
                && !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) {
                errors.push({ kind: 'console-error', detail: text });
            }
        });
        page.on('pageerror', (error) => errors.push({ kind: 'page-error', detail: String(error && error.stack || error) }));
        page.on('requestfailed', (request) => {
            const target = request.url();
            if (!IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(target))) {
                errors.push({ kind: 'request-failed', detail: `${target} (${request.failure() && request.failure().errorText})` });
            }
        });
        page.on('response', (response) => {
            if (response.status() >= 400 && !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(response.url()))) {
                errors.push({ kind: 'http-error', detail: `${response.status()} ${response.url()}` });
            }
        });

        await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
        engineState = await waitForEngine(page, timeoutMs);
        if (!engineState.engine) {
            errors.push({ kind: 'engine-not-started', detail: `${timeoutMs}ms 內 window.cc.director 未就緒（release 建置會隱藏 window.cc，請用 debug 建置）` });
        } else {
            // 場景載入後再多等一下，讓資源與非同步初始化的錯誤有機會冒出來
            await delay(settleMs);
            engineState = await waitForEngine(page, 1000);
        }

        const screenshotPath = path.join(outDir, 'boot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`[web-smoke] 截圖 ${screenshotPath}`);

        const report = {
            generatedAt: new Date().toISOString(),
            url,
            buildDir: path.relative(projectRoot, buildDir),
            viewport,
            engineStarted: engineState.engine,
            sceneName: engineState.sceneName || null,
            errorCount: errors.length,
            errors,
            consoleTail: consoleLines.slice(-50),
            screenshot: path.relative(projectRoot, screenshotPath),
        };
        fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

        console.log(`[web-smoke] 引擎=${report.engineStarted ? '已啟動' : '未啟動'}，場景=${report.sceneName || '-'}，錯誤=${errors.length}`);
        errors.slice(0, 10).forEach((error) => console.error(`  - [${error.kind}] ${String(error.detail).slice(0, 300)}`));
        console.log(`[web-smoke] 報告 ${path.join(outDir, 'report.json')}`);

        return errors.length === 0 && report.engineStarted ? 0 : 1;
    } finally {
        if (browser) {
            await browserCaptureCore.closeBrowser(browser).catch(() => undefined);
        }
        server.close();
    }
}

main().then((code) => process.exit(code), (error) => {
    console.error('[web-smoke] 執行失敗：', error && error.stack || error);
    process.exit(2);
});
