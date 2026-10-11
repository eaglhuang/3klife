const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const puppeteer = require('puppeteer-core');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'build-templates/web-desktop/index.ejs'), 'utf8');
const css = fs.readFileSync(path.join(root, 'build-templates/web-desktop/style.css'), 'utf8');
const { getFrameSize, installResponsiveFrame } = require('../build-templates/web-desktop/responsive-frame');
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
test('fits the whole 16:9 canvas on initial load and after window resize', async () => {
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
        const expectedWidth = Math.min(width, height * 16 / 9);
        const expectedHeight = Math.min(height, width * 9 / 16);
        assert.ok(Math.abs(rect.width - expectedWidth) < 0.1, `${width}x${height} width`);
        assert.ok(Math.abs(rect.height - expectedHeight) < 0.1, `${width}x${height} height`);
        assert.ok(Math.abs(rect.x - (width - expectedWidth) / 2) < 0.1);
        assert.ok(Math.abs(rect.y - (height - expectedHeight) / 2) < 0.1);
        assert.ok(rect.scrollWidth <= width && rect.scrollHeight <= height, 'No page overflow');
    }
});

test('engine frame follows window resize with letterboxing and an event listener', () => {
    const calls = [];
    const listeners = new Map();
    const engine = { view: { setFrameSize: (width, height) => calls.push([width, height]) } };
    const browserWindow = { innerWidth: 1280, innerHeight: 960,
        addEventListener: (name, fn) => listeners.set(name, fn),
        removeEventListener: (name) => listeners.delete(name) };
    const dispose = installResponsiveFrame(engine, browserWindow);
    assert.deepEqual(calls.pop(), [1280, 720]);
    browserWindow.innerWidth = 2340; browserWindow.innerHeight = 1080;
    listeners.get('resize')();
    assert.deepEqual(calls.pop(), [1920, 1080]);
    browserWindow.innerHeight = 0;
    listeners.get('resize')();
    assert.equal(calls.length, 0);
    dispose();
    assert.equal(listeners.size, 0);
    assert.deepEqual(getFrameSize(800, 600), { width: 800, height: 450 });
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
    assert.deepEqual(calls, [[1280, 720]]);
});
