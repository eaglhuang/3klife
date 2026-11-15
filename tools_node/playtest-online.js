#!/usr/bin/env node
/**
 * playtest-online.js — 無頭「全新帳號」實玩驗收（線上試玩版或本機建置目錄）
 *
 * 用 puppeteer-core 加本機 Chrome 無頭，每次以 browser.createBrowserContext() 開全新的
 * 瀏覽器情境（無舊 localStorage／快取），依序走完：
 *   1. 開機到 LoginScene → 開始遊戲進 LobbyScene，等載入遮罩消失（記錄耗時）
 *   2. 新玩家開場（Intro → 信 → 命運抽取 → 確認 → 展示 → 教學）
 *   3. 大廳走動小人：點擊，確認對話泡泡出現
 *   4. 轉蛋：切換每個池子一次，確認右欄節點切一輪後沒有疊加
 *   5. 人物介紹：開第一位武將，切每個分頁截圖；「命」分頁檢查血統樹底板 = 主體寬−720 × 主體高
 *   6. 出征打一場戰鬥到結算，回大廳（卡住超過 120 秒記為失敗）
 *
 * 每一步記錄：耗時、截圖、這一步期間的 console error 與 pageerror。
 * pageerror（未捕捉例外）視為該步失敗；console error 只記錄、不單獨判失敗。
 * 本工具不改遊戲程式；發現的問題只寫進報告。
 *
 * 用法：
 *   node tools_node/playtest-online.js
 *   node tools_node/playtest-online.js --url https://eaglhuang.github.io/3klife-play/
 *   node tools_node/playtest-online.js --dir build/web-desktop --viewport 1920x1475
 *   node tools_node/playtest-online.js --out artifacts/playtest-online/run1 --browser "C:/Program Files/Google/Chrome/Application/chrome.exe"
 *
 * 參數：
 *   --url       線上試玩網址（預設 https://eaglhuang.github.io/3klife-play/）
 *   --dir       本機建置目錄（給了就忽略 --url，自起本機靜態伺服器）
 *   --out       輸出目錄（預設 artifacts/playtest-online/<時間戳>；截圖與 report.json 寫這裡）
 *   --viewport  視窗尺寸 WxH（預設 1920x1080；可用 1920x1475 這類高視窗）
 *   --browser   Chrome 路徑（也可用環境變數 CHROME_PATH）
 *   --stuck     單步卡住上限毫秒數（預設 120000）
 *
 * puppeteer-core 從本 repo 的 node_modules 找；在 git worktree 內會自動改找主目錄的 node_modules，
 * 也可用環境變數 PLAYTEST_NODE_MODULES 指定。
 *
 * 結束碼：0 全部通過；1 有步驟失敗；2 環境問題（找不到 puppeteer／Chrome／建置目錄）
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const DEFAULT_URL = 'https://eaglhuang.github.io/3klife-play/';
const DEFAULT_VIEWPORT = '1920x1080';
const DEFAULT_STUCK_MS = 120000;
const BATTLE_LIMIT_MS = 120000;

/** 已知無害的 console 噪音（與 run-web-smoke.js 一致） */
const IGNORED_CONSOLE_PATTERNS = [/favicon\.ico/i];
/** 瀏覽器對失敗資源另吐的無網址 console error，已由 response／requestfailed 帶網址記錄，略過避免重複 */
const DUPLICATE_RESOURCE_ERROR = /^Failed to load resource/i;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.ttf': 'font/ttf', '.woff': 'font/woff',
    '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.cconb': 'application/octet-stream',
    '.plist': 'text/xml', '.atlas': 'text/plain', '.txt': 'text/plain; charset=utf-8',
};

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
    const match = /^(\d+)x(\d+)$/i.exec(String(text || DEFAULT_VIEWPORT));
    if (!match) throw new Error(`--viewport 格式應為 WxH，例如 1920x1080（收到 ${text}）`);
    return { width: Number(match[1]), height: Number(match[2]) };
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadPuppeteer() {
    const candidates = [];
    if (process.env.PLAYTEST_NODE_MODULES) candidates.push(process.env.PLAYTEST_NODE_MODULES);
    candidates.push(projectRoot);
    try {
        // git worktree 沒有自己的 node_modules：改用主目錄（git common dir 的上一層）
        const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        candidates.push(path.resolve(projectRoot, common, '..'));
    } catch (_) { /* 不是 git 目錄，忽略 */ }
    for (const base of candidates) {
        try {
            return require(require.resolve('puppeteer-core', { paths: [base] }));
        } catch (_) { /* 換下一個 */ }
    }
    throw new Error('找不到 puppeteer-core（已找 ' + candidates.join(', ') + '），請確認主目錄 node_modules 或設定 PLAYTEST_NODE_MODULES');
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

/**
 * 頁面內輔助函式（以 window.__pt 掛載一次）。
 * 節點以 Cocos 場景樹走訪；按鈕用 cc.Button 元件判斷，點擊方式與 web-lifecycle-flow.js 相同：node.emit('click', button)。
 */
function installPageHelpers() {
    const scene = () => (window.cc && window.cc.director ? window.cc.director.getScene() : null);
    const walk = (root, visit) => {
        if (!root) return;
        const stack = [root];
        while (stack.length) {
            const node = stack.pop();
            visit(node);
            for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
        }
    };
    const matches = (name, re) => new RegExp(re, 'i').test(name);
    const button = (node) => node.getComponent('cc.Button');
    const findNode = (re, root, predicate) => {
        let hit = null;
        walk(root || scene(), (node) => {
            if (hit || !node.activeInHierarchy || !matches(node.name, re)) return;
            if (!predicate || predicate(node)) hit = node;
        });
        return hit;
    };
    const findButton = (re, root) => findNode(re, root, (node) => {
        const b = button(node);
        return Boolean(b && b.interactable);
    });
    const pt = {
        sceneName: () => (scene() ? scene().name : null),
        hasButton: (re) => Boolean(findButton(re)),
        /** 診斷用：名稱含 Btn/Button/Return/Back 的作用中節點，附是否有 Button 元件與 interactable */
        dumpBtnLike: () => {
            const out = [];
            walk(scene(), (node) => {
                if (!node.activeInHierarchy || !/Btn|Button|Return|Back|Close/i.test(node.name)) return;
                const b = button(node);
                out.push(node.name + (b ? (b.interactable ? "" : "(disabled)") : "(noButton)"));
            });
            return Array.from(new Set(out)).slice(0, 60);
        },
        listButtons: () => {
            const out = [];
            walk(scene(), (node) => {
                if (node.activeInHierarchy && button(node) && button(node).interactable) out.push(node.name);
            });
            return Array.from(new Set(out)).slice(0, 80);
        },
        clickButton: (re) => {
            const node = findButton(re);
            if (!node) return null;
            node.emit('click', button(node));
            return node.name;
        },
        tapNode: (re) => {
            const node = findNode(re);
            if (!node) return null;
            node.emit(window.cc.Node.EventType.TOUCH_END);
            return node.name;
        },
        activeNodeNames: (re) => {
            const out = [];
            walk(scene(), (node) => {
                if (node.activeInHierarchy && matches(node.name, re)) out.push(node.name);
            });
            return out;
        },
        /** 指定 re 的第一個節點（不需可按）的 contentSize，沒有 UITransform 回傳 null */
        sizeOf: (re) => {
            const node = findNode(re);
            if (!node) return null;
            const t = node.getComponent('cc.UITransform');
            return { name: node.name, width: t ? t.contentSize.width : null, height: t ? t.contentSize.height : null };
        },
        /** 以 root（可省略）為根，統計所有 active 節點名稱出現次數 */
        nameCounts: (re) => {
            const root = re ? findNode(re) : scene();
            const counts = {};
            walk(root, (node) => {
                if (node.activeInHierarchy) counts[node.name] = (counts[node.name] || 0) + 1;
            });
            return counts;
        },
        /** 找到符合 re 的 active 節點，且其父鏈中（不含自己）最近的名稱符合 parentRe 的那個節點 */
        findNodeName: (re) => {
            const node = findNode(re);
            return node ? node.name : null;
        },
        scenePresence: (re) => Boolean(findNode(re)),
        /** 名稱符合 re 的可按按鈕及其底下第一個 Label 文字（子選單按鈕名稱相同時用文字分辨） */
        buttonTexts: (re) => {
            const out = [];
            walk(scene(), (node) => {
                if (!node.activeInHierarchy || !matches(node.name, re)) return;
                const b = button(node);
                if (!b || !b.interactable) return;
                let text = null;
                walk(node, (n) => { if (text === null) { const l = n.getComponent('cc.Label'); if (l && l.string) text = String(l.string); } });
                out.push({ name: node.name, text });
            });
            return out;
        },
        /** 點名稱符合 nameRe、且文字符合 textRe 的第一顆按鈕 */
        clickByText: (nameRe, textRe) => {
            let hit = null;
            walk(scene(), (node) => {
                if (hit || !node.activeInHierarchy || !matches(node.name, nameRe)) return;
                const b = button(node);
                if (!b || !b.interactable) return;
                let text = '';
                walk(node, (n) => { const l = n.getComponent('cc.Label'); if (l && l.string) text += l.string; });
                if (new RegExp(textRe).test(text)) hit = { node, text };
            });
            if (!hit) return null;
            hit.node.emit('click', button(hit.node));
            return hit.text;
        },
        /** 目前畫面上 active 的 Label 文字中符合 re 的（用來讀載入進度與錯誤提示） */
        textsMatching: (re) => {
            const out = [];
            walk(scene(), (node) => {
                if (!node.activeInHierarchy) return;
                const label = node.getComponent('cc.Label');
                if (label && label.string && new RegExp(re).test(label.string)) out.push(label.string);
            });
            return out;
        },
        emitLoginStart: () => {
            const comp = (function find(node) {
                const c = node.getComponent('LoginScene');
                if (c) return c;
                for (const child of node.children) {
                    const hit = find(child);
                    if (hit) return hit;
                }
                return null;
            })(scene());
            if (!comp || typeof comp.onClickStart !== 'function') return false;
            comp.onClickStart();
            return true;
        },
    };
    window.__pt = pt;
}

/** 收集整次執行的 console／pageerror，供各步切片 */
function createCollector() {
    const entries = [];
    return {
        entries,
        push(kind, detail) { entries.push({ kind, detail: String(detail).slice(0, 1200), at: Date.now() }); },
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const viewport = parseViewport(args.viewport);
    const stuckMs = Number(args.stuck || DEFAULT_STUCK_MS);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const outDir = path.resolve(projectRoot, typeof args.out === 'string' ? args.out : path.join('artifacts', 'playtest-online', stamp));

    let staticServer = null;
    let target;
    if (args.dir) {
        const buildDir = path.resolve(projectRoot, String(args.dir));
        if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
            console.error(`[playtest] 找不到 ${path.join(buildDir, 'index.html')}，請先執行 node tools_node/build-web.js`);
            return 2;
        }
        staticServer = await startStaticServer(buildDir);
        target = `http://127.0.0.1:${staticServer.port}/`;
    } else {
        target = typeof args.url === 'string' ? args.url : DEFAULT_URL;
    }

    let puppeteer;
    try {
        puppeteer = loadPuppeteer();
    } catch (error) {
        console.error(`[playtest] ${error.message}`);
        if (staticServer) staticServer.server.close();
        return 2;
    }
    const browserPath = resolveBrowser(typeof args.browser === 'string' ? args.browser : '');
    if (!browserPath) {
        console.error('[playtest] 找不到 Chrome / Edge，請用 --browser 或環境變數 CHROME_PATH 指定');
        if (staticServer) staticServer.server.close();
        return 2;
    }

    fs.mkdirSync(outDir, { recursive: true });
    console.log(`[playtest] 目標 ${target}`);
    console.log(`[playtest] 視窗 ${viewport.width}x${viewport.height}，輸出 ${outDir}`);

    const collector = createCollector();
    const report = {
        tool: 'tools_node/playtest-online.js',
        startedAt: new Date().toISOString(),
        target,
        viewport,
        browser: browserPath,
        steps: [],
        passed: false,
    };
    let browser = null;
    let context = null;
    let page = null;
    let stepIndex = 0;
    let exitCode = 1;
    let reachedLobby = false;

    const emitStep = (rec) => {
        const status = rec.skipped ? 'SKIP' : rec.ok ? 'PASS' : 'FAIL';
        console.log(`[playtest] ${String(rec.index).padStart(2, '0')} ${status} ${rec.name} (${rec.durationMs}ms)${rec.reason ? ' — ' + rec.reason : ''}`);
    };

    /**
     * 執行一步：記錄耗時、截圖、期間的 console error／pageerror。
     * fn 回傳 detail 物件（併入報告）；丟錯即失敗。
     */
    async function step(name, fn, { skipIfFailed = false } = {}) {
        stepIndex += 1;
        const rec = { index: stepIndex, name, ok: false, durationMs: 0, screenshot: null, reason: null, detail: {}, console: [], pageErrors: [] };
        if (skipIfFailed && !reachedLobby) {
            rec.reason = '前置步驟失敗，略過';
            rec.skipped = true;
            report.steps.push(rec);
            emitStep(rec);
            return false;
        }
        const from = collector.entries.length;
        const t0 = Date.now();
        try {
            const detail = await fn(rec);
            if (detail) Object.assign(rec.detail, detail);
            rec.ok = true;
        } catch (error) {
            rec.ok = false;
            rec.reason = String((error && error.message) || error).split('\n')[0];
        }
        rec.durationMs = Date.now() - t0;
        const slice = collector.entries.slice(from);
        rec.pageErrors = slice.filter((e) => e.kind === 'pageerror').map((e) => e.detail);
        rec.console = slice.filter((e) => e.kind === 'console-error' || e.kind === 'request-failed' || e.kind === 'http-error').map((e) => `${e.kind}: ${e.detail}`);
        if (rec.pageErrors.length && rec.ok) {
            rec.ok = false;
            rec.reason = `期間有 pageerror（${rec.pageErrors.length} 筆）`;
        }
        if (page) {
            const file = path.join(outDir, `${String(stepIndex).padStart(2, '0')}-${name.replace(/[^\w-]+/g, '_')}.png`);
            try {
                await page.screenshot({ path: file });
                rec.screenshot = path.relative(projectRoot, file).replace(/\\/g, '/');
            } catch (_) { /* 截圖失敗不影響判定 */ }
        }
        report.steps.push(rec);
        emitStep(rec);
        return rec.ok;
    }

    /** 每 300ms 輪詢 predicate，直到 true 或超時 */
    async function waitUntil(predicate, timeoutMs, label) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await delay(300);
        }
        throw new Error(`逾時 ${Math.round(timeoutMs / 1000)} 秒：${label}`);
    }

    const scene = () => page.evaluate(() => window.__pt.sceneName());
    const clickButton = (re) => page.evaluate((r) => window.__pt.clickButton(r), re);
    const listButtons = () => page.evaluate(() => window.__pt.listButtons());
    /** 把殘留的面板關掉，直到大廳底欄（BtnCatShop）回來；回傳是否成功 */
    const backToLobbyBar = async () => {
        const closers = '^(CharacterDs3Main_button_3|OpeningOfferDecline|GachaReturnToLobby|BtnBack|BtnScoutCancel|BtnNextTutorial|BtnClose\\w*)$';
        for (let i = 0; i < 12; i++) {
            const hit = await clickButton(closers);
            if (!hit) break;
            await delay(1500);
        }
        return page.evaluate(() => window.__pt.hasButton('^BtnCatShop$'));
    };
    /** 大廳底欄分類 → 子選單文字（BtnSub0..4 名稱相同，只能靠文字分辨）。回傳點到的文字或 null */
    const openSub = async (cat, textRe) => {
        if (!(await clickButton('^' + cat + '$'))) return null;
        await delay(1200);
        return page.evaluate((re) => window.__pt.clickByText('^BtnSub', re), textRe);
    };

    try {
        browser = await puppeteer.launch({
            executablePath: browserPath,
            headless: true,
            defaultViewport: viewport,
            args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--disable-http-cache', '--allow-file-access-from-files'],
        });
        // 每次執行都是全新情境：沒有舊的 localStorage／IndexedDB／快取，等同新玩家
        context = await browser.createBrowserContext();
        page = await context.newPage();
        await page.setViewport(viewport);
        page.on('console', (message) => {
            const text = message.text();
            if (message.type() !== 'error') return;
            if (DUPLICATE_RESOURCE_ERROR.test(text) || IGNORED_CONSOLE_PATTERNS.some((p) => p.test(text))) return;
            collector.push('console-error', text);
        });
        page.on('pageerror', (error) => collector.push('pageerror', (error && error.stack) || error));
        page.on('requestfailed', (request) => {
            if (IGNORED_CONSOLE_PATTERNS.some((p) => p.test(request.url()))) return;
            collector.push('request-failed', `${request.url()} (${request.failure() && request.failure().errorText})`);
        });
        page.on('response', (response) => {
            if (response.status() >= 400 && !IGNORED_CONSOLE_PATTERNS.some((p) => p.test(response.url()))) {
                collector.push('http-error', `${response.status()} ${response.url()}`);
            }
        });

        // ── 1. 開機 → LoginScene → 開始遊戲 → LobbyScene，等載入遮罩消失 ──
        const bootOk = await step('boot-login-lobby', async (rec) => {
            const bootT0 = Date.now();
            await page.goto(target, { waitUntil: 'load', timeout: stuckMs });
            await waitUntil(() => page.evaluate(() => Boolean(window.cc && window.cc.director && window.cc.director.getScene())), stuckMs, '引擎未就緒');
            await page.evaluate(installPageHelpers);
            await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, '未進入 LoginScene');
            // 進 LoginScene 後等待再點開始（預設 12 秒：實測 LoginScene 出現後約 1 秒內點開始會觸發開機 pageerror，見 bug 卡；--login-settle 1000 可重現）
            await delay(Number(args.loginSettle || 12000));
            rec.detail.bootToLoginMs = Date.now() - bootT0;

            const startT0 = Date.now();
            const clicked = await clickButton('^BtnStart$');
            let startMethod = clicked ? 'BtnStart' : null;
            if (!startMethod) {
                const ok = await page.evaluate(() => window.__pt.emitLoginStart());
                if (!ok) throw new Error('LoginScene 找不到 BtnStart 也找不到 onClickStart');
                startMethod = 'LoginScene.onClickStart';
            }
            rec.detail.startMethod = startMethod;
            await waitUntil(async () => (await scene()) === 'LobbyScene', stuckMs, '點開始後未進入 LobbyScene');
            reachedLobby = true;
            // 載入遮罩以畫面文字判斷：「正在準備大廳…」進度列，或「啟動遇到問題」錯誤提示（後者代表玩家卡在這裡）
            await delay(1500);
            const LOADING_RE = '正在準備|載入中|Loading';
            const TROUBLE_RE = '啟動遇到問題';
            let troubleSeen = false;
            await waitUntil(async () => {
                const loading = await page.evaluate((re) => window.__pt.textsMatching(re), LOADING_RE);
                const trouble = await page.evaluate((re) => window.__pt.textsMatching(re), TROUBLE_RE);
                if (trouble.length) troubleSeen = true;
                if (loading.length === 0 && trouble.length === 0) return true;
                rec.detail.lastLoadingTexts = loading.concat(trouble).slice(0, 4);
                return false;
            }, stuckMs, '大廳仍停在載入／啟動錯誤畫面');
            rec.detail.troubleSeen = troubleSeen;
            rec.detail.lobbyReadyMs = Date.now() - startT0;
            rec.detail.lobbyScene = await scene();
            return rec.detail;
        });
        // 第一步失敗（進不了大廳）時，後續步驟全部略過；其餘情況各步獨立判定
        const requireLobby = async () => {
            if ((await scene()) !== 'LobbyScene') throw new Error('目前不在 LobbyScene（前一步未進大廳）');
        };

        // ── 2. 新玩家開場 ──
        const openingSeq = ['BtnIntroNext', 'BtnCloseOpeningLetter', 'BtnDestinyRoll', 'BtnDestinyConfirm', 'BtnFrame0', 'BtnShowcaseNext', 'BtnNextTutorial'];
        await step('new-player-opening', async (rec) => {
            // 依規格順序點；BtnIntroNext 是多頁「繼續」（實測 IntroStep 1/4…），可重複點直到消失。
            // 若目前可按的是後面的步驟（實際順序與規格不同），就先點它並記在 outOfOrder，不當成失敗。
            const clicked = [];
            const outOfOrder = [];
            const done = new Set();
            const REPEATABLE = ['BtnIntroNext', 'BtnShowcaseNext', 'BtnNextTutorial']; // 多頁「繼續」鈕，可重複點直到消失
            const retries = {};
            const deadline = Date.now() + stuckMs;
            let idleSince = null;
            let missing = [];
            while (true) {
                const visible = await listButtons();
                const pending = openingSeq.filter((n) => !done.has(n) || REPEATABLE.includes(n));
                const hasIntro = visible.some((n) => REPEATABLE.includes(n));
                const candidates = pending.filter((n) => visible.includes(n));
                if (!candidates.length) {
                    if (done.size === openingSeq.length && !hasIntro) break;
                    // 連續 45 秒沒有任何規格中的按鈕可按，視為開場結束；沒出現的步驟記為缺漏（不默默略過）
                    if (idleSince === null) idleSince = Date.now();
                    // 規格外但實際出現的收尾按鈕（抽卡結果的關閉）：先點它，並記入 extraClicked
                    const extra = visible.find((n) => /^GachaPullResult_(close|back)$/i.test(n));
                    if (extra && await clickButton('^' + extra + '$')) {
                        (rec.detail.extraClicked = rec.detail.extraClicked || []).push(extra);
                        idleSince = null;
                        await delay(1500);
                        continue;
                    }
                    // 亮相／過場等沒有按鈕、靠點畫面推進的畫面：閒置超過 5 秒就像玩家一樣點視窗中央
                    if (Date.now() - idleSince > 5000) {
                        await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
                        rec.detail.screenTaps = (rec.detail.screenTaps || 0) + 1;
                    }
                    if (Date.now() - idleSince > 45000) {
                        missing = openingSeq.filter((n) => !done.has(n) && !REPEATABLE.includes(n));
                        break;
                    }
                    if (Date.now() > deadline) throw new Error(`開場超時（超過 ${Math.round(stuckMs / 1000)} 秒）；已完成 ${[...done].join('、') || '無'}`);
                    retries.wait = (retries.wait || 0) + 1;
                    await delay(3000); // 轉場中，等 3 秒重試
                    continue;
                }
                idleSince = null;
                const name = candidates[0];
                const expected = openingSeq.find((n) => !done.has(n));
                if (!REPEATABLE.includes(name) && name !== expected) outOfOrder.push(`規格順序為 ${expected}，實際先出現 ${name}`);
                const hit = await clickButton(`^${name}$`);
                if (hit) {
                    clicked.push(hit);
                    done.add(name);
                    await delay(1200);
                }
                if (Date.now() > deadline) throw new Error(`開場超時（超過 ${Math.round(stuckMs / 1000)} 秒）；已完成 ${[...done].join('、')}`);
            }
            rec.detail.clicked = clicked;
            rec.detail.outOfOrder = Array.from(new Set(outOfOrder));
            rec.detail.retries = retries;
            rec.detail.clickedCount = clicked.length;
            if (missing.length) {
                rec.detail.missing = missing;
                throw new Error(`開場按鈕未依規格出現：缺 ${missing.join('、')}（已點 ${[...done].join('、')}；畫面按鈕 ${(await listButtons()).join('、') || '無'}）`);
            }
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 2b. 大廳選單盤點：逐一點底欄分類，記錄每個分類展開後可按的按鈕（供後續步驟對名稱，不影響通過與否）──
        await step('lobby-menu-map', async (rec) => {
            await requireLobby();
            const map = {};
            for (const cat of ['BtnCatShop', 'BtnCatGenerals', 'BtnCatSortie', 'BtnCatDomestic', 'BtnCatNurture']) {
                if (!(await clickButton('^' + cat + '$'))) { map[cat] = null; continue; }
                await delay(1500);
                map[cat] = await page.evaluate(() => window.__pt.buttonTexts('^BtnSub'));
            }
            rec.detail.menuMap = map;
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 3. 大廳走動小人：點擊 → 對話泡泡 ──
        await step('lobby-walker-bubble', async (rec) => {
            await requireLobby();
            const crowdRe = '^crowd-.*';
            // 泡泡是 UCUF 既有節點 lobby-hall-screen.bubble，平常 active=false，點到在場武將才開
            const bubbleRe = '(^|\\.)bubble$';
            rec.detail.bubbleBefore = await page.evaluate((re) => window.__pt.activeNodeNames(re), bubbleRe);
            const activeBefore = new Set(await page.evaluate(() => window.__pt.activeNodeNames('.*')));
            const walker = await waitUntil(() => page.evaluate((re) => window.__pt.findNodeName(re), crowdRe), 30000, '找不到走動小人（crowd-*）');
            rec.detail.walker = walker;
            const tapped = await page.evaluate((re) => window.__pt.tapNode(re), crowdRe);
            if (!tapped) throw new Error('點擊小人失敗');
            const bubbles = await waitUntil(async () => {
                const now = await page.evaluate((re) => window.__pt.activeNodeNames(re), bubbleRe);
                if (now.length) return now;
                // cc 節點名可能不含 bubble：改看點擊後新變 active 的節點（名稱含對話相關字樣者）
                const added = (await page.evaluate(() => window.__pt.activeNodeNames('.*'))).filter((n) => !activeBefore.has(n));
                rec.detail.newlyActive = Array.from(new Set(added)).slice(0, 30);
                const hit = added.filter((n) => /bubble|dialog|speech|chat|talk|line|text/i.test(n));
                return hit.length ? hit : null;
            }, 5000, '點小人後 lobby-hall-screen.bubble 沒有變為 active').catch(async (e) => {
                const all = await page.evaluate(() => Object.keys(window.__pt.nameCounts('ubble|Dialog|Speech')));
                const crowd = await page.evaluate(() => window.__pt.nameCounts('^crowd-'));
                throw new Error(`${e.message}（名稱含 bubble/dialog 的節點：${all.join(', ') || '無'}；crowd 節點：${Object.keys(crowd).join(', ') || '無'}）`);
            });
            rec.detail.bubbleNodes = Array.from(new Set(bubbles));
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 5. 人物介紹：第一位武將 → 每個分頁截圖 → 「命」分頁檢查血統樹 ──
        await step('character-intro-tabs', async (rec) => {
            // 關掉轉蛋等面板回到大廳主畫面，再開武將名冊
            await backToLobbyBar();
            await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatGenerals$')), 30000, `回大廳後沒有底欄按鈕（場景 ${await scene()}；節點 ${(await page.evaluate(() => window.__pt.dumpBtnLike())).join(', ')}）`);
            rec.detail.rosterEntry = '底欄「武將」→「武將名冊」';
            if (!(await openSub('BtnCatGenerals', '武將名冊'))) throw new Error(`找不到「武將 → 武將名冊」入口（可按按鈕：${(await listButtons()).join(', ')}）`);
            await delay(2500);
            rec.detail.buttonsAfterOpen = await listButtons();
            const firstCard = await waitUntil(() => page.evaluate(() => window.__pt.listButtons()).then((list) => list.find((n) => n === 'Row') || list.find((n) => /^(BtnGeneral\d*|BtnGeneralCard\d*|GeneralCard\d*|BtnCard0|BtnHero0)$/i.test(n)) || null), 30000, '名冊中找不到第一位武將');
            rec.detail.firstCard = firstCard;
            await clickButton(`^${firstCard}$`);
            await waitUntil(() => page.evaluate(() => window.__pt.scenePresence('CharacterDs3|character-ds3')), 30000, '人物介紹畫面未出現');
            await delay(1200);

            // 右側分頁鈕節點名不固定，改用鈕上文字首字（將／屬／命／技／寶／兵）辨認
            const tabEntries = (await page.evaluate(() => window.__pt.buttonTexts('.*'))).filter((t) => t.text && /^[將屬命技寶兵]/.test(t.text.trim()));
            const tabNames = Array.from(new Set(tabEntries.map((t) => t.text.trim().charAt(0))));
            rec.detail.tabs = tabNames;
            const shots = [];
            let bloodlineChecked = null;
            if (!tabNames.length) throw new Error(`人物介紹畫面找不到分頁按鈕（可按按鈕：${(await listButtons()).join(', ')}）`);
            for (const tab of tabNames) {
                await page.evaluate((t) => window.__pt.clickByText('.*', '^\s*' + t), tab);
                await delay(1000);
                const file = path.join(outDir, `${String(stepIndex).padStart(2, '0')}-tab-${tabNames.indexOf(tab) + 1}.png`);
                await page.screenshot({ path: file });
                shots.push(path.relative(projectRoot, file).replace(/\\/g, '/'));
                if (tab === '命') {
                    bloodlineChecked = await checkBloodlineBounds(page, viewport);
                }
            }
            rec.detail.screenshots = shots;
            rec.detail.bloodline = bloodlineChecked;
            rec.detail.buttonTexts = await page.evaluate(() => window.__pt.buttonTexts('^(CharacterDs3Main|btn)'));
            if (bloodlineChecked && !bloodlineChecked.ok) throw new Error(`血統樹範圍不符：${bloodlineChecked.reason}`);
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 6. 出征打一場戰鬥到結算，回大廳 ──
        await step('battle-to-settlement', async (rec) => {
            // 回到大廳
            for (let i = 0; i < 6 && (await scene()) !== 'LobbyScene'; i++) {
                await clickButton('^(GachaReturnToLobby|BtnBack|BtnClose|BtnCloseSortie)$');
                await delay(1200);
            }
            await requireLobby();
            await backToLobbyBar();
            await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatSortie$')), 30000, `回大廳後沒有底欄按鈕（場景 ${await scene()}；節點 ${(await page.evaluate(() => window.__pt.dumpBtnLike())).join(', ')}）`);
            if (!(await openSub('BtnCatSortie', '戰場'))) throw new Error(`大廳找不到「出征 → 戰場」入口（可按按鈕：${(await listButtons()).join(', ')}）`);
            await delay(2500);
            rec.detail.buttonsAfterOpen = await listButtons();
            const battleT0 = Date.now();
            const deployRe = '^(BtnSortie|BtnStartBattle|BtnDeploy|BtnConfirmDeploy|BtnConfirmSortie|BtnStart|BtnGo|BtnNextDispatchGeneral|BtnScoutSortie)$';
            // 出征面板：依序點可按的出征確認鈕，直到進入 BattleScene（每 2 秒一次，總時限 120 秒）
            await waitUntil(async () => {
                if ((await scene()) === 'BattleScene') return true;
                await page.evaluate((re) => window.__pt.clickButton(re), deployRe);
                // 兵勢凶險時會再跳「強行出征」確認框
                await page.evaluate(() => window.__pt.clickByText('.*', '^\\s*強行出征\\s*$'));
                await delay(2000);
                return false;
            }, BATTLE_LIMIT_MS, `出征面板無法進入戰場（可按按鈕：${(await listButtons()).join(', ')}）`);
            rec.detail.toBattleMs = Date.now() - battleT0;

            // 加速（若有）；自動戰鬥若預設已開就不重複點
            await delay(1500);
            await clickButton('^BtnFastForward$');
            // 首戰教學框：收起；再把第一張兵卡拖到我方底線第 3 路（座標以 1920x1080 截圖比例換算）
            await page.evaluate(() => window.__pt.clickByText('.*', '^\\s*收起\\s*$'));
            await delay(800);
            const vp = page.viewport();
            const sx = vp.width * (120 / 1920), sy = vp.height * (285 / 1080);
            const ex = vp.width * (570 / 1920), ey = vp.height * (760 / 1080);
            await page.mouse.move(sx, sy);
            await page.mouse.down();
            await page.mouse.move((sx + ex) / 2, (sy + ey) / 2, { steps: 12 });
            await page.mouse.move(ex, ey, { steps: 12 });
            await page.mouse.up();
            await delay(1000);
            // 等結算：BattleReview 出現，或場景自動回大廳
            // 回合數有在前進就不算卡住；停滯超過 BATTLE_LIMIT_MS 或總時間超過 6 分鐘才判失敗
            let settled = null;
            let lastRound = -1;
            let lastProgressAt = Date.now();
            const hardDeadline = Date.now() + 360000;
            while (!settled) {
                if ((await scene()) === 'LobbyScene') { settled = 'auto-lobby'; break; }
                if (await page.evaluate(() => window.__pt.scenePresence('BattleReview'))) { settled = 'review'; break; }
                if ((await page.evaluate(() => window.__pt.textsMatching('^(勝利|失敗|戰敗|平手)$'))).length) { settled = 'review'; break; }
                const roundTexts = await page.evaluate(() => window.__pt.textsMatching('^第\\s*\\d+\\s*回合$'));
                const round = roundTexts.length ? Number(String(roundTexts[0]).replace(/\D/g, '')) : -1;
                if (round !== lastRound) { lastRound = round; lastProgressAt = Date.now(); }
                rec.detail.lastRound = lastRound;
                // 首戰教學戰打不死（回合持續推進仍無勝負）：超過 20 回合改按右上「退」結束教學，記錄為 retreat
                if (lastRound >= 20) {
                    rec.detail.retreatedAtRound = rec.detail.retreatedAtRound || lastRound;
                    await page.evaluate(() => window.__pt.clickByText('.*', '^\s*退\s*$'));
                    await page.evaluate(() => window.__pt.clickByText('.*', '^\s*(確認|確定|是|撤退|結束教學)\s*$'));
                }
                await page.evaluate(() => window.__pt.clickButton('^BtnAuto$'));
                await page.evaluate(() => window.__pt.clickButton('^(BtnEndTurn|btnEndTurn|EndTurnBtn)$'));
                if (Date.now() - lastProgressAt > BATTLE_LIMIT_MS) throw new Error(`戰鬥卡住：第 ${lastRound} 回合起超過 ${Math.round(BATTLE_LIMIT_MS / 1000)} 秒沒有推進（可按按鈕：${(await listButtons()).join(', ')}）`);
                if (Date.now() > hardDeadline) throw new Error(`戰鬥 6 分鐘內未結算（停在第 ${lastRound} 回合；回合仍在推進，疑似戰鬥變長）`);
                await delay(1000);
            }
            rec.detail.settledBy = settled;
            rec.detail.battleMs = Date.now() - battleT0;
            if (settled === 'review') {
                await waitUntil(async () => {
                    if ((await scene()) === 'LobbyScene') return true;
                    const hit = (await page.evaluate(() => window.__pt.clickByText('.*', '返回大廳'))) || await clickButton('^(BtnBattleReviewClose|BtnReturnLobby|BtnBackLobby|BtnReturn|BtnContinue|BtnConfirm|BtnNext|BtnClose|BtnFinish|BtnBack)$');
                    if (!hit) await delay(1000);
                    return false;
                }, 60000, `結算後無法回大廳（可按按鈕：${(await listButtons()).join(', ')}）`);
            }
            await requireLobby();
            rec.detail.returnedToLobby = true;
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 6b. 轉蛋（排最後：返回大廳後底欄是否還在，本身就是檢查項）：切每個池子一次，切一輪後右欄節點不疊加 ──
        await step('gacha-pools', async (rec) => {
            await requireLobby();
            // 戰鬥返回後可能彈出開場禮包，先婉拒才不擋底欄
            await backToLobbyBar();
            rec.detail.entry = '底欄「商店」→「轉蛋」';
            const hit = await openSub('BtnCatShop', '轉蛋');
            if (!hit) throw new Error('大廳找不到「商店 → 轉蛋」入口');
            await delay(2500);
            rec.detail.buttonsAfterOpen = await listButtons();
            if (!(await page.evaluate(() => window.__pt.hasButton('^BtnPoolNext$')))) throw new Error(`轉蛋畫面沒有 BtnPoolNext（場景 ${await scene()}；可按按鈕：${rec.detail.buttonsAfterOpen.join(', ')}）`);
            const rightRe = '(Right|Column|Detail|Info).*';
            const baseline = await page.evaluate((re) => window.__pt.nameCounts(re), rightRe);
            rec.detail.rightRootFound = Object.keys(baseline).length > 0;
            const poolCount = 4;
            const switched = [];
            for (let i = 0; i < poolCount; i++) {
                await clickButton('^BtnPoolNext$');
                await delay(1500);
                const shot = path.join(outDir, `${String(stepIndex).padStart(2, '0')}-gacha-pool-${i + 1}.png`);
                await page.screenshot({ path: shot });
                switched.push(path.relative(projectRoot, shot).replace(/\\/g, '/'));
            }
            const after = await page.evaluate((re) => window.__pt.nameCounts(re), rightRe);
            const stacked = Object.keys(after).filter((name) => after[name] > (baseline[name] || 0));
            rec.detail.screenshots = switched;
            if (stacked.length) throw new Error(`切換池子一輪後右欄節點疊加：${stacked.slice(0, 8).join(', ')}`);
            await clickButton('^GachaReturnToLobby$');
            const barBack = await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatShop$')), 15000, '').catch(() => false);
            rec.detail.lobbyBarAfterReturn = Boolean(barBack);
            if (!barBack) throw new Error(`轉蛋按「返回大廳」後底欄按鈕（BtnCat*）全部消失，畫面看似大廳但節點不在（場景 ${await scene()}；Btn 類節點 ${(await page.evaluate(() => window.__pt.dumpBtnLike())).join(', ')}）`);
            return rec.detail;
        }, { skipIfFailed: true });

        report.finishedAt = new Date().toISOString();
    } catch (error) {
        report.fatal = String((error && error.stack) || error);
        console.error(`[playtest] 致命錯誤：${report.fatal}`);
    } finally {
        report.passed = report.steps.length > 0 && report.steps.every((s) => s.ok) && !report.fatal;
        report.consoleErrors = collector.entries.filter((e) => e.kind !== 'pageerror').map((e) => e.detail);
        report.pageErrors = collector.entries.filter((e) => e.kind === 'pageerror').map((e) => e.detail);
        fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
        if (page) await page.close().catch(() => undefined);
        if (context) await context.close().catch(() => undefined);
        if (browser) await browser.close().catch(() => undefined);
        if (staticServer) staticServer.server.close();
        exitCode = report.passed ? 0 : (report.fatal && report.steps.length === 0 ? 2 : 1);
    }

    const passCount = report.steps.filter((s) => s.ok).length;
    console.log(`[playtest] 結果：${passCount}/${report.steps.length} 步通過，console error ${report.consoleErrors.length} 筆，pageerror ${report.pageErrors.length} 筆`);
    console.log(`[playtest] 報告 ${path.join(outDir, 'report.json')}`);
    return exitCode;
}

/**
 * 「命」分頁血統樹檢查：底板寬 = 主體寬 − 720、底板高 = 主體高（PROG-2-9041 規格）。
 * 主體節點名以 CharacterDs3Main 開頭；底板節點名含 Bloodline 且含 Tree/Base/Board/Panel/Bg 其一。
 */
async function checkBloodlineBounds(page, viewport) {
    // 底板節點名稱各版不同，列出幾個候選全量一起量，任一個符合「主體寬−720 × 主體高」即通過
    const candidates = ['^CharacterDs3MainBloodlineRoot$', '^TabBloodlineContent$', '^CharacterDs3TabBloodline$'];
    const bounds = await page.evaluate((cands) => {
        const host = window.__pt.sizeOf('^CharacterDs3Main$') || window.__pt.sizeOf('^CharacterDs3Main');
        return { host, trees: cands.map((re) => ({ re, size: window.__pt.sizeOf(re) })) };
    }, candidates);
    const found = bounds.trees.filter((t) => t.size);
    if (!bounds.host || !found.length) {
        return { ok: false, reason: `找不到主體或血統樹底板節點（host=${JSON.stringify(bounds.host)}；候選 ${candidates.join('、')} 皆不存在）`, bounds };
    }
    const expectW = bounds.host.width - 720;
    const expectH = bounds.host.height;
    const match = found.find((t) => Math.abs(t.size.width - expectW) <= 1 && Math.abs(t.size.height - expectH) <= 1);
    const sizes = found.map((t) => `${t.size.name} ${t.size.width}×${t.size.height}`).join('；');
    return {
        ok: Boolean(match),
        reason: match ? null : `候選底板實際尺寸皆不符：${sizes}；預期 ${expectW}×${expectH}（主體 ${bounds.host.width}×${bounds.host.height}，視窗 ${viewport.width}×${viewport.height}）`,
        host: bounds.host,
        candidates: found.map((t) => t.size),
        expected: { width: expectW, height: expectH },
    };
}

if (require.main === module) {
    main().then((code) => { process.exitCode = code; }, (error) => {
        console.error(`[playtest] ${error && error.stack || error}`);
        process.exitCode = 2;
    });
}

module.exports = { parseArgs, parseViewport, DEFAULT_URL };
