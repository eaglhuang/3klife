const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const puppeteer = require('puppeteer-core');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'build-templates/web-desktop/index.ejs'), 'utf8');
const css = fs.readFileSync(path.join(root, 'build-templates/web-desktop/style.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build-templates/web-desktop/manifest.webmanifest'), 'utf8'));
const { getFrameSize, readWindowSize, installResponsiveFrame } = require('../build-templates/web-desktop/responsive-frame');
let browser;
let page;
before(async () => {
    const candidates = [process.env.CHROME_PATH, process.env.EDGE_PATH,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
    const executablePath = candidates.find((candidate) => fs.existsSync(candidate));
    assert.ok(executablePath, 'Install Chrome/Edge or set CHROME_PATH');
    browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage();
});
after(async () => { if (browser) await browser.close(); });

test('keeps Cocos build substitutions and avoids fixed preview dimensions', () => {
    assert.ok(template.includes('<%- include(cocosTemplate, {}) %>'));
    assert.ok(template.includes('<%= cssUrl %>'));
    assert.ok(template.includes('<%= projectName %>'));
    assert.doesNotMatch(template, /previewWidth|previewHeight|class="header"|class="footer"/);
});

test('adds web-app metas so a home-screen launch can go fullscreen', () => {
    assert.match(template, /name="apple-mobile-web-app-capable"\s+content="yes"/);
    assert.match(template, /name="mobile-web-app-capable"\s+content="yes"/);
    assert.match(template, /name="apple-mobile-web-app-status-bar-style"\s+content="black-translucent"/);
    assert.match(template, /viewport-fit=cover/);
    assert.match(template, /rel="manifest"\s+href="manifest.webmanifest"/);
    assert.equal(manifest.display, 'fullscreen');
    assert.equal(manifest.orientation, 'landscape');
});

test('fills the window on initial load and after resize, including wider-than-16:9 screens', async () => {
    const html = template.replace('<%= projectName %>', 'Test')
        .replace(/<link[^>]*>/g, '')
        .replace('<%- include(cocosTemplate, {}) %>', '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
        .replace('</head>', `<style>${css}</style></head>`);
    await page.setContent(html);
    for (const [width, height] of [[1920, 1080], [2340, 1080], [1280, 960], [1280, 720], [800, 600]]) {
        await page.setViewport({ width, height });
        const rect = await page.evaluate(() => {
            const r = document.getElementById('GameDiv').getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height,
                scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight };
        });
        assert.ok(Math.abs(rect.width - width) < 0.1, `${width}x${height} width`);
        assert.ok(Math.abs(rect.height - height) < 0.1, `${width}x${height} height`);
        assert.ok(Math.abs(rect.x) < 0.1);
        assert.ok(Math.abs(rect.y) < 0.1);
        assert.ok(rect.scrollWidth <= width && rect.scrollHeight <= height, 'No page overflow');
    }
});

test('engine frame follows the full window size with an event listener', () => {
    const calls = [];
    const listeners = new Map();
    const engine = { view: { setFrameSize: (width, height) => calls.push([width, height]) } };
    const browserWindow = { innerWidth: 1280, innerHeight: 960,
        addEventListener: (name, fn) => listeners.set(name, fn),
        removeEventListener: (name) => listeners.delete(name) };
    const dispose = installResponsiveFrame(engine, browserWindow);
    assert.deepEqual(calls.pop(), [1280, 960]);
    browserWindow.innerWidth = 2340; browserWindow.innerHeight = 1080;
    listeners.get('resize')();
    assert.deepEqual(calls.pop(), [2340, 1080]);
    browserWindow.innerHeight = 0;
    listeners.get('resize')();
    assert.equal(calls.length, 0);
    dispose();
    assert.equal(listeners.size, 0);
    assert.deepEqual(getFrameSize(800, 600), { width: 800, height: 600 });
    assert.deepEqual(readWindowSize({ innerWidth: 2340, innerHeight: 1080, visualViewport: { width: 800, height: 360 } }), { width: 800, height: 360 });
});

test('release bootstrap uses the imported engine without window.cc', async () => {
    const calls = [];
    const engine = { view: { setFrameSize: (width, height) => calls.push([width, height]) },
        Game: { EVENT_GAME_INITED: 'game_inited' },
        game: { on: (event, fn) => { assert.equal(event, 'game_inited'); fn(); } } };
    const browserWindow = { innerWidth: 1280, innerHeight: 960, addEventListener: () => undefined };
    const source = fs.readFileSync(path.join(root, 'build-templates/web-desktop/responsive-frame.js'), 'utf8');
    vm.runInNewContext(source, { window: browserWindow,
        System: { import: (name) => { assert.equal(name, 'cc'); return Promise.resolve(engine); } },
        console: { error: (message) => assert.fail(message) } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, [[1280, 960]]);
});
