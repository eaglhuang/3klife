#!/usr/bin/env node
/**
 * playtest-online.js — 無頭「全新帳號」實玩驗收（線上試玩版或本機建置目錄）
 *
 * 用 puppeteer-core 加本機 Chrome 無頭，每次以 browser.createBrowserContext() 開全新的
 * 瀏覽器情境（無舊 localStorage／快取），依序走完：
 *   1. 開機到 LoginScene → 開始遊戲進 LobbyScene，等載入遮罩消失（記錄耗時）
 *   2. 新玩家開場（Intro → 信 → 命運抽取 → 確認 → 展示 → 教學）
 *   3. 大廳走動小人：點擊，確認對話泡泡出現
 *   3b. 任務牆（lobby-mission-wall）：點左牆第一張卡，核對詳情窗任務名，依序點 再探／等待／委任／執行
 *   3b-2. 大廳任務循環（lobby-mission-loop）：再探 → 執行 → 推進到回報季 → 季度結算「大廳任務」區塊與頂欄對帳 → 牆上補回 4 筆
 *   3c. 推進一季（lobby-advance-season）：依序處理季報／事件／三國季報／年度總結，驗季別 +1、無殘留 __ui-backdrop、底欄可點
 *   4. 轉蛋：切換每個池子一次，確認右欄節點切一輪後沒有疊加
 *   5. 人物介紹：開第一位武將，切每個分頁截圖；「命」分頁檢查血統樹底板 = 主體寬−720 × 主體高
 *   6. 出征打一場戰鬥到結算，回大廳（卡住超過 120 秒記為失敗）
 *   7. 老玩家重開：同一情境重新整理再進大廳，確認底欄在、不重跑新手開場
 *
 * 所有點擊都是「真滑鼠」（tools_node/playtest-real-mouse.js）：節點座標換成頁面座標後先做命中檢查
 * （最上層接收輸入的節點必須是目標或其子孫），通過才 page.mouse.click；被擋住時失敗訊息會指出擋住的節點。
 * 不再用 emit／直接呼叫 handler，避免繞過全螢幕遮罩（__ui-backdrop）。
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
 *   --mind      選用：換季後點大廳小人讀泡泡台詞（武將心智，PROG-2-9146）
 *   --year      選用：原步驟後接一年循環（每季內政／任務牆／戰鬥／抽卡／培育／推進一季），輸出 year-report.json（PROG-2-9141）
 *   --battles-per-season  --year 時每季出征場數（預設 2）
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
const { createRealMouse } = require('./playtest-real-mouse');

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
 * 節點以 Cocos 場景樹走訪；這裡只放「讀」的輔助。所有點擊一律走 playtest-real-mouse.js（真滑鼠＋命中檢查），
 * 不再用 node.emit('click')／直接呼叫 handler，避免繞過全螢幕遮罩與輸入攔截（PROG-2-9125）。
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
        /** 依 UCUF 語意 id（節點上的 _ucufId，例如 lobby-hall-screen.bubble）列出作用中的節點名稱；轉換器產生的節點名是 div_N 流水號，不能用名稱找 */
        activeUcufNodes: (id) => {
            const out = [];
            walk(scene(), (node) => {
                if (node.activeInHierarchy && node._ucufId === id) out.push(node.name);
            });
            return out;
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
        rm.takeBlocked(); // 清掉前一步殘留的「被擋住」紀錄
        try {
            const detail = await fn(rec);
            if (detail) Object.assign(rec.detail, detail);
            rec.ok = true;
        } catch (error) {
            rec.ok = false;
            rec.reason = String((error && error.message) || error).split('\n')[0];
            // 輪詢型點擊被擋住時，把「被誰擋住」附在失敗原因後面，不只留下逾時
            const blockedNow = rm.takeBlocked();
            if (blockedNow.length) {
                rec.detail.blockedClicks = blockedNow.slice(0, 6);
                rec.reason += `；真滑鼠被擋：${blockedNow.slice(0, 2).join(' | ')}`;
            }
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
    // 所有點擊走真滑鼠：找節點 → 換算頁面座標 → 命中檢查 → page.mouse.click；被擋住時記錄（輪詢型步驟逾時會附上）
    const rm = createRealMouse(() => page);
    const installHelpers = async () => { await page.evaluate(installPageHelpers); await rm.install(); };
    /** 點名稱符合 re 的可按按鈕；找不到或被擋住回傳 null（被擋住會記錄） */
    // 大廳底欄五個分類：玩家看得到、點得到的是大廳場景的 dock 節點（lobby-hall-screen.dock-*）；
    // 同名的 BtnCat* 按鈕在它底下（PROG-2-9125 真滑鼠命中檢查發現被 dock 蓋住），所以點 BtnCat* 時改點 dock
    const DOCK_OF_CATEGORY = { BtnCatShop: 'shop', BtnCatGenerals: 'generals', BtnCatSortie: 'sortie', BtnCatDomestic: 'domestic', BtnCatNurture: 'training' };
    const clickButton = (re) => {
        const m = /^\^(BtnCat\w+)\$$/.exec(re);
        if (m && DOCK_OF_CATEGORY[m[1]]) return rm.tryClick({ ucuf: `lobby-hall-screen.dock-${DOCK_OF_CATEGORY[m[1]]}` });
        return rm.tryClick({ name: re, button: true });
    };
    /** 點名稱符合 nameRe、且文字符合 textRe 的可按按鈕 */
    const clickByText = (nameRe, textRe) => rm.tryClick({ name: nameRe, text: textRe, button: true });
    /** 標題畫面進遊戲：先找 BtnStart 按鈕，沒有就點畫面上「開始遊戲」字樣（整個標題畫面是觸控區）。回傳用的方式 */
    const clickLoginStart = async () => {
        if (await clickButton('^BtnStart$')) return 'BtnStart';
        const r = await rm.click({ text: '^\\s*開始遊戲\\s*$' }, '開始遊戲');
        return `真滑鼠點「開始遊戲」字樣（${r.name}）`;
    };
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
        return clickByText('^BtnSub', textRe);
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
            await installHelpers();
            await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, '未進入 LoginScene');
            // 進 LoginScene 後等待再點開始（預設 12 秒：實測 LoginScene 出現後約 1 秒內點開始會觸發開機 pageerror，見 bug 卡；--login-settle 1000 可重現）
            await delay(Number(args['login-settle'] || 12000));
            rec.detail.bootToLoginMs = Date.now() - bootT0;

            const startT0 = Date.now();
            rec.detail.startMethod = await clickLoginStart();
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
        // 現行開場（PROG-2-9104 核對）：介紹頁 → 信 → 六名將登場 → 宿命池 → 新手教學。
        // 宿命轉蛋 2026-11-12 起改為轉蛋系統的一池（PROG-2-2243），用十連結果畫面 GachaPullResult 顯示、
        // 單鍵確定（GachaPullResult_close）十位全收；舊的 BtnDestinyRoll／BtnDestinyConfirm／BtnFrame0 選將面板已不掛。
        const openingSeq = ['BtnIntroNext', 'BtnCloseOpeningLetter', 'BtnShowcaseNext', 'GachaPullResult_close', 'BtnNextTutorial'];
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
            // 太守府：開啟後截一張（人口、民心、黃金與糧草產出列），再關回大廳；開不了只記錄不算失敗
            try {
                const opened = await openSub('BtnCatDomestic', '太守府');
                rec.detail.governorHallOpened = Boolean(opened);
                if (opened) {
                    await delay(2500);
                    await page.screenshot({ path: path.join(outDir, '03-governor-hall.png') });
                    await backToLobbyBar();
                }
            } catch (e) { rec.detail.governorHallError = String(e && e.message || e); }
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 3. 大廳走動小人：點擊 → 對話泡泡 ──
        await step('lobby-walker-bubble', async (rec) => {
            await requireLobby();
            const crowdRe = '^crowd-.*';
            // 泡泡是 UCUF 既有節點 lobby-hall-screen.bubble，平常 active=false，點到在場武將才開
            // 節點名是轉換器流水號（LobbyHallScreen_div_N），要用語意 id 找（PROG-2-9107 核對）
            const bubbleId = 'lobby-hall-screen.bubble';
            rec.detail.bubbleBefore = await page.evaluate((id) => window.__pt.activeUcufNodes(id), bubbleId);
            const walker = await waitUntil(() => page.evaluate((re) => window.__pt.findNodeName(re), crowdRe), 30000, '找不到走動小人（crowd-*）');
            rec.detail.walker = walker;
            const tapped = await rm.tryClick({ name: crowdRe });
            if (!tapped) throw new Error(`點擊小人失敗（真滑鼠）：${rm.takeBlocked().join('；') || '找不到可點的 crowd 節點'}`);
            const bubbles = await waitUntil(async () => {
                const now = await page.evaluate((id) => window.__pt.activeUcufNodes(id), bubbleId);
                return now.length ? now : null;
            }, 5000, '點小人後 lobby-hall-screen.bubble 沒有變為 active').catch(async (e) => {
                const all = await page.evaluate(() => Object.keys(window.__pt.nameCounts('ubble|Dialog|Speech')));
                const crowd = await page.evaluate(() => window.__pt.nameCounts('^crowd-'));
                throw new Error(`${e.message}（名稱含 bubble/dialog 的節點：${all.join(', ') || '無'}；crowd 節點：${Object.keys(crowd).join(', ') || '無'}）`);
            });
            rec.detail.bubbleNodes = Array.from(new Set(bubbles));
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 3b. 大廳任務牆（真滑鼠）：左牆第一張任務卡 → 詳情窗任務名稱與牆上相同 → 依序點再探／等待／委任／執行，每點一次都要有可見反應 ──
        const MISSION_DIALOG = '^LobbyMissionDetailDialogComposite$';
        const WALL_LEFT = 'lobby-hall-screen.wall-left';
        const WALL_RIGHT = 'lobby-hall-screen.wall-right';
        /** 截圖並記進這一步的 screenshots 清單；tag 只用 ASCII */
        const shot = async (rec, tag) => {
            const file = path.join(outDir, `${String(stepIndex).padStart(2, '0')}-${tag}.png`);
            await page.screenshot({ path: file });
            (rec.detail.screenshots = rec.detail.screenshots || []).push(path.relative(projectRoot, file).replace(/\\/g, '/'));
        };
        /** 等提示（Toast）消失，之後再點才分得出「新的提示」 */
        const waitToastGone = () => waitUntil(async () => !(await rm.toastVisible()), 8000, '提示 8 秒內沒有消失').catch(() => undefined);
        /** 任務詳情窗與任務牆底下的面板都關掉（真滑鼠點各自的 BtnClose） */
        const closeMissionLayers = async () => {
            for (let i = 0; i < 4; i++) {
                const hit = (await rm.tryClick({ name: '^BtnClose$', under: MISSION_DIALOG })) || (await rm.tryClick({ name: '^BtnClose$', under: '^HallBoardHost$' }));
                if (!hit) break;
                await delay(900);
            }
        };
        /** 點左牆第一張任務卡，等詳情窗出現，核對任務名稱。回傳 { title, dialogTexts } */
        const openFirstWallCard = async (rec, wall = WALL_LEFT) => {
            const cards = await rm.wallCards(wall);
            if (!cards || !cards.length) throw new Error(`${wall === WALL_LEFT ? '左' : '右'}牆沒有任務卡（牆節點 ${cards === null ? '找不到' : '存在但沒有作用中的卡片列'}；牆頭文字 ${(await rm.textOfUcuf(wall)) || '無'}）`);
            const card = cards[0];
            const title = String(card.title || '').trim();
            rec.detail.wallCard = { title, meta: card.meta };
            if (!title) throw new Error('左牆第一張任務卡沒有任務名稱文字');
            const textsBefore = new Set(await rm.allTexts());
            const clickedCard = await rm.click({ ucuf: wall, childIndex: card.childIndex }, `${wall === WALL_LEFT ? '左' : '右'}牆第一張任務卡「${title}」`);
            // 輪詢等詳情窗；同時收集點擊後新出現過的文字（提示、錯誤訊息一閃而過也要留下）
            const newTexts = new Set();
            let opened = false;
            const openDeadline = Date.now() + 8000;
            while (!opened && Date.now() < openDeadline) {
                for (const t of await rm.allTexts()) if (!textsBefore.has(t)) newTexts.add(t);
                opened = await rm.present({ name: MISSION_DIALOG });
                if (!opened) await delay(300);
            }
            if (!opened) {
                const board = await rm.present({ name: '^HallBoardHost$' });
                throw new Error(`點左牆第一張任務卡「${title}」（${card.meta || '無副標'}；點擊 ${Math.round(clickedCard.page.x)},${Math.round(clickedCard.page.y)} 命中 ${clickedCard.name}）後 8 秒內沒有開出任務詳情窗；任務牆面板${board ? '有' : '沒有'}開；點擊後新出現的文字：${Array.from(newTexts).slice(0, 8).join(' / ') || '無'}`);
            }
            await delay(800);
            const dialogTexts = (await rm.textsUnder(MISSION_DIALOG)) || [];
            if (!dialogTexts.some((t) => t === title || t.includes(title))) {
                throw new Error(`詳情窗的任務名稱與牆上卡片不同：牆上「${title}」；詳情窗文字：${dialogTexts.slice(0, 10).join(' / ')}`);
            }
            return { title, dialogTexts };
        };
        await step('lobby-mission-wall', async (rec) => {
            await requireLobby();
            await backToLobbyBar();
            await closeMissionLayers();
            await waitToastGone();
            // 大廳進來後右下角會跑「背景載入其餘介面」，載完前詳情窗開不出來：先等它結束並記錄等了多久
            const loadT0 = Date.now();
            await waitUntil(async () => (await page.evaluate(() => window.__pt.textsMatching('背景載入'))).length === 0, stuckMs, '「背景載入其餘介面」超過上限仍未結束');
            rec.detail.backgroundLoadWaitMs = Date.now() - loadT0;
            const { title } = await openFirstWallCard(rec);
            rec.detail.dialogTitleMatchesWall = title;
            await shot(rec, 'mission-detail-open');
            const actions = [['再探', '^BtnScout$', 'scout'], ['等待', '^BtnWait$', 'wait'], ['委任', '^BtnAssign$', 'assign'], ['執行', '^BtnExecute$', 'execute']];
            rec.detail.actions = [];
            for (const [label, nameRe, tag] of actions) {
                // 前一個動作若讓詳情窗關了（例如委任成功），重開一次再點
                if (!(await rm.present({ name: MISSION_DIALOG }))) {
                    await closeMissionLayers();
                    await openFirstWallCard(rec);
                    rec.detail.reopenedBefore = (rec.detail.reopenedBefore || []).concat(label);
                }
                await waitToastGone();
                const before = new Set(await rm.allTexts());
                const clicked = await rm.click({ name: nameRe, under: MISSION_DIALOG }, label);
                // 反應 = 出現提示（Toast）、出現新文字、或詳情窗關閉／任務牆被改動
                let reaction = null;
                const deadline = Date.now() + 4000;
                while (Date.now() < deadline) {
                    await delay(300);
                    const now = await rm.allTexts();
                    const added = now.filter((t) => !before.has(t));
                    const dialogGone = !(await rm.present({ name: MISSION_DIALOG }));
                    const toast = await rm.toastVisible();
                    if (added.length || dialogGone || toast) {
                        reaction = { newTexts: added.slice(0, 4), dialogClosed: dialogGone, toastShown: toast };
                        break;
                    }
                }
                await shot(rec, `mission-action-${tag}`);
                rec.detail.actions.push({ label, node: clicked.name, page: { x: Math.round(clicked.page.x), y: Math.round(clicked.page.y) }, reaction });
                if (!reaction) throw new Error(`點「${label}」後 4 秒內畫面沒有任何變化（沒有新提示文字、詳情窗沒關、狀態沒改變；點擊 ${Math.round(clicked.page.x)},${Math.round(clicked.page.y)} 命中 ${clicked.name}）`);
            }
            await closeMissionLayers();
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 3c. 大廳推進一季（真滑鼠）：點右上「推進一季」→ 依序處理彈窗 → 季別前進一季、遮罩不壓大廳、底欄還點得動 ──
        const SEASON_NAMES = ['春', '夏', '秋', '冬'];
        const seasonOrdinal = (text) => {
            // 頂欄剛進大廳、還沒刷新前是「第 1 年 1 季」數字寫法，刷新後是「第 1 年 夏」，兩種都要能比
            const named = /第\s*(\d+)\s*年\s*([春夏秋冬])/.exec(text || '');
            if (named) return Number(named[1]) * 4 + SEASON_NAMES.indexOf(named[2]);
            const numbered = /第\s*(\d+)\s*年\s*([1-4])\s*季/.exec(text || '');
            return numbered ? Number(numbered[1]) * 4 + Number(numbered[2]) - 1 : null;
        };
        const readSeason = async () => {
            const text = await rm.textOfUcuf('lobby-hall-screen.hall-time');
            return { text, ordinal: seasonOrdinal(text) };
        };
        /** 換季後可能出現的彈窗，一個 kind 對應一組點擊規格；同一 kind 重複出現時依序換下一組規格（例如三國季報第一個選項資源不足，改選第二個） */
        const SEASON_POPUPS = [
            { kind: 'season-report', specs: [{ name: '^BtnClose$', under: '^SeasonReportComposite$' }] },
            { kind: 'season-report-x', specs: [{ name: '.*', text: '^\\s*[Xx×]\\s*$', under: '^SeasonReportRoot$', button: true }] },
            { kind: 'season-event', specs: [{ name: '^SeasonEventOptionA$' }] },
            { kind: 'chronicle-choice', specs: [{ name: '^SeasonChronicleEncounterA$' }, { name: '^SeasonChronicleEncounterB$' }] },
            { kind: 'chronicle-close', specs: [{ name: '^SeasonChronicleClose$', button: true }] },
            { kind: 'year-report', specs: [{ name: 'close|confirm|ok', under: '^YearReportHost$', button: true }] },
        ];
        /** 處理換季後的彈窗直到安靜；captured 收集季度戰報彈窗開著時的畫面文字（關閉前截下，供大廳任務區塊對帳） */
        const runSeasonPopups = async (rec, shotTag, captured, popupLog) => {
            const popups = [];
            const attempts = {};
            let quiet = 0;
            let blockedStreak = 0;
            for (let i = 0; i < 30 && quiet < 2; i++) {
                await delay(1500);
                let handled = false;
                let blockedSpec = null;
                for (const popup of SEASON_POPUPS) {
                    const n = attempts[popup.kind] || 0;
                    const spec = popup.specs[Math.min(n, popup.specs.length - 1)];
                    const r = await rm.locate(spec);
                    if (!r.found) continue;
                    if (!r.ok) { blockedSpec = blockedSpec || { popup, spec }; continue; }
                    await shot(rec, `${shotTag}-${popups.length + 1}-${popup.kind}`);
                    let cap = null;
                    if (popupLog) {
                        const host = { 'season-event': '^SeasonEventHost$', 'chronicle-choice': '^SeasonChronicleHost$', 'chronicle-close': '^SeasonChronicleHost$', 'year-report': '^YearReportHost$' }[popup.kind] || '^SeasonReportRoot$';
                        popupLog.push({ kind: popup.kind, texts: ((await rm.textsUnder(host)) || []).slice(0, 30) });
                    }
                    if (captured && popup.kind.startsWith('season-report')) { cap = { texts: await rm.textsUnder('^SeasonReportRoot$'), top: await readTopbar() }; captured.push(cap); }
                    await rm.click(spec, popup.kind);
                    // 季報一關，頂欄立刻讀一次：後續事件選項會花錢，不能拿最後的頂欄比
                    if (cap) { await delay(400); cap.topClosed = await readTopbar(); }
                    attempts[popup.kind] = n + 1;
                    popups.push({ kind: popup.kind, click: r.name, attempt: n + 1 });
                    handled = true;
                    break;
                }
                if (handled) { quiet = 0; blockedStreak = 0; continue; }
                if (blockedSpec) {
                    // 連續 3 次（約 4.5 秒）都被擋住才算：彈窗動畫中偶爾短暫被擋不算
                    if (++blockedStreak >= (popupLog ? 8 : 3)) await rm.click(blockedSpec.spec, blockedSpec.popup.kind);
                    continue;
                }
                blockedStreak = 0;
                quiet += 1;
            }
            if (quiet < 2) throw new Error(`彈窗 45 秒內沒處理完（已處理 ${popups.map((p) => p.kind).join('、') || '無'}）`);
            return popups;
        };
        // ── 3b-2. 大廳任務完整循環（真滑鼠）：再探 → 選將執行 → 推進到回報季 → 季度結算「大廳任務」區塊與頂欄對帳 → 牆上補回 4 筆（PROG-2-9130）──
        const readNum = (text) => Number(String(text || '').replace(/[^0-9]/g, '')) || 0;
        const readTopbar = async () => ({
            gold: readNum(await rm.textOfNodeName('LobbyHallScreen_span_1')),
            food: readNum(await rm.textOfNodeName('LobbyHallScreen_span_3')),
            troops: readNum(await rm.textOfNodeName('LobbyHallScreen_span_4')),
        });
        await step('lobby-mission-loop', async (rec) => {
            await requireLobby();
            await backToLobbyBar();
            await closeMissionLayers();
            await waitToastGone();
            const top0 = await readTopbar();
            rec.detail.topBefore = top0;
            const head0 = (await rm.textOfUcuf(WALL_LEFT)) || '';
            rec.detail.wallHeadBefore = head0;
            if (!/未接取/.test(head0)) throw new Error(`左牆牆頭沒有「未接取 N」字樣：${head0 || '無'}`);
            // 1. 開一筆未接取任務詳情，情報不足時敵情是 ???
            const { title } = await openFirstWallCard(rec);
            rec.detail.missionTitle = title;
            const dialog0 = (await rm.textsUnder(MISSION_DIALOG)) || [];
            const masked = dialog0.some((t) => t.includes('???'));
            rec.detail.maskedBeforeRecon = masked;
            await shot(rec, 'loop-detail-masked');
            if (!masked) throw new Error(`詳情窗在情報 50% 時沒有遮蔽字樣 ???（文字：${dialog0.slice(0, 12).join(' / ')}）`);
            // 2. 再探：糧草 -50、???遮蔽揭露
            await rm.click({ name: '^BtnScout$', under: MISSION_DIALOG }, '再探');
            const afterRecon = await waitUntil(async () => {
                const top = await readTopbar();
                return top.food === top0.food - 50 ? top : null;
            }, 6000, '').catch(() => null);
            let topNow = await readTopbar();
            rec.detail.topAfterRecon = topNow;
            await delay(600);
            const dialog1 = (await rm.textsUnder(MISSION_DIALOG)) || [];
            await shot(rec, 'loop-after-recon');
            if (!afterRecon) throw new Error(`再探後頂欄糧草沒有減少 50（再探前 ${top0.food}，再探後 ${topNow.food}）`);
            // 再探每次只加 35／25／15（上限 90，PROG-2-9148 使用者裁決）：一次揭不完，最多再探 3 次到上限 90；
            // 敵情與事實的「???」會逐層揭開，只剩「完美獎勵」那格維持 ???（隱藏獎勵要情報 100 才揭，再探到不了）
            const intelOf = (texts) => { const k = texts.indexOf('%'); return k > 0 ? Number(texts[k - 1]) : NaN; };
            let dialogNow = dialog1;
            const intelSeries = [intelOf(dialog0), intelOf(dialog1)];
            rec.detail.reconClicks = 1;
            for (let extra = 0; extra < 3 && !(intelSeries[intelSeries.length - 1] >= 90); extra++) {
                await waitToastGone();
                const foodBefore = (await readTopbar()).food;
                await rm.click({ name: '^BtnScout$', under: MISSION_DIALOG }, '再探');
                await waitUntil(async () => ((await readTopbar()).food === foodBefore - 50 ? true : null), 6000, '').catch(() => null);
                await delay(600);
                dialogNow = (await rm.textsUnder(MISSION_DIALOG)) || [];
                intelSeries.push(intelOf(dialogNow));
                rec.detail.reconClicks += 1;
            }
            rec.detail.intelSeries = intelSeries;
            rec.detail.dialogAfterRecon = dialogNow.slice(0, 16);
            if (!(intelSeries[1] > intelSeries[0])) throw new Error(`再探後情報沒有增加（${intelSeries.join(' → ')}）`);
            if (!(intelSeries[intelSeries.length - 1] >= 90)) throw new Error(`連續再探 ${rec.detail.reconClicks} 次後情報沒有到上限 90（${intelSeries.join(' → ')}）`);
            const fogLeft = dialogNow.filter((t) => t.includes('???') && t.trim() !== '???');
            if (fogLeft.length) throw new Error(`情報到上限後敵情仍有遮蔽字樣 ???（${fogLeft.slice(0, 3).join(' / ')}）`);
            topNow = await readTopbar();
            // 3. 選將執行：頂欄糧草與兵源減少、牆上少一張、牆頭出現「進行中」
            await waitToastGone();
            await rm.click({ name: '^BtnExecute$', under: MISSION_DIALOG }, '執行');
            const dispatched = await waitUntil(async () => {
                const top = await readTopbar();
                return top.food < topNow.food && top.troops < top0.troops ? top : null;
            }, 6000, '').catch(() => null);
            const top1 = await readTopbar();
            rec.detail.topAfterDispatch = top1;
            await delay(800);
            const head1 = (await rm.textOfUcuf(WALL_LEFT)) || '';
            const cards1 = (await rm.wallCards(WALL_LEFT)) || [];
            const statusTexts = await waitUntil(async () => { const t = await rm.texts('進行中，還有 \\d+ 季'); return t.length ? t : null; }, 6000, '').catch(() => []);
            rec.detail.wallHeadAfterDispatch = head1;
            rec.detail.activeStatusTexts = statusTexts;
            await shot(rec, 'loop-after-dispatch');
            if (!dispatched) throw new Error(`執行後頂欄糧草／兵源沒有同時減少（執行前 ${JSON.stringify(topNow)}，執行後 ${JSON.stringify(top1)}）`);
            if (!/進行中\s*\d+\s*件/.test(head1)) throw new Error(`執行後左牆牆頭沒有「進行中 N 件」：${head1}`);
            if (cards1.some((c) => String(c.title).includes(title))) throw new Error(`執行後「${title}」仍在左牆的未接取列上`);
            if (!statusTexts.length) throw new Error('執行後任務板上看不到「進行中，還有 N 季」的列狀態文字');
            const remain = Math.min(3, Math.max(1, ...statusTexts.map((t) => Number((/還有\s*(\d+)\s*季/.exec(t) || [])[1]) || 1)));
            // 3b. 武將佔用：派出武將 A 之後，再開另一個任務，A 不可選、顯示「出任務中」、預設人物不是 A（用真滑鼠點）
            const busyName = ((/・([^（\s]+)/.exec(statusTexts[0]) || [])[1] || '').trim();
            rec.detail.busyGeneral = busyName;
            if (!busyName) throw new Error(`讀不到派出的武將名（列狀態：${statusTexts.join(' / ')}）`);
            await closeMissionLayers();
            await waitToastGone();
            const second = await openFirstWallCard(rec);
            rec.detail.secondMissionTitle = second.title;
            const hint2 = ((await rm.textsUnder(MISSION_DIALOG)) || []).find((t) => /^成功率/.test(t)) || '';
            const selected2 = (await rm.textOfNodeName('SelectedGeneralLabel')) || '';
            rec.detail.secondDialogDefault = { selected: selected2, hint: hint2 };
            if (selected2.includes(busyName) || hint2.includes(`（${busyName}）`)) throw new Error(`武將「${busyName}」還在出任務，另一任務詳情窗預設人物卻是他（人物 ${selected2}；${hint2}）`);
            await rm.click({ name: '^GeneralSelectButton$', under: MISSION_DIALOG }, '行動人物下拉');
            await delay(700);
            const optionTexts = (await rm.textsUnder('^GeneralSelectDropdownPanel$')) || (await rm.textsUnder(MISSION_DIALOG)) || [];
            rec.detail.dropdownTexts = optionTexts.slice(0, 16);
            await shot(rec, 'loop-busy-dropdown');
            if (!optionTexts.some((t) => t.includes(busyName)) || !optionTexts.some((t) => t.includes('出任務中'))) throw new Error(`下拉清單沒有把「${busyName}」標成「出任務中」（清單文字：${optionTexts.slice(0, 16).join(' / ')}）`);
            // 出任務中的列排在清單最後：用滑鼠滾輪把下拉往下捲到看得見，再真點
            let reachedBusyRow = false;
            for (let i = 0; i < 40 && !reachedBusyRow; i++) {
                const hit = await rm.locate({ name: '^GeneralOption_', text: busyName });
                // 命中檢查不看捲動遮罩：列在視窗內但被詳情窗底部遮住也會回 ok，所以另外要求列的畫面座標落在下拉可視範圍（約 y 570～810）
                if (hit && hit.found && hit.ok && hit.page && hit.page.y > 570 && hit.page.y < 810) { reachedBusyRow = true; break; }
                await page.mouse.move(960, 600);
                await page.mouse.wheel({ deltaY: 700 });
                await delay(250);
            }
            if (!reachedBusyRow) throw new Error(`滾輪捲了 40 次，「${busyName}」那列仍沒進到下拉可視範圍`);
            await shot(rec, 'loop-busy-row-visible');
            await rm.click({ name: '^GeneralOption_', text: busyName }, `下拉裡出任務中的「${busyName}」`);
            await delay(600);
            const afterPick = (await rm.textOfNodeName('SelectedGeneralLabel')) || '';
            rec.detail.afterPickBusy = afterPick;
            await shot(rec, 'loop-busy-picked');
            if (!afterPick) throw new Error('點出任務中的列後，詳情窗行動人物欄位讀不到（詳情窗被誤關？）');
            if (afterPick.includes(busyName)) throw new Error(`點了出任務中的「${busyName}」，行動人物竟被改成他`);
            await closeMissionLayers();
            await closeMissionLayers();
            await closeMissionLayers();
            await waitToastGone();
            // 4. 推進到回報季；季度結算要有「大廳任務」區塊，頂欄在彈窗還開著時就已是最新
            const reports = [];
            const topBeforeAdvance = await readTopbar();
            rec.detail.advances = [];
            for (let i = 0; i < remain; i++) {
                await requireLobby();
                await backToLobbyBar();
                await closeMissionLayers();
                await rm.click({ ucuf: 'lobby-hall-screen.back' }, '右上「推進一季」');
                const popups = await runSeasonPopups(rec, `loop-advance${i + 1}`, reports);
                rec.detail.advances.push(popups.map((p) => p.kind));
            }
            const topAfterAdvance = await readTopbar();
            rec.detail.topBeforeAdvance = topBeforeAdvance;
            rec.detail.topAfterAdvance = topAfterAdvance;
            rec.detail.reportCaptures = reports.map((r) => ({ texts: r.texts, top: r.top, topClosed: r.topClosed }));
            const hallReport = reports.find((r) => (r.texts || []).some((t) => t.includes('大廳任務')));
            if (!hallReport) throw new Error(`推進 ${remain} 季後，季度結算彈窗沒有「大廳任務」區塊（彈窗文字：${reports.map((r) => (r.texts || []).join('/')).join(' || ') || '沒有出現季度結算彈窗'}）`);
            const block = (hallReport.texts || []).join('\n');
            if (!block.includes(title)) throw new Error(`「大廳任務」區塊沒有列出剛派出的任務「${title}」：${block}`);
            // 頂欄在彈窗還開著時已是結算後的數字：與彈窗關閉後相同
            if (hallReport.top.food !== hallReport.topClosed.food || hallReport.top.gold !== hallReport.topClosed.gold) {
                throw new Error(`彈窗開著時頂欄（糧 ${hallReport.top.food}／金 ${hallReport.top.gold}）與季報關閉後（糧 ${hallReport.topClosed.food}／金 ${hallReport.topClosed.gold}）不同，頂欄不是在彈窗前更新`);
            }
            // 區塊寫成功時，糧草增加量要不少於區塊列的糧草入帳（頂欄還含每季自然回補）
            const gainOf = (re) => (block.match(new RegExp(re, 'g')) || []).reduce((sum, m) => sum + readNum(m), 0);
            const gainGrain = gainOf('糧草 \+[\d,]+');
            const gainSilver = gainOf('黃金 \+[\d,]+');
            rec.detail.reportGains = { grain: gainGrain, silver: gainSilver };
            if (topAfterAdvance.food - topBeforeAdvance.food < gainGrain) throw new Error(`頂欄糧草增加 ${topAfterAdvance.food - topBeforeAdvance.food}，少於結算區塊的糧草入帳 ${gainGrain}`);
            // 5. 任務從牆上消失、未接取補回 4 筆
            await closeMissionLayers();
            const head2 = (await rm.textOfUcuf(WALL_LEFT)) || '';
            const cards2 = (await rm.wallCards(WALL_LEFT)) || [];
            rec.detail.wallHeadAfterSettle = head2;
            await shot(rec, 'loop-after-settle');
            if (!/未接取\s*4/.test(head2)) throw new Error(`結算後左牆牆頭不是「未接取 4」：${head2}`);
            if (cards2.length !== 4) throw new Error(`結算後左牆未接取列數 ${cards2.length}，應為 4`);
            // 補牌可能再抽到同模板（新任務、同標題），所以不比標題；改確認牆頭已無「進行中」
            if (/進行中/.test(head2)) throw new Error(`結算後左牆牆頭仍有進行中任務：${head2}`);
            return rec.detail;
        }, { skipIfFailed: true });

        await step('lobby-advance-season', async (rec) => {
            await requireLobby();
            await backToLobbyBar();
            await closeMissionLayers();
            const before = await readSeason();
            rec.detail.seasonBefore = before.text;
            if (before.ordinal === null) throw new Error(`頂欄讀不到季別（lobby-hall-screen.hall-time 文字：${before.text || '無'}）`);
            await rm.click({ ucuf: 'lobby-hall-screen.back' }, '右上「推進一季」');
            const popups = (rec.detail.popups = await runSeasonPopups(rec, 'popup'));
            await delay(1000);
            // 驗證 1：頂欄季別前進一季（最多等 5 秒讓畫面刷新）
            let after = await readSeason();
            for (let i = 0; i < 10 && after.ordinal === before.ordinal; i++) { await delay(500); after = await readSeason(); }
            rec.detail.seasonAfter = after.text;
            if (after.ordinal !== before.ordinal + 1) throw new Error(`頂欄季別沒有前進一季：點之前「${before.text}」，彈窗全關後「${after.text || '讀不到'}」`);
            // 驗證 2：沒有顯示中的彈窗宿主、沒有 __ui-backdrop 壓在大廳之上
            const leftovers = await page.evaluate(() => window.__pt.activeNodeNames('^(SeasonReportComposite|SeasonEventHost|SeasonChronicleHost|YearReportHost)$'));
            const backdrops = await rm.backdropsOver('lobby-hall-screen.back');
            rec.detail.backdrops = backdrops;
            await shot(rec, 'lobby-after-advance');
            if (leftovers.length) throw new Error(`彈窗都處理完後仍有彈窗節點作用中：${leftovers.join('、')}`);
            const covering = backdrops.backdrops.filter((b) => b.aboveAnchor === true && (b.opacity === null || b.opacity > 0));
            if (covering.length) throw new Error(`大廳之上仍壓著 __ui-backdrop：${covering.map((b) => `${b.path}（尺寸 ${b.size}，透明度 ${b.opacity}，${b.receiver ? '會' : '不會'}攔輸入）`).join('、')}`);
            // 驗證 3：真滑鼠點大廳底欄按鈕，要有反應（子選單出現）
            await waitToastGone();
            const beforeTexts = new Set(await rm.allTexts());
            const dock = await rm.click({ ucuf: 'lobby-hall-screen.dock-shop' }, '大廳底欄「商城」');
            const reacted = await waitUntil(async () => {
                const added = (await rm.allTexts()).filter((t) => !beforeTexts.has(t));
                const subs = await page.evaluate(() => window.__pt.hasButton('^BtnSub'));
                return subs || added.length ? { added: added.slice(0, 5), subMenu: subs } : null;
            }, 4000, '').catch(() => null);
            rec.detail.dockClick = { node: dock.name, page: { x: Math.round(dock.page.x), y: Math.round(dock.page.y) }, reaction: reacted };
            await shot(rec, 'lobby-dock-after-advance');
            if (!reacted) throw new Error(`推進一季處理完後，真滑鼠點大廳底欄「商城」（${Math.round(dock.page.x)},${Math.round(dock.page.y)}）沒有任何反應（沒有子選單、沒有新文字）`);
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 5. 人物介紹：第一位武將 → 每個分頁截圖 → 「命」分頁檢查血統樹 ──
        // ── 武將心智（PROG-2-9146，--mind）：派任務、換季之後點大廳小人讀泡泡台詞（要引用過去的決定或說出心情），並統計自告奮勇「!」標記 ──
        // 第一次進來時補經歷（呼叫大廳的 qaInjectMindHistory，PROG-2-9150）：小人泡泡會引用那次任務，下一次換季武將來信
        const injectMindQa = async (rec) => {
            if (await page.evaluate(() => window.__mindQaDone)) return;
            rec.detail.injected = await page.evaluate(() => {
                window.__mindQaDone = true;
                let n = -1;
                const walk = (node) => { for (const c of node.components) if (c && c.qaInjectMindHistory) n = c.qaInjectMindHistory(); for (const ch of node.children) walk(ch); };
                walk(window.cc.director.getScene());
                return n;
            });
        };
        const mindBubbles = async (rec, rounds) => {
            await requireLobby();
            await injectMindQa(rec);
            await backToLobbyBar();
            await closeMissionLayers();
            const bubbleId = 'lobby-hall-screen.bubble';
            const lines = [];
            rec.detail.marks = [];
            for (let round = 0; round < rounds; round++) {
                const crowd = await page.evaluate(() => Object.keys(window.__pt.nameCounts('^crowd-')));
                const marks = await page.evaluate(() => Object.keys(window.__pt.nameCounts('^mark-')));
                if (marks.length) {
                    rec.detail.marks.push(...marks.filter((m) => !rec.detail.marks.includes(m)));
                    if (!rec.detail.markShot) { rec.detail.markShot = true; await shot(rec, 'mind-volunteer-marks'); }
                }
                for (const name of crowd) {
                    const tapped = await rm.tryClick({ name: '^' + name + '$' });
                    if (!tapped) continue;
                    const text = await waitUntil(async () => {
                        const now = await page.evaluate((id) => window.__pt.activeUcufNodes(id), bubbleId);
                        return now.length ? await rm.textOfUcuf(bubbleId) : null;
                    }, 4000, '').catch(() => null);
                    if (text && !lines.some((l) => l.who === name && l.text === text)) {
                        lines.push({ who: name, text });
                        if (lines.length <= 8) await shot(rec, `mind-bubble-${lines.length}`);
                    }
                    await delay(500);
                }
                await delay(3000);
            }
            rec.detail.lines = lines;
            rec.detail.citingLines = lines.filter((l) => /第\d+年|上回|上次|那次/.test(l.text));
            if (!lines.length) throw new Error('點大廳小人沒有讀到任何泡泡文字');
            return rec.detail;
        };
        if (args.mind) await step('lobby-mind-bubbles', (rec) => mindBubbles(rec, 4), { skipIfFailed: true });

        // ── 武將信箱（PROG-2-9150，--mind）：開右上「信箱」→ 截圖請求內容 → 真滑鼠按第一封的「准／寬慰／採納」→ 截圖武將反應句 → 關閉 ──
        const mindMailbox = async (rec, tag) => {
            await requireLobby();
            await injectMindQa(rec);
            await backToLobbyBar();
            await closeMissionLayers();
            const opened = await rm.tryClick({ name: '^BtnMindMailbox$', button: true });
            if (!opened) { rec.detail.mailbox = '大廳沒有信箱入口（本季沒有任何武將來信）'; return rec.detail; }
            await delay(600);
            const texts = (await rm.allTexts()).filter((t) => /・(求封|請戰|雪恥|請罪|訴苦|進言|抗命信)/.test(t) || /第\d+年/.test(t));
            rec.detail.requestTexts = texts.slice(0, 8);
            await shot(rec, `mind-mailbox-${tag}`);
            const answered = await rm.tryClick({ name: '^BtnMindReply-0-yes$', button: true }) || await rm.tryClick({ name: '^BtnMindReply-0-no$', button: true });
            rec.detail.answered = Boolean(answered);
            if (answered) {
                await delay(800);
                rec.detail.afterTexts = (await rm.allTexts()).filter((t) => /^「/.test(t.trim()) || /已准|已駁|已閱/.test(t)).slice(0, 6);
                await shot(rec, `mind-mailbox-${tag}-reply`);
            }
            await rm.tryClick({ name: '^BtnMindClose$', button: true });
            return rec.detail;
        };
        if (args.mind) await step('lobby-mind-mailbox', (rec) => mindMailbox(rec, 'lobby'), { skipIfFailed: true });

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
                await clickByText('.*', '^\\s*' + tab);
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
        /**
         * 出征打一場戰鬥到結算並回大廳（原第 6 步抽成函式，一年循環每季重用）。
         * opts.shotTag 有給時，結算畫面出現時截一張並記錄勝負文字（rec.detail.result／settleShot）。
         */
        const runBattle = async (rec, opts = {}) => {
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
            const deployRe = '^(BtnSortie|BtnStartBattle|BtnDeploy|BtnConfirmDeploy|BtnConfirmSortie|BtnStart|BtnGo|BtnNextDispatchGeneral|BtnScoutSortie|QuickSortieCommand)$'; // QuickSortieCommand：非首戰出征時多一個「選擇戰鬥模式」對話框，選「親自指揮」
            // 出征面板：依序點可按的出征確認鈕，直到進入 BattleScene（每 2 秒一次，總時限 120 秒）
            let quickClicked = false;
            await waitUntil(async () => {
                if ((await scene()) === 'BattleScene') return true;
                // 極速決戰（opts.quick）：不進戰場，點完「極速決戰」就看結果
                if (opts.quick && (await clickButton('^QuickSortieQuick$'))) { quickClicked = true; return true; }
                await clickButton(deployRe);
                // 兵勢凶險時會再跳「強行出征」確認框
                await clickByText('.*', '^\\s*強行出征\\s*$');
                await delay(2000);
                return false;
            }, BATTLE_LIMIT_MS, `出征面板無法進入戰場（可按按鈕：${(await listButtons()).join(', ')}）`);
            rec.detail.toBattleMs = Date.now() - battleT0;
            if (quickClicked) {
                // 極速決戰：等結果文字出現，截圖、記錄畫面文字，再把結果面板收掉
                // 極速決戰先跳「戰前偵查」確認框：按「出征」（BtnScoutSortie／文字）才會開打
                const before = new Set(await rm.allTexts());
                for (let i = 0; i < 5; i++) {
                    const hit = (await clickByText('.*', '^\\s*強行出征\\s*$')) || (await clickButton('^(BtnScoutSortie|BtnSortie|BtnConfirmSortie)$')) || (await clickByText('.*', '^\\s*出征\\s*$'));
                    if (!hit) break;
                    await delay(1500);
                }
                await delay(4000);
                rec.detail.quickTexts = (await rm.allTexts()).filter((t) => !before.has(t)).slice(0, 30);
                rec.detail.result = (rec.detail.quickTexts.find((t) => /【極速決戰】/.test(t)) || 'quick').replace('【極速決戰】', '極速：');
                rec.detail.quick = true;
                if (opts.shotTag) await shot(rec, opts.shotTag);
                for (let i = 0; i < 4; i++) {
                    const hit = (await clickByText('.*', '^\\s*(收下戰果|確定|確認|關閉|返回大廳|知道了)\\s*$')) || (await clickButton('^(BtnConfirm|BtnClose|BtnNext)$'));
                    if (!hit) break;
                    await delay(1200);
                }
                if ((await scene()) === 'BattleScene') throw new Error('極速決戰後竟進入 BattleScene');
                return rec.detail;
            }

            // 加速（若有）；自動戰鬥若預設已開就不重複點
            await delay(1500);
            await clickButton('^BtnFastForward$');
            // 首戰教學框：收起；再把第一張兵卡拖到我方底線第 3 路（座標以 1920x1080 截圖比例換算）
            await clickByText('.*', '^\\s*收起\\s*$');
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
                    await clickByText('.*', '^\\s*退\\s*$');
                    await clickByText('.*', '^\\s*(確認|確定|是|撤退|結束教學)\\s*$');
                }
                await clickButton('^BtnAuto$');
                await clickButton('^(BtnEndTurn|btnEndTurn|EndTurnBtn)$');
                if (Date.now() - lastProgressAt > BATTLE_LIMIT_MS) throw new Error(`戰鬥卡住：第 ${lastRound} 回合起超過 ${Math.round(BATTLE_LIMIT_MS / 1000)} 秒沒有推進（可按按鈕：${(await listButtons()).join(', ')}）`);
                if (Date.now() > hardDeadline) throw new Error(`戰鬥 6 分鐘內未結算（停在第 ${lastRound} 回合；回合仍在推進，疑似戰鬥變長）`);
                await delay(1000);
            }
            rec.detail.settledBy = settled;
            rec.detail.battleMs = Date.now() - battleT0;
            if (settled === 'review') {
                rec.detail.result = (await page.evaluate(() => window.__pt.textsMatching('^(勝利|失敗|戰敗|平手)$')))[0] || null;
                rec.detail.reviewTexts = await page.evaluate(() => window.__pt.textsMatching('.{2,}')).then((t) => t.slice(0, 40)).catch(() => []);
                if (opts.shotTag) await shot(rec, opts.shotTag);
                await waitUntil(async () => {
                    if ((await scene()) === 'LobbyScene') return true;
                    const hit = (await clickByText('.*', '返回大廳')) || await clickButton('^(BtnBattleReviewClose|BtnReturnLobby|BtnBackLobby|BtnReturn|BtnContinue|BtnConfirm|BtnNext|BtnClose|BtnFinish|BtnBack)$');
                    if (!hit) await delay(1000);
                    return false;
                }, 60000, `結算後無法回大廳（可按按鈕：${(await listButtons()).join(', ')}）`);
            }
            await requireLobby();
            rec.detail.returnedToLobby = true;
            return rec.detail;
        };
        await step('battle-to-settlement', (rec) => runBattle(rec), { skipIfFailed: true });

        // ── 6b. 轉蛋（排最後：返回大廳後底欄是否還在，本身就是檢查項）：切每個池子一次，切一輪後右欄節點不疊加 ──
        await step('gacha-pools', async (rec) => {
            await requireLobby();
            // 戰鬥返回後可能彈出開場禮包，先婉拒才不擋底欄
            await backToLobbyBar();
            // 線上回大廳後底欄按鈕要等一會才建好：先等「商城」鈕出現再點，並記下等了多久
            const dockT0 = Date.now();
            await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatShop$')), 30000, '回大廳 30 秒後底欄「商城」鈕仍未出現');
            rec.detail.dockReadyMs = Date.now() - dockT0;
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
                (rec.detail.stripOrder = rec.detail.stripOrder || []).push(await page.evaluate(() => {
                    const find = (n, name) => { if (n.name === name) return n; for (const c of n.children) { const r = find(c, name); if (r) return r; } return null; };
                    const chain = (n) => { const out = []; for (let c = n; c && c.parent; c = c.parent) out.unshift(`${c.name}#${c.getSiblingIndex()}`); return out.join('>'); };
                    const root = window.cc.director.getScene();
                    const strip = find(root, 'GachaWalletStrip'), portrait = find(root, 'GachaBannerPortrait');
                    return { strip: strip ? chain(strip) : null, portrait: portrait ? chain(portrait) : null };
                }));
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

        // ── 8. 老玩家重開 ──
        // 同一瀏覽器情境重新整理：存檔還在，等同玩家第二次開遊戲。
        // 要直接回到大廳、底欄在、不可再跑一次新手開場（PROG-2-9114）。
        await step('returning-player-reload', async (rec) => {
            const t0 = Date.now();
            await page.reload({ waitUntil: 'load', timeout: stuckMs });
            await waitUntil(() => page.evaluate(() => Boolean(window.cc && window.cc.director && window.cc.director.getScene())), stuckMs, '重開後引擎未就緒');
            await installHelpers();
            await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, '重開後未進入 LoginScene');
            await delay(Number(args['login-settle'] || 12000));
            await clickLoginStart();
            await waitUntil(async () => (await scene()) === 'LobbyScene', stuckMs, '重開後點開始未進入 LobbyScene');
            // 以「底欄出現且載入提示消失」為準；載入提示會晚一點才掛上，只看提示消失會誤判
            let lastTexts = [];
            const ready = await waitUntil(async () => {
                lastTexts = await page.evaluate((re) => window.__pt.textsMatching(re), '正在準備|載入中|Loading|啟動遇到問題');
                return lastTexts.length === 0 && (await page.evaluate(() => window.__pt.hasButton('^BtnCatShop$')));
            }, stuckMs, '').catch(() => false);
            rec.detail.lastLoadingTexts = lastTexts.slice(0, 4);
            await delay(2000);
            rec.detail.reloadToLobbyMs = Date.now() - t0;
            const opening = [];
            for (const name of openingSeq) {
                if (await page.evaluate((re) => window.__pt.hasButton(re), '^' + name + '$')) opening.push(name);
            }
            rec.detail.openingButtonsSeen = opening;
            rec.detail.lobbyBar = await page.evaluate(() => window.__pt.hasButton('^BtnCatShop$'));
            await page.screenshot({ path: path.join(outDir, '08-returning-lobby.png') });
            // PROG-2-9125 補驗：不可再彈「致你的一封信」；頂欄「推進一季」鈕的頁面座標必須在視窗內
            const letterTexts = await rm.texts('致你的一封信');
            rec.detail.openingLetterTexts = letterTexts;
            const advance = await rm.locate({ ucuf: 'lobby-hall-screen.back' });
            rec.detail.advanceButton = advance.found
                ? { ok: advance.ok, page: advance.page ? { x: Math.round(advance.page.x), y: Math.round(advance.page.y) } : null, blocker: advance.blocker || null }
                : { found: false };
            const problems = [];
            if (opening.length) problems.push('老玩家重開後又出現新手開場：' + opening.join(', '));
            if (letterTexts.length) problems.push(`老玩家重開後又出現開場信（畫面文字「${letterTexts[0]}」）`);
            if (!ready || !rec.detail.lobbyBar) problems.push('老玩家重開後大廳沒有準備好（底欄不在或仍在載入：' + lastTexts.slice(0, 2).join('／') + '）');
            if (!advance.found) {
                problems.push('找不到頂欄「推進一季」鈕（lobby-hall-screen.back）');
            } else if (!advance.page) {
                problems.push(`頂欄「推進一季」鈕算不出頁面座標：${advance.reason || '無尺寸'}`);
            } else if (advance.page.x < 0 || advance.page.y < 0 || advance.page.x > viewport.width || advance.page.y > viewport.height) {
                problems.push(`頂欄「推進一季」鈕不在視窗內：頁面座標 ${Math.round(advance.page.x)},${Math.round(advance.page.y)}，視窗 ${viewport.width}x${viewport.height}`);
            }
            if (problems.length) throw new Error(problems.join('；'));
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 9. 一年循環（--year，選用）：從目前季節起每季內政＋任務牆派將＋出征戰鬥＋抽卡／培育＋推進一季，直到第 1 年第 4 季結束（PROG-2-9141）──
        if (args.year) {
            const battlesPerSeason = Number(args['battles-per-season'] || 2);
            const yearReport = { tool: 'tools_node/playtest-online.js --year', startedAt: new Date().toISOString(), battlesPerSeason, quarters: [] };
            const writeYearReport = () => fs.writeFileSync(path.join(outDir, 'year-report.json'), JSON.stringify(yearReport, null, 2), 'utf8');
            /** 重新整理並登入回大廳（卡在無法恢復的畫面時的最後手段；存檔還在） */
            const reloadToLobby = async () => {
                await page.reload({ waitUntil: 'load', timeout: stuckMs });
                await waitUntil(() => page.evaluate(() => Boolean(window.cc && window.cc.director && window.cc.director.getScene())), stuckMs, '重整後引擎未就緒');
                await installHelpers();
                await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, '重整後未進入 LoginScene');
                await delay(Number(args['login-settle'] || 12000));
                await clickLoginStart();
                await waitUntil(async () => (await scene()) === 'LobbyScene', stuckMs, '重整後未進入 LobbyScene');
                await waitUntil(async () => (await page.evaluate((re) => window.__pt.textsMatching(re), '正在準備|載入中|Loading|啟動遇到問題')).length === 0 && (await page.evaluate(() => window.__pt.hasButton('^BtnCatShop$'))), stuckMs, '重整後大廳沒準備好');
            };
            /** 每個子步驟前的保險：不在大廳就想辦法回去，最後才重整 */
            const ensureLobby = async () => {
                for (let i = 0; i < 6 && (await scene()) !== 'LobbyScene'; i++) {
                    await clickByText('.*', '返回大廳');
                    await clickButton('^(GachaReturnToLobby|BtnBack|BtnClose|BtnCloseSortie|BtnBattleReviewClose|BtnReturnLobby|BtnConfirm)$');
                    await delay(1500);
                }
                if ((await scene()) !== 'LobbyScene') await reloadToLobby();
                await clickButton('^QuickSortieCancel$'); // 「選擇戰鬥模式」對話框殘留時關掉
                await clickButton('^BtnDupStarUp$'); // 重複抽卡三選一殘留時選「升星」
                if (await page.evaluate(() => window.__pt.scenePresence('^GachaPullResult_stage$'))) { await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2)); await delay(1500); }
                await clickByText('.*', '^\\s*再想想\\s*$'); // 「兵勢凶險」確認框殘留時按「再想想」
                await clickButton('^BtnScoutCancel$'); // 戰前偵查面板殘留時關掉
                await backToLobbyBar();
                await closeMissionLayers();
                await waitToastGone();
            };
            /** 戰鬥返回大廳後頂欄要過一會才重新讀到存檔數字（剛回來是 0）：等黃金不是 0 再讀 */
            const readTopbarSettled = async () => {
                for (let i = 0; i < 20; i++) { const t = await readTopbar(); if (t.gold > 0) return t; await delay(500); }
                return readTopbar();
            };
            const readSpans = async () => {
                const out = {};
                for (let i = 0; i <= 8; i++) {
                    const t = await rm.textOfNodeName(`LobbyHallScreen_span_${i}`);
                    if (t) out[`span_${i}`] = String(t);
                }
                return out;
            };
            const menuMapNow = async () => {
                const map = {};
                for (const cat of ['BtnCatShop', 'BtnCatGenerals', 'BtnCatSortie', 'BtnCatDomestic', 'BtnCatNurture']) {
                    if (!(await clickButton('^' + cat + '$'))) { map[cat] = null; continue; }
                    await delay(1200);
                    map[cat] = (await page.evaluate(() => window.__pt.buttonTexts('^BtnSub'))).map((b) => b.text);
                }
                await backToLobbyBar();
                return map;
            };
            /** 做 fn 前後的畫面文字差（新出現的文字），反應等待 waitMs */
            const withTextDiff = async (fn, waitMs = 1500) => {
                const before = new Set(await rm.allTexts());
                const result = await fn();
                await delay(waitMs);
                const added = (await rm.allTexts()).filter((t) => !before.has(t));
                return { result, added: Array.from(new Set(added)).slice(0, 25), toast: await rm.toastVisible() };
            };
            let prevMap = null;
            let lastOrdinal = null;
            let stalled = 0;
            let prevButtons = new Set();
            yearReport.startSeason = (await readSeason()).text;
            // 原 11 步裡已推進過的季（任務循環、推進一季）一併列入，湊成完整一年
            const stepByName = (n) => report.steps.find((x) => x.name === n);
            const loopStep = stepByName('lobby-mission-loop');
            const advStep = stepByName('lobby-advance-season');
            yearReport.baselineQuarters = [
                loopStep && { via: 'lobby-mission-loop（原第 6 步）', ok: loopStep.ok, popups: loopStep.detail.advances, reportTexts: (loopStep.detail.reportCaptures || []).map((c) => c.texts), topBefore: loopStep.detail.topBefore, topAfter: loopStep.detail.topAfterAdvance, wallHeadAfter: loopStep.detail.wallHeadAfterSettle },
                advStep && { via: 'lobby-advance-season（原第 7 步）', ok: advStep.ok, popups: (advStep.detail.popups || []).map((p) => p.kind), seasonBefore: advStep.detail.seasonBefore, seasonAfter: advStep.detail.seasonAfter },
            ].filter(Boolean);
            // 起點：目前季別；跑到「第 2 年春」（序數 8）為止，最多 6 季保險
            const endOrdinal = Number(args['year-end-ordinal'] || 8);
            for (let q = 0; q < 6; q++) {
                let cur = { text: null, ordinal: null };
                try { await ensureLobby(); cur = await readSeason(); } catch (e) { /* 讀不到季別也繼續記錄 */ }
                if (cur.ordinal !== null && cur.ordinal >= endOrdinal) break;
                if (cur.ordinal !== null && cur.ordinal === lastOrdinal && ++stalled >= 2) { yearReport.aborted = `季別連續 2 輪沒前進，停在 ${cur.text}`; break; }
                if (cur.ordinal !== lastOrdinal) stalled = 0;
                lastOrdinal = cur.ordinal;
                const tag = `yq${q + 1}`;
                const yq = { index: q + 1, season: cur.text, ordinal: cur.ordinal, steps: {}, battles: [], popups: [], errors: [] };
                yearReport.quarters.push(yq);
                /** 跑一個子步驟：包 step()，把結果存進 yq.steps */
                const ys = async (name, fn) => {
                    try { await ensureLobby(); } catch (e) { yq.errors.push(`ensureLobby 失敗(${name})：${String(e && e.message || e).split('\n')[0]}`); }
                    const ok = await step(`${tag}-${name}`, async (r) => fn(r));
                    const rec = report.steps[report.steps.length - 1];
                    yq.steps[name] = { ok, reason: rec.reason, screenshot: rec.screenshot, console: rec.console, pageErrors: rec.pageErrors, detail: rec.detail };
                    if (!ok) yq.errors.push(`${name}：${rec.reason}`);
                    return ok;
                };
                // 0. 季初快照：頂欄各欄、按鈕盤點與上一季的差異、太守府人口民心
                await ys('snapshot', async (rec) => {
                    rec.detail.season = cur.text;
                    rec.detail.topSpans = await readSpans();
                    rec.detail.topbar = await readTopbar();
                    rec.detail.wallHead = (await rm.textOfUcuf(WALL_LEFT)) || null;
                    const map = await menuMapNow();
                    rec.detail.menuMap = map;
                    rec.detail.newMenuEntries = [];
                    if (prevMap) {
                        for (const k of Object.keys(map)) for (const t of (map[k] || [])) if (!(prevMap[k] || []).includes(t)) rec.detail.newMenuEntries.push(`${k}:${t}`);
                    }
                    prevMap = map;
                    const btns = await listButtons();
                    rec.detail.newButtons = btns.filter((b) => !prevButtons.has(b));
                    prevButtons = new Set(btns);
                    try {
                        const opened = await openSub('BtnCatDomestic', '太守府');
                        if (opened) {
                            await delay(2000);
                            rec.detail.governorTexts = (await rm.allTexts()).filter((t) => /人口|民心|黃金|糧|等級|紅利|成長/.test(t)).slice(0, 30);
                            await shot(rec, 'governor');
                            // 太守府升級：每季試按一次「升級至 LvN」，記錄結果（資源夠不夠、有什麼變化）
                            const up = await withTextDiff(() => clickByText('.*', '^升級至'), 1500);
                            rec.detail.governorUpgrade = { clicked: Boolean(up.result), added: up.added, toast: up.toast, top: await readTopbar() };
                            if (up.result) await shot(rec, 'governor-upgrade');
                        } else rec.detail.governorTexts = null;
                    } catch (e) { rec.detail.governorError = String(e && e.message || e); }
                    yq.topBefore = rec.detail.topbar; yq.topSpans = rec.detail.topSpans; yq.governorTexts = rec.detail.governorTexts;
                    yq.newMenuEntries = rec.detail.newMenuEntries;
                    return rec.detail;
                });
                if (args.mind) await ys('mind', (rec) => mindBubbles(rec, 3));
                if (args.mind) await ys('mind-mailbox', (rec) => mindMailbox(rec, `year-${Date.now() % 100000}`));
                // 1. 內政：開「內政」面板，任選一個可按的內政任務
                await ys('domestic', async (rec) => {
                    const opened = await openSub('BtnCatDomestic', '^內政$');
                    if (!opened) throw new Error('底欄「內政」→「內政」打不開');
                    await delay(2000);
                    const buttons = await listButtons();
                    rec.detail.buttons = buttons;
                    rec.detail.panelTexts = (await rm.allTexts()).slice(0, 40);
                    await shot(rec, 'domestic-open');
                    const diff = await withTextDiff(() => clickButton('^btn(Farming|Commerce|Diplomacy|Arms|Scouting)$'));
                    rec.detail.clicked = diff.result;
                    rec.detail.added = diff.added;
                    rec.detail.toast = diff.toast;
                    await shot(rec, 'domestic-after');
                    if (!diff.result) throw new Error(`內政面板找不到可按的任務鈕（可按按鈕：${buttons.join(', ')}）`);
                    return rec.detail;
                });
                // 2. 任務牆：左牆第一張卡，開詳情窗、執行（派將）
                await ys('mission', async (rec) => {
                    await closeMissionLayers();
                    rec.detail.wallHead = (await rm.textOfUcuf(WALL_LEFT)) || '';
                    const { title } = await openFirstWallCard(rec);
                    rec.detail.missionTitle = title;
                    rec.detail.dialogTexts = ((await rm.textsUnder(MISSION_DIALOG)) || []).slice(0, 24);
                    await shot(rec, 'mission-detail');
                    rec.detail.topBefore = await readTopbar();
                    const diff = await withTextDiff(() => rm.click({ name: '^BtnExecute$', under: MISSION_DIALOG }, '執行'), 1800);
                    rec.detail.topAfter = await readTopbar();
                    rec.detail.added = diff.added; rec.detail.toast = diff.toast;
                    rec.detail.wallHeadAfter = (await rm.textOfUcuf(WALL_LEFT)) || '';
                    await closeMissionLayers();
                    return rec.detail;
                });
                // 2b. 內政牆（右牆）：接第一張內政任務（例如開倉賑濟貧民＝民心），第二位武將執行；情報不足時一樣直接執行
                await ys('mission-domestic', async (rec) => {
                    await closeMissionLayers();
                    rec.detail.wallHead = (await rm.textOfUcuf(WALL_RIGHT)) || '';
                    const { title } = await openFirstWallCard(rec, WALL_RIGHT);
                    rec.detail.missionTitle = title;
                    rec.detail.dialogTexts = ((await rm.textsUnder(MISSION_DIALOG)) || []).slice(0, 24);
                    await shot(rec, 'mission-domestic-detail');
                    rec.detail.topBefore = await readTopbar();
                    const diff = await withTextDiff(() => rm.click({ name: '^BtnExecute$', under: MISSION_DIALOG }, '執行'), 1800);
                    rec.detail.topAfter = await readTopbar();
                    rec.detail.added = diff.added; rec.detail.toast = diff.toast;
                    rec.detail.wallHeadAfter = (await rm.textOfUcuf(WALL_RIGHT)) || '';
                    await closeMissionLayers();
                    return rec.detail;
                });
                // 3. 戰鬥：每季 N 場，每場打到結算
                for (let b = 0; b < battlesPerSeason; b++) {
                    const okB = await ys(`battle${b + 1}`, async (rec) => {
                        rec.detail.topBefore = await readTopbar();
                        const d = await runBattle(rec, { shotTag: 'battle-settle', quick: b === 1 });
                        rec.detail.topAfter = await readTopbarSettled();
                        return d;
                    });
                    const brec = yq.steps[`battle${b + 1}`];
                    yq.battles.push({ ok: okB, result: brec.detail.result || null, reason: brec.reason, rounds: brec.detail.lastRound, ms: brec.detail.battleMs, topBefore: brec.detail.topBefore, topAfter: brec.detail.topAfter, screenshot: brec.screenshot });
                    if (!okB) break; // 一場失敗就不連打下一場，避免卡在壞狀態
                }
                // 4. 轉蛋：單抽一次（免費次數或資源足夠就會成功；結果畫面關掉）
                await ys('gacha', async (rec) => {
                    rec.detail.topBefore = await readTopbar();
                    const hit = await openSub('BtnCatShop', '^轉蛋$');
                    if (!hit) throw new Error('底欄「商店」→「轉蛋」打不開');
                    await delay(2500);
                    rec.detail.buttons = await listButtons();
                    rec.detail.wallet = (await rm.allTexts()).filter((t) => /免費|次|玉|券|鑽/.test(t)).slice(0, 20);
                    await shot(rec, 'gacha-open');
                    const diff = await withTextDiff(() => clickButton('^BtnPullSingle$'), 2500);
                    rec.detail.pulled = Boolean(diff.result);
                    rec.detail.added = diff.added; rec.detail.toast = diff.toast;
                    await shot(rec, 'gacha-after');
                    // 抽到已持有的武將會跳「宿命牽引・名將重逢」三選一（重複抽卡分流）：選「升星」；再關結果畫面
                    // 單抽結果畫面（GachaPullResult_stage）沒有關閉鈕，是「點畫面任一處」收掉：沒有鈕時點視窗中央
                    for (let i = 0; i < 8; i++) {
                        if (await clickButton('^BtnDupStarUp$')) { rec.detail.duplicateChoice = 'starUp'; await delay(1500); continue; }
                        if (await clickButton('^GachaPullResult_(close|back)$')) { await delay(1500); continue; }
                        if (!(await page.evaluate(() => window.__pt.scenePresence('^GachaPullResult_stage$')))) break;
                        await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
                        rec.detail.resultTapped = (rec.detail.resultTapped || 0) + 1;
                        await delay(1500);
                    }
                    rec.detail.walletAfter = (await rm.allTexts()).filter((t) => /靈玉|銅錢符|召喚券/.test(t)).slice(0, 5);
                    await clickButton('^GachaReturnToLobby$');
                    await delay(1500);
                    rec.detail.topAfter = await readTopbar();
                    if (!diff.result) throw new Error(`轉蛋畫面沒有可按的單抽鈕（可按按鈕：${rec.detail.buttons.join(', ')}）`);
                    return rec.detail;
                });
                // 5. 培育：開「開獎・培育」面板，記錄內容並嘗試點第一個可按的操作鈕
                await ys('nurture', async (rec) => {
                    const opened = await openSub('BtnCatNurture', '開獎');
                    if (!opened) throw new Error('底欄「培育」→「開獎・培育」打不開');
                    await delay(2500);
                    rec.detail.buttons = await listButtons();
                    rec.detail.panelTexts = (await rm.allTexts()).slice(0, 40);
                    await shot(rec, 'nurture-open');
                    const diff = await withTextDiff(() => clickButton('(Nurture|Train|Start|Roll|Reveal|Draw|Confirm|Next|Select|Choose|Child|Card|Row)'), 1800);
                    rec.detail.clicked = diff.result; rec.detail.added = diff.added; rec.detail.toast = diff.toast;
                    await shot(rec, 'nurture-after');
                    return rec.detail;
                });
                // 6. 推進一季；處理所有換季彈窗
                await ys('advance', async (rec) => {
                    rec.detail.seasonBefore = (await readSeason()).text;
                    rec.detail.topBefore = await readTopbar();
                    const reports = [];
                    const popupLog = [];
                    await rm.click({ ucuf: 'lobby-hall-screen.back' }, '右上「推進一季」');
                    const popups = await runSeasonPopups(rec, 'adv', reports, popupLog);
                    rec.detail.popups = popups.map((p) => p.kind);
                    rec.detail.popupTexts = popupLog;
                    yq.popups = popups.map((p) => p.kind);
                    yq.popupTexts = popupLog;
                    yq.reportTexts = reports.map((r) => r.texts);
                    await delay(1000);
                    let after = await readSeason();
                    for (let i = 0; i < 10 && after.ordinal === cur.ordinal; i++) { await delay(500); after = await readSeason(); }
                    rec.detail.seasonAfter = after.text;
                    rec.detail.topAfter = await readTopbar();
                    rec.detail.topSpansAfter = await readSpans();
                    await shot(rec, 'lobby-after');
                    yq.topAfter = rec.detail.topAfter; yq.topSpansAfter = rec.detail.topSpansAfter; yq.seasonAfter = after.text;
                    if (cur.ordinal !== null && after.ordinal !== cur.ordinal + 1) throw new Error(`季別沒有前進：「${cur.text}」→「${after.text || '讀不到'}」`);
                    return rec.detail;
                });
                writeYearReport();
                console.log(`[playtest] 年循環 ${yq.season} → ${yq.seasonAfter || '?'}：戰鬥 ${yq.battles.map((b) => b.result || (b.ok ? '?' : '失敗')).join('/') || '無'}；錯誤 ${yq.errors.length}`);
            }
            yearReport.finishedAt = new Date().toISOString();
            yearReport.endSeason = (await readSeason().catch(() => ({ text: null }))).text;
            writeYearReport();
        }

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
 * 主體節點名以 CharacterDs3Main 開頭；底板為 Ds3BloodlineTree。
 */
async function checkBloodlineBounds(page, viewport) {
    // 血統樹左區是執行期建在主體底下的 Ds3BloodlineTree（PROG-2-9041）；
    // TabBloodlineContent／CharacterDs3MainBloodlineRoot 是右欄 ContentSlot 的分頁內容（寬 560），不是血統樹（PROG-2-9105 核對）
    const candidates = ['^Ds3BloodlineTree$'];
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
