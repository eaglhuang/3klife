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
 * 已知環境錯誤（PROG-2-10014）：線上 HTTPS 網頁版連本機 NPC brain（POST http://127.0.0.1:8765/v1/npc/dialogue）
 * 會被 Chrome 本機網路存取檢查擋下，出現 ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS、ERR_FAILED、CORS loopback 三種錯誤。
 * 這屬預期環境錯誤，觸發點在大廳端（LobbyScene、AvatarTalkBubble），不是戰場。線上版不計入 console error，
 * 報告另列 knownEnvErrors，結尾輸出「已知環境錯誤：N 筆」；判斷函式 isKnownEnvError 在 playtest-year-summary.js。本機建置目錄（--dir）不套用白名單。
 * 【暫時性白名單】線上版本來應打 Render 中台、不該打 127.0.0.1，待線上版改打中台後移除此白名單（isKnownEnvError 與 knownEnvErrors）。
 * 白名單只認 127.0.0.1:8765 的 NPC 對話網址；打其他網址的 NPC 錯誤仍照常計入 console error，且「已知環境錯誤：N 筆」永遠另列、不隱藏。
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
 *   --opening-only 選用：只跑開機與新玩家開場兩步（量開場點擊數與秒數，PROG-2-10064）
 *   --skip-intro   選用：開場第一幕長卷改按右下「略過」（預設等它自動播完，PROG-2-10064）
 *   --rank-unlock  選用：官職晉升解鎖節奏（PROG-2-9151）：鎖頭按鈕、點鎖頭提示、晉升彈窗與晉升後解鎖
 *   --jade      選用：玉的用途（商店看玉、許願祭壇用玉買加速卡，PROG-2-9149）
 *   --year      選用：原步驟後接一年循環（每季內政／任務牆／戰鬥／抽卡／培育／推進一季），輸出 year-report.json（PROG-2-9141）
 *   --battles-per-season  --year 時每季出征場數（預設 2）
 *   --full-year  選用：隱含 --year；每季首場戰鬥試放計謀並逐季斷言（推進、玉／銀兩、放招、年終守城、換年），輸出 full-year-report.json，失敗列出哪一步與原因
 *   --skill-prefer <id>  --full-year 優先放的計謀（預設 tactic-fire-scheme，需 WINDY）；--min-casts <n> 整年最少放招次數（預設 1）
 *   --no-set-lead  --year 時不替玩家指定出戰主將（主將未定時戰場無出征帳本、自動代打不出兵，會打輸；用來重現）
 *   --no-tactic-probe  不做首戰計謀探針（預設首戰記錄天氣、試放一次計謀並量格子特效，輸出在 report.battles，PROG-2-10010）
 *   --battle-shots <毫秒>  戰鬥中每隔這麼久截一張 bt-<序號>.png（PROG-2-10072）
 *   --no-auto-play  戰鬥改逐回合手按結束回合（預設開場按一次「自動」走自動代打，PROG-2-9711）
 *   --academy   選用：學府實玩（PROG-2-9192）：推進到第 2 年第 1 季 → 入學潁川（核對入學令 −1）→ 36 回合 → 結業彈窗 → 回大廳；
 *               另在複製存檔的第二情境用 ?qaAcademy=11 驗快進入口。輸出 academy-report.json（回合數、打斷、評級、前後季數、節點數、
 *               apiCalls＝學府寫入呼叫共通 API 的次數，分 item／skill／reward／story／occupancy／save）與 ac-*.png 截圖。
 *               結業串接推季（PROG-2-9191）、打斷彈窗讀劇情資料（PROG-2-9190）未完成的部分記在報告 todo
 *
 *   --family-only 搭配 --family：只跑開場與家族步驟，其餘略過
 *   --family    配偶上場實玩（PROG-2-9582；需 --dir）：複製存檔到全新情境，網址 ?qaFamily=spouse／nursing 經共通 API 納入首子系統配偶，
 *               截出征選單與內政畫面（fam-*.png）並輸出 family-report.json；驗收：配偶在出征選單、哺乳中的母親不在但可當太守
 * 網址參數（QA 快進，不帶就完全不介入；只在本機 adapter 的 debug.fastForward 生效）：
 *   ?qaFamily=spouse|nursing   進大廳後經 family.enrollSpouse 納入首子系統配偶；nursing 再經 occupancy.acquire 進哺乳占用
 *   ?qaAcademy=<回合數 1~36>   進大廳後自動入學並連續訓練到已完成指定回合，停在下一回合的打斷點（11 → 第 12 回合期中打斷）
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
const { decideEndTurnAction } = require('./playtest-end-turn-fallback');
const { formatYearQuarterLine, formatFirstBattleLine, isKnownEnvError, evaluateFullYear } = require('./playtest-year-summary');

const projectRoot = path.resolve(__dirname, '..');
const DEFAULT_URL = 'https://eaglhuang.github.io/3klife-play/';
const DEFAULT_VIEWPORT = '1920x1080';
const DEFAULT_STUCK_MS = 120000;
const BATTLE_LIMIT_MS = 120000;
/** 首戰計謀探針的嘗試時間窗（PROG-2-10014）：從第一個可放招空檔起算，超過就不再試 */
const TACTIC_PROBE_WINDOW_MS = 60000;

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
        // 同源空白頁：不載遊戲，給 --academy 的 qa 第二情境先寫入 IndexedDB 用（PROG-2-9192）
        if (urlPath === '/__pt-blank.html') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end('<!doctype html><title>blank</title>');
            return;
        }
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
        /** 節點總數與作用中節點數（記憶體預算觀察用） */
        nodeCount: () => { let total = 0; let active = 0; walk(scene(), (node) => { total++; if (node.activeInHierarchy) active++; }); return { total, active }; },
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
        /**
         * 戰場狀態（唯讀）：讀 BattleScene 元件的 sceneContext 旗標與控制器判斷方法，不改遊戲狀態。
         * 回傳 null 表示畫面上找不到戰場。（PROG-2-9803）
         */
        battleState: () => {
            let comp = window.__ptBattleComp;
            if (!comp || !comp.sceneContext) {
                comp = null;
                walk(scene(), (node) => {
                    if (comp || !node.getComponent) return;
                    const found = node.getComponent('BattleScene');
                    if (found && found.sceneContext) comp = found;
                });
                window.__ptBattleComp = comp;
            }
            if (!comp) return null;
            const sc = comp.sceneContext;
            const ctrl = sc.ctrl || null;
            let canAdvance = null;
            try { canAdvance = ctrl ? Boolean(ctrl.canAdvanceBattleTurn()) : null; } catch (e) { canAdvance = null; }
            let thinking = false;
            if (sc.isAdvancingTurn) {
                walk(scene(), (node) => { if (!thinking && node.name === 'EnemyThinking' && node.activeInHierarchy) thinking = true; });
            }
            // 自動代打是否真的開啟（PROG-2-10072）：讀戰場橋接層旗標；x2 速度鈕亮起（UIOpacity 180）＝目前為 x2
            const bridge = comp.battleUIBridge || null;
            let speedX2 = null;
            walk(scene(), (node) => {
                if (speedX2 !== null || node.name !== 'BtnSpeed' || !node.activeInHierarchy) return;
                const op = node.getComponent && node.getComponent('cc.UIOpacity');
                speedX2 = Boolean(op && op.opacity === 180);
            });
            return {
                autoPlay: Boolean(bridge && bridge.isAutoPlayActive),
                speedX2,
                advancing: Boolean(sc.isAdvancingTurn),
                duelPanel: Boolean(sc.isDuelPanelActive),
                ultCutin: Boolean(sc.isUltCutinActive),
                waitingDuel: Boolean(ctrl && ctrl.isWaitingDuelPlacement),
                battleEnded: Boolean(ctrl && ctrl.state && ctrl.state.battleEndAnnounced),
                weather: ctrl && ctrl.state ? String(ctrl.state.weather) : null,
                canAdvance,
                thinking,
            };
        },
        /**
         * 首戰計謀探針（PROG-2-10010）：試放一次計謀並量格子特效。
         * 候選順序：preferId（火計）→ 我方戰法槽；先查施放條件（例如火計要 WINDY），不符的跳過並記下；
         * 第一個條件達成、點數夠、施放成功的算數。回傳 ok/reason/tacticId/fallbackFrom 與格子特效量測：
         *   hooks＝TacticVfxHooks 格子 hook 派發次數增量（tacticGridVfxStats）；nodes＝施放後 0.15／0.6 秒兩次取樣中，火焰／粒子類啟用節點數相對施放前的最大增量。
         * 只呼叫既有控制器 API，不改遊戲規則；controller 找不到時 reason 為 NO_BATTLE。
         */
        castTacticProbe: async (preferId) => {
            const st = window.__pt.battleState();
            const comp = window.__ptBattleComp;
            const ctrl = comp && comp.sceneContext ? comp.sceneContext.ctrl : null;
            if (!st || !ctrl) return { ok: false, reason: 'NO_BATTLE', weather: st ? st.weather : null };
            const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts').catch(() => null);
            const vfx = await window.System.import('chunks:///_virtual/TacticVfxHooks.ts').catch(() => null);
            const hookTotal = () => (vfx && vfx.tacticGridVfxStats ? vfx.tacticGridVfxStats['grid-fire'] + vfx.tacticGridVfxStats['grid-water-ripple'] : null);
            const fxNodeCount = () => { let n = 0; walk(scene(), (node) => { if (node.activeInHierarchy && /cfxr|^p3d_|fire|flame|bubble|vfx/i.test(node.name)) n++; }); return n; };
            const out = { ok: false, reason: null, weather: String(ctrl.state.weather), tacticId: null, battleSkillId: null, fallbackFrom: null, skipped: [], inSlots: null, hooks: null, nodes: null, nodesBefore: null, slots: [] };
            const general = ctrl.state.playerGeneral;
            const slots = ((general && general.tacticSlots) || []).map((x) => x.tacticId).filter(Boolean);
            out.slots = slots;
            // 場上診斷（PROG-2-10014）：施放被擋時，區分「沒有存活敵軍」「我方全員滿血（補血沒對象）」「SP／TP 不足」
            const livingOf = (faction) => Array.from(ctrl.state.units.values()).filter((u) => u.faction === faction && u.currentHp > 0);
            const woundedOf = (units) => units.filter((u) => { try { return u.currentHp < u.getEffectiveMaxHp(); } catch (e) { return false; } }).length;
            const snapshotField = () => {
                const enemies = livingOf('enemy');
                const allies = livingOf('player');
                return { enemyAlive: enemies.length, allyAlive: allies.length, allyWounded: woundedOf(allies), sp: general ? general.currentSp : null, maxSp: general ? general.maxSp : null };
            };
            out.field = snapshotField();
            // 火計要有存活敵軍才有目標：場上沒敵軍就不試放（避免白白落空），由呼叫端等到敵軍出現再試
            if (out.field.enemyAlive === 0) { out.reason = 'NO_ENEMY_ALIVE（場上沒有存活敵軍，未試放；我方受傷 ' + out.field.allyWounded + '/' + out.field.allyAlive + '、SP ' + out.field.sp + '/' + out.field.maxSp + '）'; out.noEnemy = true; return out; }
            if (!ctrl.canUsePlayerSkills()) { out.reason = 'NOT_PLAYER_PHASE（現在不是我方可放招的階段）'; return out; }
            const candidates = [];
            if (preferId) candidates.push(preferId);
            for (const id of slots) if (!candidates.includes(id)) candidates.push(id);
            const defs = ctrl.tacticDefinitionMap;
            const hooksBefore = hookTotal();
            const nodesBefore = fxNodeCount();
            for (const id of candidates) {
                const def = defs && defs.get ? defs.get(id) : null;
                if (!def || !def.battleSkillId) { out.skipped.push({ id, why: 'NO_DEFINITION' }); continue; }
                const unmet = ctrl.skillDispatcher.findUnmetGeneralTacticCondition('player', id);
                if (unmet) { out.skipped.push({ id, why: 'CONDITION_UNMET', condition: unmet }); continue; }
                const tp = ctrl.getPlayerTacticPointState({ tacticId: id });
                out.tp = tp ? { current: tp.current, max: tp.max, enabled: tp.enabled } : null;
                if (!ctrl.canAffordTactic(id)) { out.skipped.push({ id, why: 'TP_SHORT（計謀點 ' + (tp ? tp.current + '/' + tp.max : '?') + '）' }); continue; }
                if (ctrl.seedTacticNeedsSp() && general && !general.canUseSkill()) { out.skipped.push({ id, why: 'SP_NOT_FULL（' + general.currentSp + '/' + general.maxSp + '）' }); continue; }
                let applied = false;
                // 攔下結算器回傳，取得 blockedReason（探針只有布林看不到原因）；施放後立刻還原
                const dispatcher = ctrl.skillDispatcher;
                const origSeed = dispatcher.dispatchSeedTactic;
                let lastResult = null;
                dispatcher.dispatchSeedTactic = function (...args) { lastResult = origSeed.apply(this, args); return lastResult; };
                try { applied = Boolean(ctrl.triggerPlayerBattleSkill(def.battleSkillId, 'seed-tactic', { targetMode: def.targetMode, tacticId: id })); } catch (e) { dispatcher.dispatchSeedTactic = origSeed; out.skipped.push({ id, why: 'THROW:' + String(e && e.message || e) }); continue; }
                dispatcher.dispatchSeedTactic = origSeed;
                if (!applied) {
                    const f = snapshotField();
                    const blocked = lastResult && lastResult.blockedReason ? lastResult.blockedReason : null;
                    out.blockedReason = blocked;
                    out.skipped.push({ id, why: 'CAST_NOT_APPLIED（存活敵軍 ' + f.enemyAlive + '、我方受傷 ' + f.allyWounded + '/' + f.allyAlive + '、SP ' + f.sp + '/' + f.maxSp + '、TP ' + (tp && Number.isFinite(tp.current) ? tp.current + '/' + tp.max : '免扣') + '、blockedReason ' + (blocked || '無') + '）' });
                    continue;
                }
                out.ok = true;
                out.tacticId = id;
                out.battleSkillId = def.battleSkillId;
                out.inSlots = slots.includes(id);
                break;
            }
            if (!out.ok) {
                out.reason = out.skipped.length ? out.skipped.map((x) => x.id + ':' + x.why).join('；') : 'NO_CANDIDATE（戰法槽沒有計謀）';
                return out;
            }
            if (preferId && out.tacticId !== preferId) {
                out.fallbackFrom = preferId;
                const pk = out.skipped.find((x) => x.id === preferId);
                out.fallbackReason = pk ? pk.why : 'NOT_TRIED';
            }
            let peak = 0;
            for (const ms of [150, 450]) {
                await new Promise((r) => setTimeout(r, ms));
                peak = Math.max(peak, fxNodeCount() - nodesBefore);
            }
            const hooksAfter = hookTotal();
            out.nodesBefore = nodesBefore;
            out.nodes = Math.max(0, peak);
            out.hooks = hooksBefore === null || hooksAfter === null ? null : hooksAfter - hooksBefore;
            return out;
        },
        /**
         * 委任放招計數（PROG-2-10074）：包住控制器的 runDelegateSkillPhase，逐次記回合、奧義／計謀是否放出與當下 SP／計謀點。
         * 每個控制器只包一次；委任未開（delegateQuality 為空）時 delegating 為 false，用來確認自動代打真的開啟。
         */
        hookDelegateCasts: () => {
            const comp = window.__ptBattleComp;
            const ctrl = comp && comp.sceneContext ? comp.sceneContext.ctrl : null;
            if (!ctrl || typeof ctrl.runDelegateSkillPhase !== 'function') return false;
            if (ctrl.__ptCastHooked) return true;
            const orig = ctrl.runDelegateSkillPhase.bind(ctrl);
            window.__ptCasts = [];
            ctrl.runDelegateSkillPhase = () => {
                const g = ctrl.state && ctrl.state.playerGeneral;
                let tp = null;
                try { tp = ctrl.getPlayerTacticPointState(); } catch (e) { tp = null; }
                const res = orig();
                window.__ptCasts.push({ round: window.__ptRound, ultimate: Boolean(res && res.ultimate), tactic: Boolean(res && res.tactic), sp: g ? g.currentSp : null, tp: tp ? tp.current : null, delegating: Boolean(ctrl.delegateQuality), t: Math.round(performance.now()) });
                return res;
            };
            ctrl.__ptCastHooked = true;
            return true;
        },
        /** 放招彙整：呼叫次數、奧義／計謀放出次數、第一招出現在第幾回合 */
        castSummary: () => {
            const calls = window.__ptCasts || [];
            const hit = calls.filter((c) => c.ultimate || c.tactic);
            return {
                calls: calls.length,
                ultimateCount: calls.filter((c) => c.ultimate).length,
                tacticCount: calls.filter((c) => c.tactic).length,
                castTotal: calls.filter((c) => c.ultimate).length + calls.filter((c) => c.tactic).length,
                firstCastRound: hit.length ? hit[0].round : null,
                delegating: calls.length ? calls[calls.length - 1].delegating : null,
                log: calls,
            };
        },
        /**
         * 每回合各段演出實測秒數取樣器（PROG-2-9803）：每 50ms 讀一次 battleState，
         * 把狀態切成連續區段：idle＝我方可操作、advance＝回合推進中、enemyThinking＝敵軍思考中、duel＝單挑、ult＝奧義演出。
         * 每段記起迄時間與所屬回合（window.__ptRound 由 QA 迴圈更新）。
         */
        startTimingSampler: () => {
            if (window.__ptSampler) clearInterval(window.__ptSampler);
            window.__ptRuns = [];
            window.__ptRound = -1;
            window.__ptCur = null;
            window.__ptSampler = setInterval(() => {
                const st = window.__pt.battleState();
                const label = !st ? 'unknown' : st.ultCutin ? 'ult' : st.duelPanel ? 'duel' : st.advancing ? (st.thinking ? 'enemyThinking' : 'advance') : 'idle';
                const now = performance.now();
                const round = window.__ptRound;
                const cur = window.__ptCur;
                if (!cur || cur.label !== label || cur.round !== round) {
                    if (cur) cur.end = now;
                    const next = { label, round, start: now, end: now };
                    window.__ptCur = next;
                    window.__ptRuns.push(next);
                } else {
                    cur.end = now;
                }
            }, 50);
        },
        stopTimingSampler: () => {
            if (window.__ptSampler) clearInterval(window.__ptSampler);
            window.__ptSampler = null;
        },
        /** 取樣器彙整：byLabel＝各段總毫秒；byRound＝每回合各段毫秒；runs＝逐段明細 */
        timingSummary: () => {
            const runs = (window.__ptRuns || []).map((r) => ({ label: r.label, round: r.round, ms: Math.round(r.end - r.start) }));
            const byLabel = {};
            const byRound = {};
            for (const r of runs) {
                byLabel[r.label] = (byLabel[r.label] || 0) + r.ms;
                const key = String(r.round);
                byRound[key] = byRound[key] || {};
                byRound[key][r.label] = (byRound[key][r.label] || 0) + r.ms;
            }
            return { byLabel, byRound, runs };
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
    let perfProbe = null; // --perf：每步量 FPS／long task／heap／draw call／CPU 熱點（tools_node/perf-probe.js）
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
        /** 首戰探針結果（天氣、計謀施放、格子特效；PROG-2-10010） */
        battles: [],
        passed: false,
    };
    let browser = null;
    let context = null;
    let page = null;
    let stepIndex = 0;
    let exitCode = 1;
    let reachedLobby = false;
    let shuttingDown = false; // 收尾關瀏覽器時不再印框架卸除診斷

    /** 把 console error／pageerror／失敗請求收進 collector（主頁與 qa 第二情境共用） */
    function attachCollectors(p) {
        const isOnline = !staticServer; // 線上版才套用已知環境錯誤白名單（本機建置目錄連得到本機 NPC brain）
        p.on('console', (message) => {
            const text = message.text();
            if (message.type() !== 'error') return;
            if (DUPLICATE_RESOURCE_ERROR.test(text) || IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text))) return;
            collector.push(isOnline && isKnownEnvError(text) ? 'known-env-error' : 'console-error', text);
        });
        p.on('pageerror', (error) => collector.push('pageerror', (error && error.stack) || error));
        // 頁面生命週期診斷：頁面崩潰／關閉／主框架被換掉都會讓後續步驟連鎖報 detached Frame，先把原因印出來
        p.on('error', (error) => console.error(`[playtest] 頁面崩潰（renderer crash）：${(error && error.message) || error}`));
        p.on('framedetached', (frame) => { if (frame === p.mainFrame() && !shuttingDown) console.error(`[playtest] 主框架被卸除：${frame.url().slice(0, 120) || '(無網址)'}`); });
        p.on('requestfailed', (request) => {
            if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(request.url()))) return;
            const failedText = `${request.method()} ${request.url()} (${request.failure() && request.failure().errorText})`;
            collector.push(isOnline && isKnownEnvError(failedText) ? 'known-env-error' : 'request-failed', failedText);
        });
        p.on('response', (response) => {
            if (response.status() >= 400 && !IGNORED_CONSOLE_PATTERNS.some((re) => re.test(response.url()))) {
                collector.push('http-error', `${response.status()} ${response.url()}`);
            }
        });
    }

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
        // --family-only：只跑開場與家族步驟，其餘略過（配偶實玩單獨驗收用，省下整輪 10 分鐘）
        const skippedByFamilyOnly = args['opening-only']
            ? !/^(boot-login-lobby|new-player-opening)/.test(name)
            : Boolean(args['family-only']) && !/^(boot-login-lobby|new-player-opening|family-)/.test(name);
        const rec = { index: stepIndex, name, ok: false, durationMs: 0, screenshot: null, reason: null, detail: {}, console: [], pageErrors: [] };
        if (skippedByFamilyOnly) {
            rec.reason = '--family-only，略過';
            rec.skipped = true;
            report.steps.push(rec);
            emitStep(rec);
            return false;
        }
        if (skipIfFailed && !reachedLobby) {
            rec.reason = '前置步驟失敗，略過';
            rec.skipped = true;
            report.steps.push(rec);
            emitStep(rec);
            return false;
        }
        const from = collector.entries.length;
        const t0 = Date.now();
        if (perfProbe) await perfProbe.begin().catch(() => {});
        rm.takeBlocked(); // 清掉前一步殘留的「被擋住」紀錄
        if (await ensurePageAlive(`步驟 ${name} 開始前頁面已失效`)) rec.detail.pageRecovered = true;
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
        if (perfProbe) rec.perf = await perfProbe.end().catch(() => null);
        if (args.inject && page) rec.inject = await page.evaluate(() => (window.__injectReport ? window.__injectReport() : 'no-report')).catch((e) => 'ERR ' + e.message);
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
        // label 可給函式：失敗當下才取診斷字串（直接寫樣板字串會在等待「開始前」就取值，抓不到逾時當時的畫面）
        throw new Error(`逾時 ${Math.round(timeoutMs / 1000)} 秒：${typeof label === 'function' ? await label() : label}`);
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
    /** 等「開始遊戲」可按：先守最短沉澱時間（--login-settle，避免剛進 LoginScene 就點觸發開機 pageerror），再輪詢到字樣／BtnStart 出現，上限 stuckMs（冷載入畫面可能還停在「正在連動遊戲」） */
    const waitLoginStartReady = async () => {
        await delay(Number(args['login-settle'] || 12000));
        await waitUntil(
            () => page.evaluate(() => window.__pt.hasButton('^BtnStart$') || window.__pt.textsMatching('^\\s*開始遊戲\\s*$').length > 0),
            stuckMs,
            async () => `LoginScene 內未出現「開始遊戲」；畫面文字：${(await page.evaluate(() => window.__pt.textsMatching('.+')).catch(() => [])).slice(0, 4).join('|')}`
        );
    };
    const listButtons = () => page.evaluate(() => window.__pt.listButtons());
    /**
     * 年終頒獎典禮（PROG-2-10046）播放中：YearEndCeremonyHost 全螢幕吃輸入，首次不可跳過、三幕共約 23 秒，
     * 播完才露出「收下賞賜」（BtnYcClose）。這是設計上的擋，不是殘留：等它播完、真滑鼠點收下、等宿主收起。
     * 沒有典禮回傳 null；逾時（播完卻關不掉）才丟錯，這時才是真的殘留擋輸入。
     */
    const settleYearEndCeremony = async (maxMs = 70000) => {
        const active = () => page.evaluate(() => window.__pt.activeNodeNames('^YearEndCeremonyHost$').length > 0);
        if (!(await active())) return null;
        const t0 = Date.now();
        let claimed = false;
        // 觀禮武將（PROG-2-10106）：典禮前幾秒各留一張圖，驗大頭像列與台詞輪播（不影響流程）
        const crowdShots = [[1500, 'ceremony-crowd-1-avatars'], [4500, 'ceremony-crowd-2-line-rotate'], [7600, 'ceremony-crowd-3-line-rotate']];
        let crowdShotIndex = 0;
        while (Date.now() - t0 < maxMs) {
            if (crowdShotIndex < crowdShots.length && Date.now() - t0 >= crowdShots[crowdShotIndex][0]) {
                await page.screenshot({ path: path.join(outDir, `${crowdShots[crowdShotIndex][1]}.png`) }).catch(() => undefined);
                crowdShotIndex++;
            }
            if (!(await active())) return { claimed, waitedMs: Date.now() - t0 };
            if (await clickButton('^BtnYcClose$')) claimed = true;
            await delay(700);
        }
        throw new Error(`年終典禮 ${Math.round(maxMs / 1000)} 秒後宿主 YearEndCeremonyHost 仍作用中（${claimed ? '已按收下賞賜卻沒關' : '收下賞賜鈕一直沒出現'}），會擋住全部輸入`);
    };
    /** 把殘留的面板關掉，直到大廳底欄（BtnCatShop）回來；回傳是否成功 */
    const backToLobbyBar = async () => {
        await settleYearEndCeremony();
        const closers = '^(CharacterDs3Main_button_3|OpeningOfferDecline|GachaReturnToLobby|BtnBack|BtnScoutCancel|BtnNextTutorial|BtnRankUnlockOk|BtnClose\\w*)$';
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
        const hit = await clickByText('^BtnSub', textRe);
        if (hit) return hit;
        // 底欄分類鈕是開關：上一步（例如太守府尚未解鎖時按了鎖著的子選單）留下展開的子選單時，這一下會把它收起來；再按一次重新展開
        if (!(await clickButton('^' + cat + '$'))) return null;
        await delay(1200);
        return clickByText('^BtnSub', textRe);
    };

    /**
     * 頁面存活檢查與復原（PROG-2-10086）：整年實跑時 headless 分頁偶爾在長戰鬥後崩潰（renderer crash／主框架被換掉），
     * 之後每一步都報「Attempted to use detached Frame」連鎖失敗（11/26 發布後實跑 82 步只過 20 步）。
     * 存檔在同一個瀏覽器情境的 IndexedDB，所以在同情境開新分頁、重載登入就能回到大廳繼續（等同玩家重開網頁）。
     */
    const pageAlive = async () => {
        if (!page || page.isClosed()) return false;
        try { return (await Promise.race([page.evaluate(() => 1), delay(8000).then(() => 'timeout')])) === 1; } catch (_) { return false; }
    };
    const recoverPage = async (why) => {
        const t0 = Date.now();
        const dead = page;
        page = await context.newPage();
        await page.setViewport(viewport);
        attachCollectors(page);
        if (typeof args.inject === 'string') await page.evaluateOnNewDocument(fs.readFileSync(path.resolve(projectRoot, args.inject), 'utf8'));
        if (dead) await dead.close().catch(() => undefined);
        await page.goto(target, { waitUntil: 'load', timeout: stuckMs });
        await waitUntil(() => page.evaluate(() => Boolean(window.cc && window.cc.director && window.cc.director.getScene())), stuckMs, '頁面復原後引擎未就緒');
        await installHelpers();
        await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, '頁面復原後未進入 LoginScene');
        await waitLoginStartReady();
        await clickLoginStart();
        await waitUntil(async () => (await scene()) === 'LobbyScene', stuckMs, '頁面復原後未進入 LobbyScene');
        await waitUntil(async () => (await page.evaluate((re) => window.__pt.textsMatching(re), '正在準備|載入中|Loading|啟動遇到問題')).length === 0 && (await page.evaluate(() => window.__pt.hasButton('^BtnCatShop$'))), stuckMs, '頁面復原後大廳沒準備好');
        const rec = { atStep: stepIndex, why, ms: Date.now() - t0 };
        (report.pageRecoveries = report.pageRecoveries || []).push(rec);
        console.error(`[playtest] 頁面已復原（${why}，${rec.ms}ms）：新分頁重載登入回大廳`);
    };
    /** 步驟開始前呼叫：頁面死了就復原；復原失敗交給步驟自己失敗 */
    const ensurePageAlive = async (why) => {
        if (!reachedLobby || (await pageAlive())) return false;
        try { await recoverPage(why); return true; } catch (e) { console.error(`[playtest] 頁面復原失敗：${String((e && e.message) || e).split('\n')[0]}`); return false; }
    };

    try {
        browser = await puppeteer.launch({
            executablePath: browserPath,
            headless: true,
            defaultViewport: viewport,
            args: [...(args.gpu ? [] : ['--disable-gpu']), '--no-sandbox', '--disable-dev-shm-usage', '--disable-http-cache', '--allow-file-access-from-files'],
        });
        // 每次執行都是全新情境：沒有舊的 localStorage／IndexedDB／快取，等同新玩家
        context = await browser.createBrowserContext();
        page = await context.newPage();
        await page.setViewport(viewport);
        attachCollectors(page);
        // --inject <js>：每個文件載入前先執行的量測腳本（例如包 measureText 計數）
        if (typeof args.inject === 'string') await page.evaluateOnNewDocument(fs.readFileSync(path.resolve(projectRoot, args.inject), 'utf8'));
        if (args.perf) perfProbe = await require('./perf-probe').create(page);

        // ── 1. 開機 → LoginScene → 開始遊戲 → LobbyScene，等載入遮罩消失 ──
        const bootOk = await step('boot-login-lobby', async (rec) => {
            const bootT0 = Date.now();
            await page.goto(target, { waitUntil: 'load', timeout: stuckMs });
            await waitUntil(() => page.evaluate(() => Boolean(window.cc && window.cc.director && window.cc.director.getScene())), stuckMs, '引擎未就緒');
            await installHelpers();
            await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, '未進入 LoginScene');
            // 進 LoginScene 後等待再點開始（預設 12 秒：實測 LoginScene 出現後約 1 秒內點開始會觸發開機 pageerror，見 bug 卡；--login-settle 1000 可重現）
            await waitLoginStartReady();
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
        // 第一步失敗（進不了大廳）時直接中止，不再跑後續步驟（避免一串假失敗）
        if (!bootOk) {
            report.bootAbort = buildBootAbortReason(report.steps.find((x) => x.name === 'boot-login-lobby'));
            console.error(`[playtest] boot-abort：${report.bootAbort}`);
            throw new Error(`boot-abort：${report.bootAbort}`);
        }
        const requireLobby = async () => {
            if ((await scene()) !== 'LobbyScene') throw new Error('目前不在 LobbyScene（前一步未進大廳）');
        };

        // ── 2. 新玩家開場 ──
        // 現行開場（PROG-2-9104 核對）：介紹頁 → 信 → 六名將登場 → 宿命池 → 挑少年名將（PROG-2-9194，點第一位）→ 新手教學。
        // 宿命轉蛋 2026-11-12 起改為轉蛋系統的一池（PROG-2-2243），用十連結果畫面 GachaPullResult 顯示、
        // 單鍵確定（GachaPullResult_close）十位全收；舊的 BtnDestinyRoll／BtnDestinyConfirm／BtnFrame0 選將面板已不掛。
        // PROG-2-10064：第一幕改單頁自動長卷（BtnIntroNext 是右下「略過」，預設不點、等它自己播完；--skip-intro 才點）；
        // 六名將一頁亮相（BtnShowcaseNext 只按一次）；SSR 揭曉有「點擊畫面繼續」提示（RevealTapHint 出現就立刻點畫面）。
        const openingSeq = ['BtnCloseOpeningLetter', 'BtnShowcaseNext', 'GachaPullResult_close', 'BtnYouthPick0', 'BtnNextTutorial'];
        const skipIntro = Boolean(args['skip-intro']);
        await step('new-player-opening', async (rec) => {
            // 依規格順序點；BtnIntroNext 是多頁「繼續」（實測 IntroStep 1/4…），可重複點直到消失。
            // 若目前可按的是後面的步驟（實際順序與規格不同），就先點它並記在 outOfOrder，不當成失敗。
            const clicked = [];
            const outOfOrder = [];
            const done = new Set();
            const REPEATABLE = ['BtnNextTutorial']; // 多頁「繼續」鈕，可重複點直到消失（教學 3 頁）
            const openingT0 = Date.now();
            const clickLog = []; // 每次點擊的相對秒數與目標（點擊數與耗時的取證）
            const logClick = (what) => clickLog.push({ sec: Math.round((Date.now() - openingT0) / 100) / 10, what });
            const shot = new Set();
            const retries = {};
            const deadline = Date.now() + stuckMs;
            let idleSince = null;
            let missing = [];
            while (true) {
                const visible = await listButtons();
                const pending = openingSeq.filter((n) => !done.has(n) || REPEATABLE.includes(n));
                const hasIntro = visible.some((n) => REPEATABLE.includes(n));
                const candidates = pending.filter((n) => visible.includes(n));
                // 第一幕長卷自動播放中：預設不點、不算閒置，等它播完；--skip-intro 才按右下略過
                if (visible.includes('BtnIntroNext')) {
                    if (!shot.has('intro')) { shot.add('intro'); await delay(1500); await page.screenshot({ path: path.join(outDir, '02-opening-intro-scroll.png') }); }
                    if (skipIntro && await clickButton('^BtnIntroNext$')) { clicked.push('BtnIntroNext'); logClick('BtnIntroNext(略過)'); await delay(800); continue; }
                    idleSince = null;
                    await delay(400);
                    if (Date.now() > deadline) throw new Error(`開場超時（超過 ${Math.round(stuckMs / 1000)} 秒）；第一幕長卷沒有自動結束`);
                    continue;
                }
                // 全螢幕揭曉的「點擊畫面繼續」提示出現：像玩家一樣立刻點畫面，不必等閒置 5 秒
                if (!candidates.length && await page.evaluate(() => window.__pt.activeNodeNames('^RevealTapHint$').length > 0)) {
                    if (!shot.has('reveal')) { shot.add('reveal'); await page.screenshot({ path: path.join(outDir, '02-opening-ssr-reveal-hint.png') }); }
                    await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
                    rec.detail.screenTaps = (rec.detail.screenTaps || 0) + 1;
                    logClick('點畫面(SSR 揭曉)');
                    idleSince = null;
                    await delay(800);
                    continue;
                }
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
                        logClick('點畫面(閒置 5 秒後)');
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
                if (name === 'BtnYouthPick0') await page.screenshot({ path: path.join(outDir, '02a-youth-pick.png') });
                if (name === 'BtnShowcaseNext' && !shot.has('showcase')) { shot.add('showcase'); await delay(1500); await page.screenshot({ path: path.join(outDir, '02-opening-showcase-row.png') }); }
                const hit = await clickButton(`^${name}$`);
                if (hit) {
                    clicked.push(hit);
                    logClick(name);
                    done.add(name);
                    await delay(1200);
                }
                if (Date.now() > deadline) throw new Error(`開場超時（超過 ${Math.round(stuckMs / 1000)} 秒）；已完成 ${[...done].join('、')}`);
            }
            rec.detail.clicked = clicked;
            rec.detail.outOfOrder = Array.from(new Set(outOfOrder));
            rec.detail.retries = retries;
            rec.detail.clickedCount = clicked.length;
            // 開場點擊總數（按鈕＋點畫面）與耗時：稽核 B1 目標 ≤ 8 次、進大廳 ≤ 30 秒
            rec.detail.clickLog = clickLog;
            rec.detail.totalClicks = clickLog.length;
            rec.detail.openingMs = Date.now() - openingT0;
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
                // 官職晉升解鎖（PROG-2-9151）：新玩家的太守府是鎖頭按鈕，點了只會出現提示；鎖著就不開，並把最後展開的選單收起
                const hallLocked = (map.BtnCatDomestic || []).some((b) => /太守府/.test(b.text) && /🔒/.test(b.text));
                rec.detail.governorHallLocked = hallLocked;
                if (hallLocked) {
                    await clickButton('^BtnCatNurture$');
                    await delay(800);
                    return rec.detail;
                }
                const opened = await openSub('BtnCatDomestic', '^太守府'); // 鎖著的項目文字開頭是「🔒」，不會被點到（太守府郡守官階才開放）
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
            // 通用保險：浮層（詳情窗）關閉鈕沒收掉時，點它自己的全螢幕遮罩（OverlayMask）收窗，
            // 否則殘留的透明遮罩會擋住後面所有真滑鼠點擊（推進一季、底欄都點不到）
            for (let i = 0; i < 3 && (await rm.present({ name: MISSION_DIALOG })); i++) {
                if (!(await rm.tryClick({ name: '^OverlayMask$', under: MISSION_DIALOG }))) await page.keyboard.press('Escape');
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
            // 詳情窗是非同步載入：機器忙或幀率低時實測會超過 8 秒才開（PROG-2-9154），上限放寬到 30 秒並記下實際等了多久
            const openT0 = Date.now();
            const openDeadline = openT0 + 30000;
            while (!opened && Date.now() < openDeadline) {
                for (const t of await rm.allTexts()) if (!textsBefore.has(t)) newTexts.add(t);
                opened = await rm.present({ name: MISSION_DIALOG });
                if (!opened) await delay(300);
            }
            rec.detail.detailOpenMs = Date.now() - openT0;
            if (!opened) {
                const board = await rm.present({ name: '^HallBoardHost$' });
                throw new Error(`點左牆第一張任務卡「${title}」（${card.meta || '無副標'}；點擊 ${Math.round(clickedCard.page.x)},${Math.round(clickedCard.page.y)} 命中 ${clickedCard.name}）後 30 秒內沒有開出任務詳情窗；任務牆面板${board ? '有' : '沒有'}開；點擊後新出現的文字：${Array.from(newTexts).slice(0, 8).join(' / ') || '無'}`);
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
            // 任務回報卡一疊（PROG-2-9966）：換季後先出現、全螢幕吃點擊，會擋住後面所有步驟；有「全部略過」就按它，
            // 只剩最後一張（沒有略過鈕）就按「完成」。兩者都是普通節點（TOUCH_END），不是 cc.Button，所以不加 button
            { kind: 'mission-report-skip', specs: [{ name: '^Skip$', under: '^HallMissionReportStack$' }] },
            { kind: 'mission-report-done', specs: [{ name: '^Next$', under: '^HallMissionReportStack$' }] },
            // 官職晉升解鎖彈窗（PROG-2-9151）：升官時蓋住整個大廳，要先按「知道了」
            { kind: 'rank-unlock', specs: [{ name: '^BtnRankUnlockOk$' }] },
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
            const startedAt = Date.now();
            for (let i = 0; i < 30 && quiet < 2; i++) {
                await delay(1500);
                // 年終典禮全螢幕擋輸入且要播約 23 秒：先等它收下賞賜收起，再處理底下的年報（等待時間不計入 30 輪上限）
                const ceremony = await settleYearEndCeremony();
                if (ceremony) {
                    await shot(rec, `${shotTag}-${popups.length + 1}-year-end-ceremony`);
                    popups.push({ kind: 'year-end-ceremony', click: 'BtnYcClose', attempt: 1, waitedMs: ceremony.waitedMs });
                    quiet = 0; blockedStreak = 0;
                    continue;
                }
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
                    // 低幀率（合併後季事件與季報疊開時約 3 FPS）下，定位後彈窗可能剛好播完關閉動畫，找不到就當已關
                    // 定位後、點擊前官職晉升彈窗才蓋上來（結算升官時季報與晉升彈窗幾乎同時出現）也當作被擋住：不丟錯、不算處理過，
                    // 下一輪由 rank-unlock 規格去按「知道了」（PROG-2-9729）
                    let raced = false;
                    try { await rm.click(spec, popup.kind); } catch (e) {
                        const msg = String(e && e.message);
                        if (/真滑鼠點不到/.test(msg)) raced = true;
                        else if (!/找不到可點的節點/.test(msg)) throw e;
                    }
                    if (raced) { blockedSpec = blockedSpec || { popup, spec }; break; }
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
                    if (++blockedStreak >= (popupLog ? 8 : 3)) {
                        // 季報被官職晉升彈窗（RankUnlockPopupHost）蓋住時，真正該按的是它的「知道了」：先試它，再回頭點被擋的那個
                        const rankSpecs = [{ name: '^BtnRankUnlockOk$' }, { name: '.*', text: '^\\s*知道了\\s*$', under: '^RankUnlockPopupHost$', button: true }];
                        let cleared = null;
                        for (const rs of rankSpecs) { cleared = await rm.tryClick(rs); if (cleared) break; }
                        if (cleared) { popups.push({ kind: 'rank-unlock', click: cleared, attempt: 0 }); blockedStreak = 0; continue; }
                        await rm.click(blockedSpec.spec, blockedSpec.popup.kind);
                    }
                    continue;
                }
                blockedStreak = 0;
                // 換季後季報最慢要等幾秒才出：一個彈窗都還沒處理前，15 秒內不算安靜（機器忙時避免提早收工）
                if (popups.length === 0 && Date.now() - startedAt < 15000) continue;
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
            jade: readNum(await rm.textOfNodeName('LobbyHallScreen_span_2')),
            silver: readNum(await rm.textOfNodeName('LobbyHallScreen_silver_value')),
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
            // 完美獎勵那格永遠是 ???，旁邊附「情報 100 才會揭曉」說明（PROG-2-9152），不算遮蔽殘留
            const fogLeft = dialogNow.filter((t) => t.includes('???') && t.trim() !== '???' && !t.includes('情報 100 才會揭曉'));
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
            const statusTexts = await waitUntil(async () => { const t = await rm.texts('還有 \\d+ 季'); return t.length ? t : null; }, 6000, '').catch(() => []);
            rec.detail.wallHeadAfterDispatch = head1;
            rec.detail.activeStatusTexts = statusTexts;
            await shot(rec, 'loop-after-dispatch');
            if (!dispatched) throw new Error(`執行後頂欄糧草／兵源沒有同時減少（執行前 ${JSON.stringify(topNow)}，執行後 ${JSON.stringify(top1)}）`);
            if (!/進行中\s*\d+\s*件/.test(head1)) throw new Error(`執行後左牆牆頭沒有「進行中 N 件」：${head1}`);
            if (cards1.some((c) => String(c.title).includes(title))) throw new Error(`執行後「${title}」仍在左牆的未接取列上`);
            if (!statusTexts.length) throw new Error('執行後任務板上看不到「還有 N 季」的列狀態文字');
            const remain = Math.min(3, Math.max(1, ...statusTexts.map((t) => Number((/(?:還有|剩餘期限)\s*(\d+)\s*季/.exec(t) || [])[1]) || 1)));
            // 3b. 武將佔用：派出武將 A 之後，再開另一個任務，A 不可選、顯示「出任務中」、預設人物不是 A（用真滑鼠點）
            let busyName = (statusTexts.filter((t) => !/預計第|風險/.test(t)).map((t) => (/^([^\n・（\s]+)\s*\n\s*還有/.exec(t) || /・([^（\s]+)/.exec(t) || [])[1]).find((n) => n) || '').trim();
            // 任務牆下緣的進行中列在詳情窗開著時可能讀不到：退而讀詳情窗「行動人物」欄位（派出的就是他）
            if (!busyName) busyName = String((await rm.textOfNodeName('SelectedGeneralLabel')) || '').trim();
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
            for (let i = 0; i < 80 && !reachedBusyRow; i++) {
                const hit = await rm.locate({ name: '^GeneralOption_', text: busyName });
                // 命中檢查不看捲動遮罩：列在視窗內但被詳情窗底部遮住也會回 ok，所以另外要求列的畫面座標落在下拉可視範圍（約 y 200～800）
                if (hit && hit.found && hit.ok && hit.page && hit.page.y > 200 && hit.page.y < 800) { reachedBusyRow = true; break; }
                await page.mouse.move(960, 600);
                await page.mouse.wheel({ deltaY: 160 });
                await delay(250);
            }
            if (!reachedBusyRow) throw new Error(`滾輪捲了 80 次，「${busyName}」那列仍沒進到下拉可視範圍`);
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
                await rm.click({ ucuf: 'lobby-hall-screen.back' }, '右下「推進一季」');
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

        // ── 3b-3. 商業任務與銀兩（PROG-2-9611）：頂欄銀兩、內政牆商業任務報酬標示、派出、結算飄字與頂欄銀兩增加 ──
        await step('lobby-commerce-silver', async (rec) => {
            await requireLobby();
            await backToLobbyBar();
            await closeMissionLayers();
            await waitToastGone();
            const readSilver = async () => readNum(await rm.textOfNodeName('LobbyHallScreen_silver_value'));
            const silver0 = await readSilver();
            rec.detail.silverBefore = silver0;
            if (!(silver0 > 0)) throw new Error(`頂欄銀兩讀不到或為 0（${silver0}）`);
            await shot(rec, 'commerce-topbar-silver');
            const COMMERCE = /市集巡察|特產運銷|平抑物價/;
            let found = null;
            for (const wall of [WALL_LEFT, WALL_RIGHT]) {
                const cards = (await rm.wallCards(wall)) || [];
                const hit = cards.find((c) => COMMERCE.test(String(c.title || '')));
                if (hit) { found = { wall, card: hit }; break; }
            }
            if (!found) throw new Error('第一年內政牆找不到商業任務（市集巡察／特產運銷／平抑物價），保底失效');
            const title = String(found.card.title).trim();
            rec.detail.commerceTitle = title;
            await rm.click({ ucuf: found.wall, childIndex: found.card.childIndex }, `商業任務「${title}」`);
            await waitUntil(async () => (await rm.present({ name: MISSION_DIALOG })) || null, 30000, '商業任務詳情窗沒有開出');
            // 報酬列會依情報分層遮蔽：商業任務初始情報 45±10 落在 vague 分層，只顯示「量級：★」，情報 ≥ 60 才顯示
            // 「銀兩 N～M」，所以偶發失敗不是時機問題。流程：輪詢等報酬列渲染（出現「銀兩」或「量級：」），再用「再探」
            // （糧草 -50、情報 +35／+25／+15）把情報推到上限 90，一來報酬列現出「銀兩 數字」，二來成功率升到最高，
            // 降低派出後骰到失敗（失敗不發銀兩）而讓結算驗證偶發落空的機率。驗證強度不變。
            const SILVER_REWARD = /銀兩\s*\d+/;
            const readDialog = async () => (await rm.textsUnder(MISSION_DIALOG)) || [];
            const intelOf = (t) => { const k = t.indexOf('%'); return k > 0 ? Number(t[k - 1]) : NaN; };
            await waitUntil(async () => {
                const t = await readDialog();
                return t.some((x) => x.includes('銀兩') || x.includes('量級：')) ? t : null;
            }, 15000, async () => `商業任務詳情窗 15 秒內沒有渲染出報酬列（文字：${(await readDialog()).slice(0, 20).join(' / ')}）`);
            let dialogTexts = await readDialog();
            rec.detail.reconClicks = 0;
            while (rec.detail.reconClicks < 3 && !(intelOf(dialogTexts) >= 90)) {
                await waitToastGone();
                const before = intelOf(dialogTexts);
                await rm.click({ name: '^BtnScout$', under: MISSION_DIALOG }, '再探');
                rec.detail.reconClicks += 1;
                dialogTexts = await waitUntil(async () => {
                    const t = await readDialog();
                    return intelOf(t) > before ? t : null;
                }, 6000, '').catch(async () => readDialog());
            }
            rec.detail.commerceDialog = dialogTexts.slice(0, 24);
            await shot(rec, 'commerce-detail-reward');
            if (!dialogTexts.some((t) => SILVER_REWARD.test(t))) throw new Error(`商業任務詳情窗沒有「銀兩」報酬標示（再探 ${rec.detail.reconClicks} 次後；文字：${dialogTexts.slice(0, 20).join(' / ')}）`);
            await waitToastGone();
            await rm.click({ name: '^BtnExecute$', under: MISSION_DIALOG }, '執行商業任務');
            const statusTexts = await waitUntil(async () => { const t = await rm.texts('還有 \\d+ 季'); return t.length ? t : null; }, 8000, '').catch(() => []);
            rec.detail.activeStatusTexts = statusTexts;
            await shot(rec, 'commerce-after-dispatch');
            if (!statusTexts.length) throw new Error('派出商業任務後任務板看不到「還有 N 季」');
            await closeMissionLayers();
            await waitToastGone();
            const remain = Math.min(3, Math.max(1, ...statusTexts.map((t) => Number((/(?:還有|剩餘期限)\s*(\d+)\s*季/.exec(t) || [])[1]) || 1)));
            const reports = [];
            for (let i = 0; i < remain; i++) {
                await requireLobby();
                await backToLobbyBar();
                await closeMissionLayers();
                await rm.click({ ucuf: 'lobby-hall-screen.back' }, '右下「推進一季」');
                await runSeasonPopups(rec, `commerce-advance${i + 1}`, reports);
            }
            const hallReport = reports.find((r) => (r.texts || []).some((t) => t.includes('大廳任務')));
            if (!hallReport) throw new Error('推進後季度結算沒有「大廳任務」區塊');
            const block = (hallReport.texts || []).join('\n');
            rec.detail.settleBlock = block.slice(0, 400);
            if (!/銀兩\s*\+\s*\d+/.test(block)) throw new Error(`結算飄字／區塊沒有「銀兩 +N」：${block.slice(0, 300)}`);
            const silver1 = await readSilver();
            rec.detail.silverAfter = silver1;
            if (!(silver1 > silver0)) throw new Error(`結算後頂欄銀兩沒有增加（${silver0} → ${silver1}）`);
            await shot(rec, 'commerce-topbar-silver-after');
            return rec.detail;
        }, { skipIfFailed: true });

        await step('lobby-advance-season', async (rec) => {
            await requireLobby();
            await backToLobbyBar();
            await closeMissionLayers();
            const before = await readSeason();
            rec.detail.seasonBefore = before.text;
            if (before.ordinal === null) throw new Error(`頂欄讀不到季別（lobby-hall-screen.hall-time 文字：${before.text || '無'}）`);
            // PROG-2-9953：推進一季鈕在右下角（手機拇指位置），且與底欄／世家面板／信箱入口／許願祭壇不重疊
            rec.detail.bottomRight = await page.evaluate(() => {
                const find = (pred) => { let hit = null; const walk = (n) => { if (hit || !n.activeInHierarchy) return; if (pred(n)) { hit = n; return; } n.children.forEach(walk); }; walk(window.cc.director.getScene()); return hit; };
                const rect = (n) => { const t = n && n.getComponent('cc.UITransform'); if (!t) return null; const r = t.getBoundingBoxToWorld(); return { l: Math.round(r.x), b: Math.round(r.y), r: Math.round(r.x + r.width), t: Math.round(r.y + r.height) }; };
                const ids = { back: 'lobby-hall-screen.back', dock: 'lobby-hall-screen.dock', clan: 'lobby-hall-screen.clan', altar: 'lobby-hall-screen.altar' };
                const out = {};
                for (const k of Object.keys(ids)) out[k] = rect(find((n) => n._ucufId === ids[k]));
                out.mailbox = rect(find((n) => n.name === 'BtnMindMailbox'));
                const hit = (a, b) => !!a && !!b && a.l < b.r && b.l < a.r && a.b < b.t && b.b < a.t;
                out.overlaps = Object.keys(out).filter((k) => k !== 'back' && hit(out.back, out[k]));
                out.mailboxOverlaps = Object.keys(out).filter((k) => k !== 'mailbox' && k !== 'overlaps' && hit(out.mailbox, out[k]));
                return out;
            });
            await shot(rec, 'lobby-bottom-right');
            if (rec.detail.bottomRight.overlaps.length) throw new Error(`推進一季鈕與 ${rec.detail.bottomRight.overlaps.join('、')} 重疊`);
            await rm.click({ ucuf: 'lobby-hall-screen.back' }, '右下「推進一季」');
            const popups = (rec.detail.popups = await runSeasonPopups(rec, 'popup'));
            await delay(1000);
            // 驗證 1：頂欄季別前進一季（最多等 5 秒讓畫面刷新）
            let after = await readSeason();
            for (let i = 0; i < 10 && after.ordinal === before.ordinal; i++) { await delay(500); after = await readSeason(); }
            rec.detail.seasonAfter = after.text;
            if (after.ordinal !== before.ordinal + 1) throw new Error(`頂欄季別沒有前進一季：點之前「${before.text}」，彈窗全關後「${after.text || '讀不到'}」`);
            // 驗證 2：沒有顯示中的彈窗宿主、沒有 __ui-backdrop 壓在大廳之上
            const leftovers = await page.evaluate(() => window.__pt.activeNodeNames('^(SeasonReportComposite|SeasonEventHost|SeasonChronicleHost|YearReportHost|YearEndCeremonyHost)$'));
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

        // ── 3d. 季報紀要信箱（PROG-2-10068）：前 2 季任務回報與市井奇遇進信箱；有未讀紀要時入口要有紅點、點開看得到「季報紀要」列；第 3 季起不寫紀要則略過 ──
        await step('lobby-season-digest-mailbox', async (rec) => {
            await requireLobby();
            await backToLobbyBar();
            await closeMissionLayers();
            await waitToastGone();
            const state = await page.evaluate(() => {
                let entry = null; let dot = null;
                const walk = (n) => { if (n.name === 'BtnMindMailbox' && n.activeInHierarchy) { entry = n; const d = n.getChildByName('UnreadDot'); dot = d ? d.active : null; } n.children.forEach(walk); };
                walk(window.cc.director.getScene());
                return { entry: !!entry, dotActive: dot };
            });
            rec.detail.mailbox = state;
            if (!state.entry) { rec.detail.note = '信箱入口不在（沒有待辦也沒有紀要），略過'; return rec.detail; }
            await shot(rec, 'digest-entry');
            await rm.click({ name: '^BtnMindMailbox$' }, '信箱入口');
            await delay(800);
            const texts = (await rm.textsUnder('^MindMailboxPanel$')) || [];
            rec.detail.panelTexts = texts.slice(0, 12);
            await shot(rec, 'digest-panel');
            const hasDigest = texts.some((t) => /季報紀要/.test(t));
            rec.detail.hasDigestRow = hasDigest;
            await rm.tryClick({ name: '^BtnMindClose$' });
            await delay(500);
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
        // ── 玉的一年內用途（PROG-2-9149，--jade）：商店看玉餘額，許願祭壇許願後點進行中插槽，用玉買加速卡縮短時間 ──
        if (args.jade) {
            await step('jade-use', async (rec) => {
                rec.detail.topBefore = await readTopbar();
                rec.detail.gemTextsBefore = (await rm.allTexts()).filter((t) => /^[0-9,]{3,7}$/.test(t)).slice(0, 8);
                const shopOpened = await openSub('BtnCatShop', '^商店$');
                rec.detail.shopOpened = Boolean(shopOpened);
                await delay(2500);
                await shot(rec, 'jade-shop');
                await backToLobbyBar();
                await delay(800);
                const altar = await rm.tryClick({ ucuf: 'lobby-hall-screen.altar' });
                rec.detail.altarOpened = Boolean(altar);
                await delay(2000);
                rec.detail.altarButtons = await listButtons();
                await shot(rec, 'jade-altar-open');
                rec.detail.wished = await clickButton('^btnWish$');
                await delay(1200);
                rec.detail.slotTapped = await clickButton('^waSlot0$');
                await delay(1200);
                rec.detail.altarTexts = (await rm.allTexts()).filter((t) => /玉|加速|縮短|許願|剩/.test(t)).slice(0, 20);
                await shot(rec, 'jade-altar-speedup');
                rec.detail.gemTextsAfter = (await rm.allTexts()).filter((t) => /^[0-9,]{3,7}$/.test(t)).slice(0, 8);
                if (!rec.detail.altarOpened) throw new Error(`找不到許願祭壇入口（可按按鈕：${(await listButtons()).join(', ')}）`);
                return rec.detail;
            }, { skipIfFailed: true });
        }
        if (args.mind) await step('lobby-mind-bubbles', (rec) => mindBubbles(rec, 4), { skipIfFailed: true });

        // ── 武將信箱（PROG-2-9150，--mind）：開右上「信箱」→ 截圖請求內容 → 真滑鼠按第一封的「准／寬慰／採納」→ 截圖武將反應句 → 關閉 ──
        const mindMailbox = async (rec, tag) => {
            await requireLobby();
            await injectMindQa(rec);
            await backToLobbyBar();
            await closeMissionLayers();
            const opened = await rm.tryClick({ name: '^BtnMindMailbox$', button: true });
            if (!opened) {
                rec.detail.state = await page.evaluate(() => { let r = null; const walk = (node) => { for (const c of node.components) if (c && c.qaMindState) r = c.qaMindState(); for (const ch of node.children) walk(ch); }; walk(window.cc.director.getScene()); return r; });
                rec.detail.locate = await rm.locate({ name: '^BtnMindMailbox$', button: true }).catch((e) => String(e));
                await shot(rec, `mind-mailbox-${tag}-missing`);
                rec.detail.mailbox = '大廳沒有信箱入口（本季沒有任何武將來信）';
                return rec.detail;
            }
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

        // ── 5z. 頭像點擊說話（--avatar-talk，PROG-2-9885）：大廳主將頭像、招賢館卡、名冊列頭像，真滑鼠點後驗泡泡位置與是否壓到按鈕 ──
        const avatarTalk = args['avatar-talk'] ? require('./playtest-avatar-talk') : null;
        const avatarProbe = async (rec, label, spec, tag) => {
            const r = await avatarTalk.tapAvatarAndProbe({ page, rm, spec, waitMs: 600, shotTo: async () => { await shot(rec, tag); } });
            (rec.detail.avatarTalk = rec.detail.avatarTalk || {})[label] = r;
            return r;
        };
        if (avatarTalk) await step('avatar-talk-lobby', async (rec) => {
            await backToLobbyBar();
            await delay(800);
            await avatarProbe(rec, 'lordAvatar', { name: '^(LordAvatarMask|LordAvatar|LordAvatarSprite)$' }, 'avatar-talk-lord');
            await delay(3800);
            await clickButton('^BtnCatShop$'); await delay(600); // 收掉上一步留下的子選單
            if ((await openSub('BtnCatDomestic', '^招賢館')) || (await openSub('BtnCatDomestic', '^招賢館'))) {
                await delay(2500);
                await avatarProbe(rec, 'recruitHall', { name: '^Frame2Mask$' }, 'avatar-talk-recruit');
                await delay(3800);
                await backToLobbyBar();
            } else {
                rec.detail.recruitHall = '找不到招賢館入口';
                rec.detail.subTexts = (await page.evaluate(() => window.__pt.buttonTexts('^BtnSub'))).map((t) => t.text);
            }
            return rec.detail;
        }, { skipIfFailed: true });

        await step('character-intro-tabs', async (rec) => {
            // 關掉轉蛋等面板回到大廳主畫面，再開武將名冊
            await backToLobbyBar();
            await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatGenerals$')), 30000, async () => `回大廳後沒有底欄按鈕（場景 ${await scene()}；節點 ${(await page.evaluate(() => window.__pt.dumpBtnLike())).join(', ')}）`);
            rec.detail.rosterEntry = '底欄「武將」→「武將名冊」';
            if (!(await openSub('BtnCatGenerals', '武將名冊'))) throw new Error(`找不到「武將 → 武將名冊」入口（可按按鈕：${(await listButtons()).join(', ')}）`);
            await delay(2500);
            rec.detail.buttonsAfterOpen = await listButtons();
            const firstCard = await waitUntil(() => page.evaluate(() => window.__pt.listButtons()).then((list) => list.find((n) => n === 'Row') || list.find((n) => /^(BtnGeneral\d*|BtnGeneralCard\d*|GeneralCard\d*|BtnCard0|BtnHero0)$/i.test(n)) || null), 30000, '名冊中找不到第一位武將');
            rec.detail.firstCard = firstCard;
            if (avatarTalk) { await avatarProbe(rec, 'rosterRowAvatar', { name: '^(RowAvatar|Avatar|AvatarSprite)$', under: '^Row$' }, 'avatar-talk-roster'); await delay(200); }
            // 名冊是回收列池（約 13 列）：locate 預設由最上層（前序最後一列）往下挑，會挑到列表遮罩下緣外、
            // 玩家看不到也點不到的那一列（中心 y≈1068）。第一列要明確取前序第一個 Row（畫面最上方那列，玩家真的看得到）。
            if (firstCard === 'Row') {
                const rowLoc = await rm.locate({ name: '^Row$', button: true });
                const rowCount = (rowLoc && rowLoc.matches) || 1;
                rec.detail.rowCount = rowCount;
                await rm.click({ name: '^Row$', button: true, nth: rowCount - 1 }, '名冊第一列');
            } else {
                await clickButton(`^${firstCard}$`);
            }
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
        /** 已在戰場（BattleScene）後：加速、佈陣、打到結算、回大廳。runBattle 與年終守城（換季後自動進戰場）共用 */
        const driveBattle = async (rec, opts, battleT0) => {
            // 等戰場載入完成（PROG-2-10072）：讀取畫面（「正在準備戰鬥」）時按 BtnAuto 會落空，自動代打沒開成功、每回合靠補按結束回合
            const readyDeadline = Date.now() + 60000;
            while (Date.now() < readyDeadline) {
                const st = await page.evaluate(() => window.__pt.battleState()).catch(() => null);
                if (st && !st.advancing && st.canAdvance !== null && st.speedX2 !== null) break;
                await delay(500);
            }
            await delay(1500);
            // 首戰預設 x2（PROG-2-10072）：記錄開場速度；舊的 BtnFastForward 按鈕不存在，保留點擊會誤切回 x1，已移除
            rec.detail.speedX2AtStart = (await page.evaluate(() => window.__pt.battleState()).catch(() => null) || {}).speedX2 ?? null;
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
            // 自動代打（PROG-2-9707／9711）：開場按一次「自動」＝委任出兵＋每回合自動結束回合；只按一次，再按會跳到極速決戰
            // --no-auto-play 可改回逐回合手按結束回合
            let autoPlay = false;
            if (!args['no-auto-play'] && opts.autoPlay !== false) {
                // 按一次後驗證旗標真的亮起；沒亮才再按（最多 3 次，避免第二次按成極速決戰：亮起後絕不再按）
                for (let attempt = 0; attempt < 3 && !autoPlay; attempt += 1) {
                    if (!await clickButton('^BtnAuto$')) { await delay(1000); continue; }
                    await delay(800);
                    const st = await page.evaluate(() => window.__pt.battleState()).catch(() => null);
                    autoPlay = Boolean(st && st.autoPlay);
                }
            }
            rec.detail.autoPlay = autoPlay;
            rec.detail.endTurnFallbacks = 0;
            await delay(800);
            // 等結算：BattleReview 出現，或場景自動回大廳
            // 回合數有在前進就不算卡住；停滯超過 BATTLE_LIMIT_MS 或總時間超過 6 分鐘才判失敗
            let settled = null;
            let lastRound = -1;
            let lastProgressAt = Date.now();
            // 每回合各段演出實測秒數（PROG-2-9803）：取樣器跟著戰鬥迴圈跑，結算時彙整成 presentation-timing.json
            await page.evaluate(() => window.__pt.startTimingSampler());
            const hardDeadline = Date.now() + 360000;
            // 首戰探針（PROG-2-10010）：記錄戰鬥天氣，並在我方可放招時試放一次計謀（火計優先，天氣不符改放第一個可放的），量格子特效
            let tacticProbe = null;
            let tacticAttempts = 0;
            let noEnemyPolls = 0;
            let probeStartedAt = null;
            const firstBattle = { weather: null, tactic: null };
            rec.detail.firstBattle = firstBattle;
            // --battle-shots <毫秒>：戰鬥中每隔這麼久截一張 bt-<序號>.png（看 x2 下飄字與受擊是否看得清，PROG-2-10072）
            const battleShotMs = Number(args['battle-shots']) || 0;
            let lastBattleShotAt = 0;
            let battleShotIndex = 0;
            let castShotTaken = false;
            while (!settled) {
                if (battleShotMs > 0 && Date.now() - lastBattleShotAt >= battleShotMs) {
                    lastBattleShotAt = Date.now();
                    battleShotIndex += 1;
                    await page.screenshot({ path: path.join(outDir, `bt-${String(battleShotIndex).padStart(3, '0')}.png`) }).catch(() => {});
                }
                // 放招計數（PROG-2-10074）：包住委任放招階段；第一次放出招時擷取畫面
                await page.evaluate(() => window.__pt.hookDelegateCasts()).catch(() => false);
                if (!castShotTaken) {
                    const cs = await page.evaluate(() => window.__pt.castSummary()).catch(() => null);
                    if (cs && cs.castTotal > 0) { castShotTaken = true; await shot(rec, 'first-cast').catch(() => undefined); }
                }
                if (opts.probeTactic && !tacticProbe) {
                    const st = await page.evaluate(() => window.__pt.battleState()).catch(() => null);
                    if (st && st.weather && !firstBattle.weather) firstBattle.weather = st.weather;
                    if (st && !st.advancing && !st.ultCutin && !st.duelPanel && !st.battleEnded && (probeStartedAt === null || Date.now() - probeStartedAt < TACTIC_PROBE_WINDOW_MS)) {
                        // 嘗試上限改依時間（PROG-2-10014）：從第一個空檔起算約 60 秒；沒有存活敵軍的取樣不算嘗試次數
                        if (probeStartedAt === null) probeStartedAt = Date.now();
                        const probe = await page.evaluate((id) => window.__pt.castTacticProbe(id), opts.preferTactic || 'tactic-fire-scheme').catch((e) => ({ ok: false, reason: 'PROBE_ERROR:' + String(e && e.message || e) }));
                        if (probe.noEnemy) noEnemyPolls += 1; else tacticAttempts += 1;
                        firstBattle.tactic = { ...probe, attempts: tacticAttempts, noEnemyPolls };
                        if (probe.weather && !firstBattle.weather) firstBattle.weather = probe.weather;
                        if (probe.ok) tacticProbe = probe;
                    }
                }
                if ((await scene()) === 'LobbyScene') { settled = 'auto-lobby'; break; }
                if (await page.evaluate(() => window.__pt.scenePresence('BattleReview'))) { settled = 'review'; break; }
                if ((await page.evaluate(() => window.__pt.textsMatching('^(勝利|失敗|戰敗|平手)$'))).length) { settled = 'review'; break; }
                const roundTexts = await page.evaluate(() => window.__pt.textsMatching('^第\\s*\\d+(?:\\s*/\\s*\\d+)?\\s*回合$'));
                // 守城戰 HUD 顯示「第 3/12 回合」（有回合上限），只取第一個數字（PROG-2-10107）
                const round = roundTexts.length ? Number((String(roundTexts[0]).match(/\d+/) || ['-1'])[0]) : -1;
                if (round !== lastRound) { lastRound = round; lastProgressAt = Date.now(); }
                rec.detail.lastRound = lastRound;
                await page.evaluate((r) => { window.__ptRound = r; }, lastRound);
                // 首戰教學戰打不死（回合持續推進仍無勝負）：超過 20 回合改按右上「退」結束教學，記錄為 retreat
                if (lastRound >= 20) {
                    rec.detail.retreatedAtRound = rec.detail.retreatedAtRound || lastRound;
                    await clickByText('.*', '^\\s*退\\s*$');
                    await clickByText('.*', '^\\s*(確認|確定|是|撤退|結束教學)\\s*$');
                }
                // 自動代打時由遊戲自己結束回合。只有「推進演出已結束、按鈕可操作、回合停超過 12 秒」才補按並計入 endTurnFallbacks（PROG-2-9803）
                // 沒開自動代打時逐回合手按結束回合；絕不再按自動鈕（第二次按＝跳到極速決戰）
                const stalled = Date.now() - lastProgressAt > 12000;
                const battleState = autoPlay && stalled ? await page.evaluate(() => window.__pt.battleState()) : null;
                const endTurnAction = decideEndTurnAction({ autoPlay, stalled, state: battleState });
                if (endTurnAction.click) {
                    const clicked = await clickButton('^(BtnEndTurn|btnEndTurn|EndTurnBtn)$');
                    if (clicked && endTurnAction.count) rec.detail.endTurnFallbacks += 1;
                    if (clicked && endTurnAction.unknownState) rec.detail.endTurnUnknownStateClicks = (rec.detail.endTurnUnknownStateClicks || 0) + 1;
                }
                if (Date.now() - lastProgressAt > BATTLE_LIMIT_MS) throw new Error(`戰鬥卡住：第 ${lastRound} 回合起超過 ${Math.round(BATTLE_LIMIT_MS / 1000)} 秒沒有推進（可按按鈕：${(await listButtons()).join(', ')}）`);
                if (Date.now() > hardDeadline) throw new Error(`戰鬥 6 分鐘內未結算（停在第 ${lastRound} 回合；回合仍在推進，疑似戰鬥變長）`);
                await delay(1000);
            }
            rec.detail.settledBy = settled;
            rec.detail.battleMs = Date.now() - battleT0;
            {
                const cs = await page.evaluate(() => window.__pt.castSummary()).catch(() => null);
                if (cs) {
                    rec.detail.casts = cs;
                    (report.casts = report.casts || []).push({ step: rec.name, ...cs });
                    console.log(`[playtest] 放招：${rec.name} 委任階段 ${cs.calls} 次、放招 ${cs.castTotal} 次（奧義 ${cs.ultimateCount}／計謀 ${cs.tacticCount}），第一招在第 ${cs.firstCastRound ?? '—'} 回合，自動代打${cs.delegating ? '已開啟' : '未開啟'}`);
                }
            }
            if (opts.probeTactic) {
                const fb = rec.detail.firstBattle;
                if (!fb.tactic) fb.tactic = { ok: false, reason: 'NEVER_ATTEMPTED（戰鬥期間沒有出現我方可放招的時機）', attempts: tacticAttempts, noEnemyPolls };
                fb.line = formatFirstBattleLine(fb);
                report.battles.push({ step: rec.name, result: null, weather: fb.weather, tactic: fb.tactic, gridVfx: { nodes: fb.tactic.nodes ?? null, hooks: fb.tactic.hooks ?? null }, line: fb.line });
                console.log(`[playtest] ${fb.line}`);
            }
            {
                const timing = await page.evaluate(() => { window.__pt.stopTimingSampler(); return window.__pt.timingSummary(); }).catch(() => null);
                if (timing) {
                    rec.detail.presentationTiming = { byLabel: timing.byLabel, byRound: timing.byRound };
                    fs.writeFileSync(path.join(outDir, 'presentation-timing.json'), JSON.stringify(timing, null, 2), 'utf8');
                    rec.detail.presentationTimingFile = path.relative(projectRoot, path.join(outDir, 'presentation-timing.json')).replace(/\\/g, '/');
                }
            }
            if (settled === 'review') {
                rec.detail.result = (await page.evaluate(() => window.__pt.textsMatching('^(勝利|失敗|戰敗|平手)$')))[0] || null;
                // 戰後獎懲（PROG-2-9149）在 recordBattle 存檔後才補進結算框，要等一下才看得到
                if (opts.shotTag) await delay(3000);
                rec.detail.reviewTexts = await page.evaluate(() => window.__pt.textsMatching('.{2,}')).then((t) => t.slice(0, 60)).catch(() => []);
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

        /** 出戰主將未定（首戰編成把主將設為空）就指定第一位可出戰武將，回傳 { before, after, set }；已有主將不動 */
        const ensureLeadGeneral = (apply = true) => page.evaluate(async (applyFlag) => {
            const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
            const session = loader.services().session;
            const before = session.leadGeneralId;
            const deployable = session.getDeployableGenerals();
            const check = before ? session.checkDeployable(before) : null;
            let set = null;
            if (applyFlag && (!before || !deployable.some((g) => g.id === before))) {
                const pick = deployable[0];
                if (pick && await session.setLeadGeneral(pick.id)) set = pick.id;
            }
            return { before, after: session.leadGeneralId, set, eligible: check ? check.eligible : null, reasons: check ? check.reasons : null };
        }, apply).catch((e) => ({ error: String(e && e.message || e) }));

        const runBattle = async (rec, opts = {}) => {
            // 回到大廳
            for (let i = 0; i < 6 && (await scene()) !== 'LobbyScene'; i++) {
                await clickButton('^(GachaReturnToLobby|BtnBack|BtnClose|BtnCloseSortie)$');
                await delay(1200);
            }
            await requireLobby();
            await backToLobbyBar();
            await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatSortie$')), 30000, async () => `回大廳後沒有底欄按鈕（場景 ${await scene()}；節點 ${(await page.evaluate(() => window.__pt.dumpBtnLike())).join(', ')}）`);
            if (!(await openSub('BtnCatSortie', '戰場'))) throw new Error(`大廳找不到「出征 → 戰場」入口（可按按鈕：${(await listButtons()).join(', ')}）`);
            await delay(2500);
            rec.detail.buttonsAfterOpen = await listButtons();
            const battleT0 = Date.now();
            const deployRe = '^(BtnSortie|BtnStartBattle|BtnDeploy|BtnConfirmDeploy|BtnConfirmSortie|BtnStart|BtnGo|BtnNextDispatchGeneral|BtnScoutSortie|QuickSortieCommand)$'; // QuickSortieCommand：非首戰出征時多一個「選擇戰鬥模式」對話框，選「親自指揮」
            // 出征面板：依序點可按的出征確認鈕，直到進入 BattleScene（每 2 秒一次，總時限 120 秒）
            let quickClicked = false;
            let loadoutShot = false;
            await waitUntil(async () => {
                if ((await scene()) === 'BattleScene') return true;
                // 新手首戰（PROG-2-9912）：出征前先出現戰前編成視窗，截一張並記錄畫面文字（預填的主將與卡組），等推薦寫入後再按確認
                if (!loadoutShot && (await page.evaluate(() => window.__pt.hasButton('^BtnConfirmSortie$')))) {
                    loadoutShot = true;
                    await delay(1500);
                    rec.detail.loadoutTexts = (await rm.allTexts()).slice(0, 60);
                    await shot(rec, 'first-battle-loadout');
                }
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

            return driveBattle(rec, opts, battleT0);
        };
        await step('battle-to-settlement', async (rec) => {
            // 戰後獎懲（PROG-2-9149）：記戰前頂欄、結算畫面截圖，回大廳後再記頂欄，看糧／金／兵源的變化
            rec.detail.topBefore = await readTopbar();
            const d = await runBattle(rec, { shotTag: 'battle-settle', probeTactic: !args['no-tactic-probe'] });
            const lastBattle = report.battles[report.battles.length - 1];
            if (lastBattle && lastBattle.result === null) lastBattle.result = d.result || null;
            await delay(2500);
            rec.detail.topAfter = await readTopbar();
            return d;
        }, { skipIfFailed: true });

        // ── 6a-2. 戰前偵查面板（選用 --scout-panel，PROG-2-10073）：首戰通關後下一關必備對策缺口＝高風險，
        //    直接開偵查面板，截面板、按「出征」截確認框、按「再想想」截回面板，最後「暫不出征」確認回 false ──
        if (args['scout-panel']) {
            await step('scout-panel', async (rec) => {
                await requireLobby();
                await backToLobbyBar();
                // 面板是開場後背景逐個掛載，等 ScoutPanel 掛好才開（最多 90 秒）
                await waitUntil(() => page.evaluate(() => { const walk = (n) => { for (const c of n.components) if (c && typeof c._askScoutBeforeSortie === 'function') return c; for (const ch of n.children) { const r = walk(ch); if (r) return r; } return null; }; const l = walk(window.cc.director.getScene()); return !!(l && l._scoutPanelHost); }), 90000, 'ScoutPanel 90 秒內沒掛好');
                const opened = await page.evaluate(() => {
                    const walk = (n) => { for (const c of n.components) if (c && typeof c._askScoutBeforeSortie === 'function') return c; for (const ch of n.children) { const r = walk(ch); if (r) return r; } return null; };
                    const lobby = walk(window.cc.director.getScene());
                    if (!lobby) return false;
                    window.__scoutResult = 'pending';
                    lobby._askScoutBeforeSortie().then((v) => { window.__scoutResult = v; });
                    return true;
                });
                if (!opened) throw new Error('找不到 LobbyScene 元件');
                await delay(3500);
                rec.detail.diag = await page.evaluate(() => { const walk = (n) => { for (const c of n.components) if (c && typeof c._askScoutBeforeSortie === 'function') return c; for (const ch of n.children) { const r = walk(ch); if (r) return r; } return null; }; const l = walk(window.cc.director.getScene()); return { result: window.__scoutResult, host: !!(l && l._scoutPanelHost), active: !!(l && l._scoutPanelHost && l._scoutPanelHost.node.active), encounter: l && l._currentEncounter ? (l._currentEncounter() || {}).id : null }; });
                await shot(rec, 'scout-panel');
                rec.detail.panelTexts = (await rm.allTexts()).filter((t) => /偵查|建議|加強|風險|怎麼換|出征/.test(t)).slice(0, 20);
                if (!(await clickButton('^BtnScoutSortie$'))) throw new Error('點不到 BtnScoutSortie');
                await delay(1000);
                await shot(rec, 'scout-confirm');
                rec.detail.confirmTexts = (await rm.allTexts()).filter((t) => /兵勢|強行|再想想/.test(t)).slice(0, 10);
                if (!(await clickButton('^BtnScoutConfirmNo$'))) throw new Error('點不到「再想想」');
                await delay(800);
                await shot(rec, 'scout-back');
                if (!(await clickButton('^BtnScoutCancel$'))) throw new Error('點不到「暫不出征」');
                await delay(800);
                rec.detail.result = await page.evaluate(() => window.__scoutResult);
                if (rec.detail.result !== false) throw new Error(`暫不出征後結果應為 false，實為 ${rec.detail.result}`);
                return rec.detail;
            }, { skipIfFailed: true });
        }

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

        // ── 6c. 重複卡彈窗（--dup）：紅顏池連抽到已持有者，必須跳「宿命牽引・名將重逢」選擇窗（不得自動轉換），截圖後選「升星」 ──
        if (args.dup) await step('gacha-duplicate-popup', async (rec) => {
            await requireLobby();
            await backToLobbyBar();
            await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatShop$')), 30000, '底欄「商城」鈕未出現');
            if (!(await openSub('BtnCatShop', '轉蛋'))) throw new Error('大廳找不到「商店 → 轉蛋」入口');
            await delay(2500);
            // 開發自動補款（測試用）：紅顏池十連 1600 靈玉，新局只有 1280
            await page.evaluate(() => window.localStorage.setItem('ucuf.gacha.dev-auto-topup', 'true'));
            for (let i = 0; i < 6; i++) {
                if ((await rm.allTexts()).some((t) => /紅顏召喚/.test(t))) break;
                await clickButton('^BtnPoolNext$'); await delay(1200);
            }
            if (!(await rm.allTexts()).some((t) => /紅顏召喚/.test(t))) throw new Error('切不到「紅顏召喚」池');
            rec.detail.pulls = 0;
            let seen = false;
            for (let n = 0; n < 14 && !seen; n++) {
                if (!(await clickButton('^BtnPullTen$'))) throw new Error('找不到十連鈕 BtnPullTen');
                rec.detail.pulls += 1;
                if (n === 0) { await delay(2500); await shot(rec, 'dup-first-pull'); }
                for (let k = 0; k < 10; k++) {
                    await delay(1500);
                    if (await page.evaluate(() => window.__pt.hasButton('^BtnDupStarUp$'))) { seen = true; break; }
                    if (await clickButton('^GachaPullResult_(close|back)$')) continue;
                    if (!(await page.evaluate(() => window.__pt.scenePresence('^GachaPullResult_stage$')))) break;
                    await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
                }
            }
            if (!seen) throw new Error(`連抽 ${rec.detail.pulls} 次都沒出現重複卡彈窗（BtnDupStarUp）`);
            rec.detail.popupTexts = (await rm.allTexts()).filter((t) => /名將重逢|復生|灌注|升星/.test(t)).slice(0, 8);
            await delay(2500); // 左側立繪是非同步載入，等它畫出來再截圖
            await shot(rec, 'dup-popup');
            await clickButton('^BtnDupStarUp$');
            await delay(1500);
            for (let i = 0; i < 8; i++) {
                if (await clickButton('^BtnDupStarUp$')) { await delay(1200); continue; }
                if (await clickByText('.*', '^\s*繼續\s*$')) { await delay(1200); continue; }
                if (await clickButton('^GachaPullResult_(close|back)$')) { await delay(1200); continue; }
                if (!(await page.evaluate(() => window.__pt.scenePresence('^GachaPullResult_stage$')))) break;
                await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
                await delay(1200);
            }
            await shot(rec, 'dup-after');
            await clickButton('^GachaReturnToLobby$');
            await delay(1500);
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 6c-2. 結果卡配色（--gacha-card，PROG-2-9810）：名將池十連，結果畫面逐卡截圖（外框／角標／星列要照稀有度），並回報每張卡的稀有度文字 ──
        if (args['gacha-card']) await step('gacha-result-cards', async (rec) => {
            // 上一步（gacha-pools）通常還停在轉蛋畫面：已有十連鈕就直接用，免得關面板時又撞到主將選擇層
            if (!(await page.evaluate(() => window.__pt.hasButton('^BtnPullTen$')))) {
                await requireLobby();
                await backToLobbyBar();
                await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatShop$')), 30000, '底欄「商城」鈕未出現');
                if (!(await openSub('BtnCatShop', '轉蛋'))) throw new Error('大廳找不到「商店 → 轉蛋」入口');
                await delay(2500);
            }
            await page.evaluate(() => window.localStorage.setItem('ucuf.gacha.dev-auto-topup', 'true'));
            for (let round = 0; round < 1; round++) {
                if (!(await clickButton('^BtnPullTen$'))) throw new Error('找不到十連鈕 BtnPullTen');
                // 結果畫面出現後先不點任何東西（點「升星」「繼續」會連結果畫面一起收掉）：等翻牌演完，
                // 再把蓋在上面的重複卡彈窗暫時隱藏，只為了讓截圖看得到十張卡本身
                let seen = 0;
                for (let k = 0; k < 40 && seen < 2; k++) {
                    await delay(1500);
                    seen = (await page.evaluate(() => window.__pt.scenePresence('^GachaPullResult_stage$'))) ? seen + 1 : 0;
                }
                if (seen < 2) { await shot(rec, 'gacha-result-cards-stuck'); throw new Error('十連後沒有出現結果畫面 GachaPullResult_stage'); }
                // 等翻牌與展示區收邊演完：十張卡的稀有度字樣都出現（至多等 60 秒）
                for (let k = 0; k < 40; k++) {
                    await delay(1500);
                    const tags = (await rm.allTexts()).filter((t) => /^(N|R|SR|SSR|UR)$/.test(String(t).trim()));
                    if (tags.length >= 10) break;
                }
                rec.detail.hiddenOverlays = await page.evaluate(() => {
                    const hidden = [];
                    const walk = (n) => { if (/^(DuplicatePullPopupHost|RedFaceShowcaseHost)$/.test(n.name) && n.active) { n.active = false; hidden.push(n.name); } n.children.forEach(walk); };
                    walk(window.cc.director.getScene());
                    return hidden;
                });
                // 先拍「武將展示」畫面（英雄徽章顏色），再點舞台任一處讓十張卡面板出現
                await shot(rec, 'gacha-result-hero');
                await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
                await delay(1500);
                (rec.detail.rounds = rec.detail.rounds || []).push({ texts: (await rm.allTexts()).filter((t) => /^(N|R|SR|SSR|UR)$/.test(String(t).trim())) });
                await shot(rec, `gacha-result-cards-${round + 1}`);
                if (args['avatar-talk']) { const at = require('./playtest-avatar-talk'); rec.detail.avatarTalkGacha = await at.tapAvatarAndProbe({ page, rm, spec: { name: '^CardPortrait$' }, waitMs: 600, shotTo: async () => { await shot(rec, 'avatar-talk-gacha'); } }); }
                for (let i = 0; i < 6; i++) {
                    if (await clickButton('^GachaPullResult_(close|back)$')) { await delay(1200); }
                    if (!(await page.evaluate(() => window.__pt.scenePresence('^GachaPullResult_stage$')))) break;
                }
            }
            await clickButton('^GachaReturnToLobby$');
            await delay(1500);
            return rec.detail;
        }, { skipIfFailed: true });

        // ── 6d. 教官池（--support，PROG-2-9243）：切到教官池截圖、開「詳情」看完整機率表、用開局連線券十連、截結果 ──
        if (args.support) await step('gacha-support-pool', async (rec) => {
            await requireLobby();
            await backToLobbyBar();
            await waitUntil(() => page.evaluate(() => window.__pt.hasButton('^BtnCatShop$')), 30000, '底欄「商城」鈕未出現');
            if (!(await openSub('BtnCatShop', '轉蛋'))) throw new Error('大廳找不到「商店 → 轉蛋」入口');
            await delay(2500);
            for (let i = 0; i < 6; i++) {
                if ((await rm.allTexts()).some((t) => /教學投影卡/.test(t))) break;
                await clickButton('^BtnPoolNext$'); await delay(1500);
            }
            if (!(await rm.allTexts()).some((t) => /教學投影卡/.test(t))) throw new Error('切不到「教官池」');
            rec.detail.poolTexts = (await rm.allTexts()).filter((t) => /教官池|連線券|教學投影/.test(t)).slice(0, 8);
            await shot(rec, 'support-pool');
            if (!(await clickButton('^BtnPoolDetail$'))) throw new Error('找不到詳情鈕 BtnPoolDetail');
            await delay(1500);
            rec.detail.rateTexts = (await rm.allTexts()).filter((t) => /共 \d|UP（|保底|%/.test(t)).slice(0, 30);
            await shot(rec, 'support-rates');
            if (!rec.detail.rateTexts.length) throw new Error('機率說明沒有列出任何機率列');
            await rm.tryClick({ name: '^CloseButton$', button: true });
            await delay(800);
            if (!(await clickButton('^BtnPullTen$'))) throw new Error('找不到十連鈕 BtnPullTen');
            await delay(3500);
            await shot(rec, 'support-result');
            rec.detail.resultTexts = (await rm.allTexts()).filter((t) => /教學投影|SSR|傳承|學分|剩餘/.test(t)).slice(0, 20);
            for (let k = 0; k < 6; k++) {
                if (await clickButton('^GachaPullResult_(close|back)$')) { await delay(1200); break; }
                if (!(await page.evaluate(() => window.__pt.scenePresence('^GachaPullResult_stage$')))) break;
                await page.mouse.click(Math.round(viewport.width / 2), Math.round(viewport.height / 2));
                await delay(1500);
            }
            await clickButton('^GachaReturnToLobby$');
            await delay(1500);
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
            await waitLoginStartReady();
            await clickLoginStart();
            await waitUntil(async () => (await scene()) === 'LobbyScene', stuckMs, '重開後點開始未進入 LobbyScene');
            // 以「底欄出現且載入提示消失」為準；載入提示會晚一點才掛上，只看提示消失會誤判。
            // 總等待上限 120 秒（自重整起算）；遮罩沒消失前不找頂欄鈕（PROG-2-9865）
            const RELOAD_CAP_MS = 120000;
            const reloadDeadline = t0 + RELOAD_CAP_MS;
            let lastTexts = [];
            const ready = await waitUntil(async () => {
                lastTexts = await page.evaluate((re) => window.__pt.textsMatching(re), '正在準備|載入中|Loading|啟動遇到問題');
                return lastTexts.length === 0 && (await page.evaluate(() => window.__pt.hasButton('^BtnCatShop$')));
            }, Math.max(1000, reloadDeadline - Date.now()), async () => `重載後 120 秒內載入遮罩未消失（仍有：${lastTexts.slice(0, 2).join('／') || '底欄未出現'}）`).catch(() => false);
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
            // 頂欄鈕要等遮罩消失後才找得到可點的位置；在 120 秒上限內輪詢，逾時才算失敗
            const advance = await waitUntil(async () => {
                const a = await rm.locate({ ucuf: 'lobby-hall-screen.back' });
                return a.found && a.ok && a.page ? a : null;
            }, Math.max(1000, reloadDeadline - Date.now()), '').catch(() => rm.locate({ ucuf: 'lobby-hall-screen.back' }));
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

        // ── 官職晉升解鎖節奏（PROG-2-9151，--rank-unlock）：新玩家大廳的鎖頭按鈕、點鎖頭的提示、晉升彈窗 ──
        if (args['rank-unlock']) {
            await step('rank-unlock', async (rec) => {
                await requireLobby();
                await backToLobbyBar();
                await closeMissionLayers();
                await waitToastGone();
                rec.detail.menus = {};
                let lockedPick = null;
                for (const cat of ['BtnCatDomestic', 'BtnCatNurture', 'BtnCatSortie']) {
                    if (!(await clickButton('^' + cat + '$'))) throw new Error(`找不到底欄 ${cat}`);
                    await delay(1200);
                    rec.detail.menus[cat] = (await page.evaluate(() => window.__pt.buttonTexts('^BtnSub'))).map((b) => b.text);
                    await shot(rec, `rank-unlock-menu-${cat}`);
                    // 走完前面步驟後玩家可能已自然升官：挑目前還鎖著的第一個項目來點
                    const lockedText = rec.detail.menus[cat].find((t) => /🔒/.test(t));
                    if (lockedText && !lockedPick) lockedPick = { cat, name: lockedText.split('\n')[0].replace('🔒', '') };
                }
                if (!lockedPick) throw new Error('目前官職階位下沒有任何鎖著的選單項目');
                rec.detail.lockedPick = lockedPick;
                // 點鎖頭：提示出現、選單不收起、功能沒有被打開
                if (!(await clickButton('^' + lockedPick.cat + '$'))) throw new Error(`找不到底欄 ${lockedPick.cat}`);
                await delay(800);
                const before = new Set(await rm.allTexts());
                const clicked = await clickByText('^BtnSub', lockedPick.name);
                if (!clicked) throw new Error(`找不到鎖著的「${lockedPick.name}」子選單按鈕`);
                await delay(900);
                rec.detail.lockToastTexts = (await rm.allTexts()).filter((t) => !before.has(t) && /開放/.test(t));
                rec.detail.menuStillOpen = Boolean(await page.evaluate(() => window.__pt.buttonTexts('^BtnSub')).then((b) => b.length));
                await shot(rec, 'rank-unlock-locked-click-toast');
                if (!rec.detail.lockToastTexts.length) throw new Error('點鎖著的按鈕沒有出現「X 官職開放」提示');
                await waitToastGone();
                await backToLobbyBar();
                // 晉升：直接給官職經驗並發出晉升事件，驗晉升彈窗內容與官職更新後解鎖
                const promoted = await page.evaluate(async () => {
                    const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                    const session = loader.services().session;
                    const tiers = session.gainOfficerExp({ difficulty: 'HELL', boardType: 'MILITARY', success: true })
                        .concat(session.gainOfficerExp({ difficulty: 'HELL', boardType: 'MILITARY', success: true }));
                    loader.services().event.emit('game-session-officer-promoted', { tiers });
                    return { tiers, tier: session.officerState.currentTier };
                });
                rec.detail.promoted = promoted;
                if (!promoted.tiers.length) throw new Error('給官職經驗後沒有晉升');
                const popup = await waitUntil(async () => {
                    const texts = await rm.allTexts();
                    return texts.some((t) => /^(晉升「|朝廷敕封：晉升【)/.test(t)) ? texts.filter((t) => /^晉升「|^朝廷敕封|史小境|新開放|：|下一官職/.test(t)) : null;
                }, 20000, '晉升後 20 秒內沒有出現晉升彈窗').catch((e) => { throw e; });
                rec.detail.popupTexts = popup;
                await delay(600);
                await shot(rec, 'rank-unlock-promotion-popup');
                const ok = await clickByText('^BtnRankUnlockOk$', '.*') || await clickButton('^BtnRankUnlockOk$');
                rec.detail.popupClosed = Boolean(ok);
                await delay(800);
                // 晉升大廳導流（PROG-2-9610）：首位走動武將頭頂金色「！」→ 點擊 → 導流泡泡（含「立即前往」）
                rec.detail.hallGuide = {};
                const guideMarks = await waitUntil(async () => {
                    const marks = await page.evaluate(() => Object.keys(window.__pt.nameCounts('^mark-')));
                    return marks.length ? marks : null;
                }, 8000, '晉升後大廳武將頭頂沒有出現「！」標記').catch((e) => { rec.detail.hallGuide.markError = e.message; return []; });
                rec.detail.hallGuide.marks = guideMarks;
                await shot(rec, 'rank-unlock-hall-mark');
                // 點頭頂掛「！」的那位（mark-<id> 對應 crowd-<id>）；泡泡必須出在同一人身上（PROG-2-9820）
                const markedId = (guideMarks[0] || '').replace(/^mark-/, '');
                rec.detail.hallGuide.markedId = markedId;
                const guideTapped = markedId ? await rm.tryClick({ name: `^crowd-${markedId}$` }) : false;
                rec.detail.hallGuide.tapped = Boolean(guideTapped);
                await delay(900);
                rec.detail.hallGuide.bubbleTexts = (await rm.allTexts()).filter((t) => /新解鎖|立即前往|大喜/.test(t));
                await shot(rec, 'rank-unlock-hall-bubble');
                if (!rec.detail.hallGuide.tapped) throw new Error('點不到頭頂掛「！」的武將');
                if (!rec.detail.hallGuide.bubbleTexts.some((t) => /立即前往/.test(t))) throw new Error('點「！」武將後沒有出現導流泡泡');
                // 消費導流（點「立即前往」）後標記應消失
                const goTapped = await rm.tryClick({ text: '立即前往', button: true }) || await rm.tryClick({ text: '立即前往' });
                rec.detail.hallGuide.goTapped = Boolean(goTapped);
                await delay(1500);
                rec.detail.hallGuide.marksAfter = await page.evaluate(() => Object.keys(window.__pt.nameCounts('^mark-')));
                await backToLobbyBar();
                await delay(600);
                await shot(rec, 'rank-unlock-hall-mark-consumed');
                // 晉升後原本鎖著的按鈕解鎖
                if (!(await clickButton('^BtnCatDomestic$'))) throw new Error('晉升後找不到底欄「內政」');
                await delay(1200);
                rec.detail.menuAfterPromotion = (await page.evaluate(() => window.__pt.buttonTexts('^BtnSub'))).map((b) => b.text);
                await shot(rec, 'rank-unlock-menu-after-promotion');
                await backToLobbyBar();
                return rec.detail;
            }, { skipIfFailed: true });
        }

        // ── 9. 一年循環（--year，選用）：從目前季節起每季內政＋任務牆派將＋出征戰鬥＋抽卡／培育＋推進一季，直到第 1 年第 4 季結束（PROG-2-9141）──
        if (args.year || args['full-year']) {
            const fullYear = Boolean(args['full-year']);
            const battlesPerSeason = Number(args['battles-per-season'] || 2);
            const yearReport = { tool: 'tools_node/playtest-online.js --year', startedAt: new Date().toISOString(), battlesPerSeason, quarters: [] };
            const writeYearReport = () => fs.writeFileSync(path.join(outDir, 'year-report.json'), JSON.stringify(yearReport, null, 2), 'utf8');
            /** 重新整理並登入回大廳（卡在無法恢復的畫面時的最後手段；存檔還在） */
            const reloadToLobby = async () => {
                await page.reload({ waitUntil: 'load', timeout: stuckMs });
                await waitUntil(() => page.evaluate(() => Boolean(window.cc && window.cc.director && window.cc.director.getScene())), stuckMs, '重整後引擎未就緒');
                await installHelpers();
                await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, '重整後未進入 LoginScene');
                await waitLoginStartReady();
                await clickLoginStart();
                await waitUntil(async () => (await scene()) === 'LobbyScene', stuckMs, '重整後未進入 LobbyScene');
                await waitUntil(async () => (await page.evaluate((re) => window.__pt.textsMatching(re), '正在準備|載入中|Loading|啟動遇到問題')).length === 0 && (await page.evaluate(() => window.__pt.hasButton('^BtnCatShop$'))), stuckMs, '重整後大廳沒準備好');
            };
            /** 每個子步驟前的保險：不在大廳就想辦法回去，最後才重整 */
            const ensureLobby = async () => {
                await ensurePageAlive('年循環子步驟前頁面已失效');
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
            yearReport.startOfficer = await page.evaluate(async () => {
                const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                const o = loader.services().session.officerState;
                return { tier: o.currentTier, exp: o.officerExp };
            }).catch(() => null);
            // 原 11 步裡已推進過的季（任務循環、推進一季）一併列入，湊成完整一年
            const stepByName = (n) => report.steps.find((x) => x.name === n);
            const loopStep = stepByName('lobby-mission-loop');
            const advStep = stepByName('lobby-advance-season');
            const commerceStep = stepByName('lobby-commerce-silver');
            const battleStep = stepByName('battle-to-settlement');
            yearReport.baselineQuarters = [
                loopStep && { via: 'lobby-mission-loop（原第 6 步）', ok: loopStep.ok, popups: loopStep.detail.advances, reportTexts: (loopStep.detail.reportCaptures || []).map((c) => c.texts), topBefore: loopStep.detail.topBefore, topAfter: loopStep.detail.topAfterAdvance, wallHeadAfter: loopStep.detail.wallHeadAfterSettle },
                commerceStep && { via: 'lobby-commerce-silver（原第 7 步，派任務後推進一季）', ok: commerceStep.ok },
                advStep && { via: 'lobby-advance-season（原第 8 步）', ok: advStep.ok, popups: (advStep.detail.popups || []).map((p) => p.kind), seasonBefore: advStep.detail.seasonBefore, seasonAfter: advStep.detail.seasonAfter },
            ].filter(Boolean);
            yearReport.baselineBattle = battleStep ? { ok: battleStep.ok, castOk: Boolean(battleStep.detail && battleStep.detail.firstBattle && battleStep.detail.firstBattle.tactic && battleStep.detail.firstBattle.tactic.ok) } : null;
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
                        const opened = await openSub('BtnCatDomestic', '^太守府'); // 鎖著的項目文字開頭是「🔒」，不會被點到（太守府郡守官階才開放）
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
                        // 主將未定時戰場會退回關卡指定的名冊外主將，沒有出征帳本，自動代打只會結束回合不出兵（PROG-2-10003）；
                        // 跟玩家一樣先指定一位可出戰武將當主將。--no-set-lead 可保留未定狀態重現
                        rec.detail.lead = await ensureLeadGeneral(!args['no-set-lead']);
                        const d = await runBattle(rec, { shotTag: 'battle-settle', quick: b === 1, probeTactic: fullYear && b !== 1, preferTactic: args['skill-prefer'] });
                        rec.detail.topAfter = await readTopbarSettled();
                        return d;
                    });
                    const brec = yq.steps[`battle${b + 1}`];
                    yq.battles.push({ ok: okB, tactic: (brec.detail.firstBattle && brec.detail.firstBattle.tactic) || null, weather: (brec.detail.firstBattle && brec.detail.firstBattle.weather) || null, result: brec.detail.result || null, lead: brec.detail.lead || null, reason: brec.reason, rounds: brec.detail.lastRound, ms: brec.detail.battleMs, topBefore: brec.detail.topBefore, topAfter: brec.detail.topAfter, screenshot: brec.screenshot });
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
                        // 升星後進「命鏡升星」結果頁，要按「繼續」才收掉；沒收會用全螢幕擋住後面所有步驟（抽到重複武將的結果會依亂數出現，PROG-2-9149）
                        if (await clickByText('.*', '^\\s*繼續\\s*$')) { rec.detail.duplicateContinue = (rec.detail.duplicateContinue || 0) + 1; await delay(1500); continue; }
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
                // 5. 培育 → 學府：開入學畫面截圖並記錄（舊培育訓練已下線；實際入學與 36 回合走 --academy），再用「返回」鈕關掉
                await ys('nurture', async (rec) => {
                    const opened = await openSub('BtnCatNurture', '學府');
                    if (!opened) throw new Error('底欄「培育」→「學府」打不開');
                    await delay(2500);
                    rec.detail.buttons = await listButtons();
                    const allTexts = await rm.allTexts();
                    rec.detail.panelTexts = allTexts.slice(0, 40);
                    // 入學畫面有兩種合法結果（PROG-2-9609 起學府入口有空門守衛）：
                    //  1. 有及冠子嗣：開入學畫面。入學鈕（AcEnrollConfirm）不能入學時是灰的、不算可按按鈕，所以改認一定會有的返回鈕與書院選項。
                    //  2. 子嗣未滿入學年齡或沒有子嗣：不開畫面，改跳提示條（少年名將第 1 年必走這條）。提示字串的 {0}{1}{2} 必須已代入實際數字。
                    rec.detail.enrollScreen = rec.detail.buttons.some((n) => /^(?:[Bb]tn)?(?:AcEnrollConfirm|AcEnrollBack)$/.test(n)) && rec.detail.buttons.some((n) => /^AcAcademy\d+$/.test(n));
                    rec.detail.guardToast = allTexts.find((t) => /離入學|入學）|歲以上的孩子|尚未招募及冠門生/.test(t)) || null;
                    await shot(rec, 'academy-enroll-open');
                    const closed = await clickButton('^(?:[Bb]tn)?AcEnrollBack$');
                    rec.detail.closed = Boolean(closed);
                    await delay(800);
                    if (rec.detail.guardToast && /\{[^}]*\}/.test(rec.detail.guardToast)) throw new Error(`學府守衛提示的佔位符沒有代入數字：${rec.detail.guardToast}`);
                    if (!rec.detail.enrollScreen && !rec.detail.guardToast) throw new Error(`學府入學畫面沒有出現，也沒有守衛提示條（沒有返回鈕／書院選項；畫面按鈕：${rec.detail.buttons.join('、') || '無'}；畫面文字：${rec.detail.panelTexts.slice(0, 12).join(' / ')}）`);
                    return rec.detail;
                });
                // 6. 推進一季；處理所有換季彈窗
                await ys('advance', async (rec) => {
                    rec.detail.seasonBefore = (await readSeason()).text;
                    rec.detail.topBefore = await readTopbar();
                    const reports = [];
                    const popupLog = [];
                    await rm.click({ ucuf: 'lobby-hall-screen.back' }, '右下「推進一季」');
                    const popups = await runSeasonPopups(rec, 'adv', reports, popupLog);
                    // 第 1 年末換季會自動進「年終守城」戰場（PROG-2-9431）：打到結算回大廳再處理戰後彈窗；機器忙時戰場與彈窗會晚到，季別沒變就多清幾輪
                    const clearYearEnd = async (tagSuffix) => {
                        for (let b = 0; b < 2 && (await scene()) === 'BattleScene'; b++) {
                            rec.detail.yearEndBattles = (rec.detail.yearEndBattles || 0) + 1;
                            await driveBattle(rec, {}, Date.now());
                            await delay(2000);
                            popups.push(...await runSeasonPopups(rec, `adv${tagSuffix}b${b + 1}`, reports, popupLog).catch(() => []));
                        }
                    };
                    await clearYearEnd('');
                    for (let k = 0; k < 5 && cur.ordinal !== null && (await readSeason()).ordinal === cur.ordinal; k++) {
                        await delay(3000);
                        popups.push(...await runSeasonPopups(rec, `adv-r${k + 1}`, reports, popupLog).catch(() => []));
                        await clearYearEnd(`-r${k + 1}`);
                    }
                    rec.detail.popups = popups.map((p) => p.kind);
                    rec.detail.popupTexts = popupLog;
                    yq.popups = popups.map((p) => p.kind);
                    yq.yearEndBattles = rec.detail.yearEndBattles || 0;
                    yq.popupTexts = popupLog;
                    yq.reportTexts = reports.map((r) => r.texts);
                    await delay(1000);
                    let after = await readSeason();
                    for (let i = 0; i < 10 && after.ordinal === cur.ordinal; i++) { await delay(500); after = await readSeason(); }
                    rec.detail.seasonAfter = after.text;
                    rec.detail.topAfter = await readTopbar();
                    rec.detail.topSpansAfter = await readSpans();
                    await shot(rec, 'lobby-after');
                    yq.topAfter = rec.detail.topAfter; yq.topSpansAfter = rec.detail.topSpansAfter; yq.seasonAfter = after.text; yq.seasonAfterOrdinal = after.ordinal;
                    if (cur.ordinal !== null && after.ordinal !== cur.ordinal + 1) throw new Error(`季別沒有前進：「${cur.text}」→「${after.text || '讀不到'}」`);
                    return rec.detail;
                });
                // 官職階位與經驗（PROG-2-9151）：量測每季升階節奏
                yq.officer = await page.evaluate(async () => {
                    const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                    const o = loader.services().session.officerState;
                    return { tier: o.currentTier, exp: o.officerExp };
                }).catch(() => null);
                writeYearReport();
                console.log(`[playtest] ${formatYearQuarterLine(yq)}`);
            }
            yearReport.finishedAt = new Date().toISOString();
            const endSeasonNow = await readSeason().catch(() => ({ text: null, ordinal: null }));
            yearReport.endSeason = endSeasonNow.text;
            writeYearReport();
            if (fullYear) {
                // 逐季斷言：失敗寫出哪一步與原因，不只 timeout
                const verdict = evaluateFullYear({
                    startOrdinal: (yearReport.quarters[0] || {}).ordinal ?? null,
                    baselineAdvances: yearReport.baselineQuarters.filter((x) => x.ok).length,
                    baselineCasts: yearReport.baselineBattle && yearReport.baselineBattle.castOk ? 1 : 0,
                    baselineBattles: yearReport.baselineBattle && yearReport.baselineBattle.ok ? 1 : 0,
                    endOrdinal: endSeasonNow.ordinal,
                    quarters: yearReport.quarters,
                    config: { minCasts: Number(args['min-casts'] || 1) },
                });
                fs.writeFileSync(path.join(outDir, 'full-year-report.json'), JSON.stringify({ tool: 'tools_node/playtest-online.js --full-year', ...verdict }, null, 2), 'utf8');
                verdict.lines.forEach((l) => console.log('[playtest] ' + l));
                await step('full-year-verdict', async (rec) => {
                    rec.detail = { checks: verdict.checks, lines: verdict.lines };
                    if (!verdict.ok) throw new Error(verdict.checks.filter((c) => !c.ok).map((c) => '【' + c.name + '】' + c.reason).join('；'));
                    return rec.detail;
                });
            }
        }

        // ── 9b. 配偶上場實玩（--family，選用；PROG-2-9582 F11）：把目前存檔複製到全新情境，網址帶 qaFamily=spouse／nursing，
        //        QA 快進經共通 API（family.enrollSpouse、occupancy.acquire）納入首子系統配偶，再截出征選主將畫面與內政指派太守畫面。
        //        驗收 1：配偶出現在出征選單；驗收 2：哺乳中的母親不在出征選單，但仍可當太守。輸出 family-report.json 與 fam-*.png ──
        if (args.family) {
            const fr = { tool: 'tools_node/playtest-online.js --family', startedAt: new Date().toISOString(), scenarios: {}, screenshots: [] };
            const writeFamilyReport = () => fs.writeFileSync(path.join(outDir, 'family-report.json'), JSON.stringify(fr, null, 2), 'utf8');
            await step('family-qa-spouse-sortie', async (rec) => {
                if (!args.dir) { rec.detail.skipped = 'qa 第二情境需要本機建置目錄（--dir）才有同源空白頁，--url 模式略過'; return rec.detail; }
                const dump = await page.evaluate(() => new Promise((resolve, reject) => {
                    const open = indexedDB.open('3KLifeData');
                    open.onerror = () => reject(open.error);
                    open.onsuccess = () => {
                        const db = open.result;
                        if (!db.objectStoreNames.contains('kv')) { resolve({ version: db.version, rows: [] }); return; }
                        const req = db.transaction('kv', 'readonly').objectStore('kv').getAll();
                        req.onerror = () => reject(req.error);
                        req.onsuccess = () => resolve({ version: db.version, rows: req.result.map((r) => ({ key: r.key, json: JSON.stringify(r) })) });
                    };
                }));
                const origContext = context;
                const origPage = page;
                const runScenario = async (scenario) => {
                    const sc = { texts: {}, buttons: {}, screenshots: [] };
                    fr.scenarios[scenario] = sc;
                    const qaContext = await browser.createBrowserContext();
                    const qaPage = await qaContext.newPage();
                    await qaPage.setViewport(viewport);
                    attachCollectors(qaPage);
                    try {
                        await qaPage.goto(`${target}__pt-blank.html`, { waitUntil: 'load' });
                        await qaPage.evaluate((d) => new Promise((resolve, reject) => {
                            const open = indexedDB.open('3KLifeData', d.version);
                            open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('kv')) open.result.createObjectStore('kv', { keyPath: 'key' }); };
                            open.onerror = () => reject(open.error);
                            open.onsuccess = () => {
                                const db = open.result;
                                const tx = db.transaction('kv', 'readwrite');
                                for (const r of d.rows) tx.objectStore('kv').put(JSON.parse(r.json));
                                tx.oncomplete = () => { db.close(); resolve(true); };
                                tx.onerror = () => reject(tx.error);
                            };
                        }), dump);
                        context = qaContext;
                        page = qaPage;
                        await qaPage.goto(`${target}?qaFamily=${scenario}`, { waitUntil: 'load', timeout: stuckMs });
                        await waitUntil(() => page.evaluate(() => Boolean(window.cc && window.cc.director && window.cc.director.getScene())), stuckMs, 'qa 情境引擎未就緒');
                        await installHelpers();
                        await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, 'qa 情境未進入 LoginScene');
                        await waitLoginStartReady();
                        await clickLoginStart();
                        await waitUntil(async () => (await scene()) === 'LobbyScene', stuckMs, 'qa 情境未進入 LobbyScene');
                        let qa = null;
                        await waitUntil(async () => { qa = await page.evaluate(() => window.__qaFamily || null); return qa && qa.state !== 'running'; }, 60000, `qaFamily=${scenario} 60 秒內沒有完成`);
                        if (qa.state !== 'done') throw new Error(`qaFamily=${scenario} 失敗：${JSON.stringify(qa)}`);
                        sc.qa = qa.result;
                        const gid = qa.result.generalId;
                        // 名冊與出征名單（純讀取）：配偶在名冊；出征名單有沒有她就是兩個驗收的差別
                        sc.state = await page.evaluate(async (id) => {
                            const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                            const s = loader.services().session;
                            const g = (s.roster || []).find((x) => x.id === id);
                            return {
                                name: g ? g.name : null, inRoster: !!g, isSpouse: s.isSpouse(id),
                                deployable: s.getDeployableGenerals().some((x) => x.id === id),
                                occupancy: s.occupancyHost.service.query(id).map((r) => r.kind),
                            };
                        }, gid);
                        const shotTo = async (tag) => {
                            const file = path.join(outDir, `fam-${scenario}-${tag}.png`);
                            await page.screenshot({ path: file });
                            const rel = path.relative(projectRoot, file).replace(/\\/g, '/');
                            sc.screenshots.push(rel);
                            fr.screenshots.push(rel);
                        };
                        // 出征編制畫面（出征選單：主將之外可選的參謀官／後勤官候選就是可出征名單）：由遊戲內同一個入口開啟，
                        // 再用真滑鼠一位一位切換參謀官，記下每位候選名字；配偶在可出征名單才會被切到，哺乳中的母親不會出現
                        await requireLobby();
                        await backToLobbyBar();
                        sc.sortieOpened = await page.evaluate(() => {
                            const walk = (n, out) => { out.push(n); for (const c of (n.children || [])) walk(c, out); return out; };
                            for (const n of walk(window.cc.director.getScene(), [])) {
                                for (const comp of (n.components || [])) {
                                    if (comp && typeof comp._openSortieSetup === 'function') { comp._openSortieSetup(); return true; }
                                }
                            }
                            return false;
                        });
                        await delay(2500);
                        sc.buttons.sortie = await listButtons();
                        const seen = [];
                        const readStrategist = async () => {
                            const t = await rm.allTexts();
                            const i = t.findIndex((x) => /^參謀官$/.test(x));
                            return i >= 0 ? t[i + 1] : null;
                        };
                        // 新納入的配偶排在名冊最後：從「不派」往前切（上一位）幾下就會繞到名冊尾端；最多切 6 下，沒遇到她就是不在候選
                        let spouseShot = false;
                        seen.push(await readStrategist());
                        for (let i = 0; i < 6 && !spouseShot; i++) {
                            if (!(await clickButton('^btnPrevStrategist$'))) break;
                            await delay(700);
                            const nm = await readStrategist();
                            seen.push(nm);
                            if (nm && sc.state.name && nm === sc.state.name) { await shotTo('sortie-strategist'); spouseShot = true; }
                        }
                        sc.sortieStrategistCandidates = seen;
                        sc.spouseInSortieCandidates = Boolean(sc.state.name && seen.includes(sc.state.name));
                        sc.texts.sortie = (await rm.allTexts()).slice(0, 80);
                        await shotTo('sortie');
                        for (let i = 0; i < 4; i++) { if (!(await clickButton('^(btnCloseSortie|BtnCloseSortie)$'))) break; await delay(800); }
                        // 指派太守（遊戲內同一條 assignGovernor 規則，與內政畫面「換將」呼叫的是同一個）：哺乳中的母親也要能當太守，
                        // 指派完再開內政畫面，農耕格的「主事」就會顯示她的名字
                        sc.governorCandidate = await page.evaluate(async (id) => {
                            const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                            const s = loader.services().session;
                            return { assignable: s.assignGovernor('farming', id).ok };
                        }, gid);
                        // 內政指派太守：開內政畫面，截太守候選
                        await backToLobbyBar();
                        sc.buttons.domesticMenu = (await clickButton('^BtnCatDomestic$')) ? await page.evaluate(() => window.__pt.buttonTexts('^BtnSub')) : null;
                        await delay(1500);
                        const domOpened = await clickByText('^BtnSub', '^內政$');
                        sc.domesticOpened = Boolean(domOpened);
                        await delay(2500);
                        sc.texts.domestic = (await rm.allTexts()).slice(0, 80);
                        sc.spouseShownAsGovernor = Boolean(sc.state.name && sc.texts.domestic.some((t) => String(t).includes(sc.state.name)));
                        sc.buttons.domestic = await listButtons();
                        await shotTo('domestic');
                    } finally {
                        page = origPage;
                        context = origContext;
                        await qaPage.close().catch(() => undefined);
                        await qaContext.close().catch(() => undefined);
                    }
                };
                try {
                    await runScenario('spouse');
                    await runScenario('nursing');
                } finally {
                    fr.finishedAt = new Date().toISOString();
                    writeFamilyReport();
                }
                rec.detail.report = path.relative(projectRoot, path.join(outDir, 'family-report.json')).replace(/\\/g, '/');
                const sp = fr.scenarios.spouse.state, nu = fr.scenarios.nursing.state;
                if (!sp || !sp.deployable || !fr.scenarios.spouse.spouseInSortieCandidates) throw new Error(`驗收 1 失敗：配偶沒有出現在出征名單（${JSON.stringify(sp)}）`);
                if (!nu || nu.deployable || fr.scenarios.nursing.spouseInSortieCandidates || !nu.occupancy.includes('nursing')) throw new Error(`驗收 2 失敗：哺乳中的母親仍在出征名單或沒有哺乳占用（${JSON.stringify(nu)}）`);
                if (!fr.scenarios.nursing.governorCandidate || !fr.scenarios.nursing.governorCandidate.assignable) throw new Error('驗收 2 失敗：哺乳中的母親不能當太守');
                return rec.detail;
            }, { skipIfFailed: false });
        }

        // ── 10. 學府實玩（--academy，選用；PROG-2-9192）：開局少年名將 → 推進到第 2 年第 1 季 → 入學潁川（扣入學令）→ 36 回合 → 結業 → 回大廳；
        //        另在複製存檔的第二個情境用網址 qaAcademy=11 驗快進入口；輸出 academy-report.json（含 apiCalls：學府寫入呼叫共通 API 的次數）──
        if (args.academy) {
            const ACADEMY_ENROLL_SEASON = 8; // 第 2 年春（頂欄序數）：少年名將第 1 年末滿 15 歲後入學
            const ar = {
                tool: 'tools_node/playtest-online.js --academy', startedAt: new Date().toISOString(),
                youth: null, seasonBeforeEnroll: null, seasonAfterGraduation: null, seasonsBefore: null, seasonsAfter: null,
                tokenBefore: null, tokenAfterEnroll: null, turnsPlayed: 0, interrupts: [], graduationRating: null, graduationTexts: [],
                nodeCounts: {}, apiCalls: null, occupancy: null, taskWall: null, qaFastForward: null, screenshots: [], todo: [],
            };
            const writeAcademyReport = () => fs.writeFileSync(path.join(outDir, 'academy-report.json'), JSON.stringify(ar, null, 2), 'utf8');
            const acShot = async (tag) => {
                const file = path.join(outDir, `ac-${tag}.png`);
                await page.screenshot({ path: file });
                ar.screenshots.push(path.relative(projectRoot, file).replace(/\\/g, '/'));
                return file;
            };
            /** 讀遊戲內的學府狀態（純讀取，不改任何東西） */
            const readAcademy = () => page.evaluate(async () => {
                const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                const s = loader.services().session;
                const rec = s.academyRecord;
                const c = rec && rec.committed;
                const g = c && c.gimmickStatePayload ? c.gimmickStatePayload : {};
                return {
                    hasRecord: !!rec, graduated: !!(c && c.graduated), turn: c ? c.currentTurn : null, energy: c ? c.energy : null,
                    stats: c ? c.stats : null, pendingInterrupt: c ? c.pendingInterrupt : null, interruptOptions: c ? c.interruptOptions : [],
                    learnedTactics: c ? c.learnedTactics : [], controlMode: c ? c.controlMode : null, childId: c ? c.childId : null,
                    debatePending: !!g.debatePending, eventPending: !!g.eventPending, handLen: (g.handCards || []).length, pendingCard: !!g.pendingCard,
                    tokens: s.itemCount('ITEM_ADMISSION_TOKEN'), seasons: s.gameTime.totalSeasonsElapsed, active: s.isAcademyActive,
                    roster: (s.roster || []).filter((x) => (x.age || 99) < 20).slice(0, 6).map((x) => ({ id: x.id, name: x.name, age: x.age, fate: x.fate && x.fate.choice, grad: x.graduationRating || null })),
                };
            });
            /** 在共通 API 入口掛計數（只計次，不改行為）：命令一律經 handle／invoke 進來，依命令名分組 */
            const installApiCounter = () => page.evaluate(async () => {
                const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                const api = loader.services().api;
                if (api.__ptCounted) return 'already';
                window.__ptApi = window.__ptApi || { calls: {} };
                const bump = (name) => { window.__ptApi.calls[name] = (window.__ptApi.calls[name] || 0) + 1; };
                const handle = api.handle.bind(api);
                api.handle = (req) => { bump(req && req.cmd); return handle(req); };
                const invoke = api.invoke.bind(api);
                api.invoke = (name, args2) => { bump(name); return invoke(name, args2); };
                api.__ptCounted = true;
                return 'installed';
            });
            /** 計數 → 報告格式：寫入命令（cmd）依前綴分六組，查詢（query）另列；apiCalls 只算會改狀態的命令 */
            const summarizeApi = async () => {
                const calls = await page.evaluate(() => (window.__ptApi && window.__ptApi.calls) || {});
                const QUERIES = new Set(['item.count', 'item.list', 'item.ledger', 'reward.pools', 'reward.pity', 'story.available', 'story.pending', 'story.seen', 'story.flags', 'skill.list', 'skill.canLearn', 'occupancy.query', 'save.load', 'save.rev', 'wallet.balance']);
                const GROUPS = ['item', 'skill', 'reward', 'story', 'occupancy', 'save'];
                const out = { item: 0, skill: 0, reward: 0, story: 0, occupancy: 0, save: 0, other: 0, total: 0, queries: 0, byCommand: calls };
                for (const [name, n] of Object.entries(calls)) {
                    if (QUERIES.has(name)) { out.queries += n; continue; }
                    const group = name.split('.')[0];
                    out[GROUPS.includes(group) ? group : 'other'] += n;
                    out.total += n;
                }
                return out;
            };
            /** 到大廳底欄「培育」→「學府」；回傳點到的子選單文字 */
            const openAcademyMenu = async () => {
                await backToLobbyBar();
                await closeMissionLayers();
                return openSub('BtnCatNurture', '學府');
            };

            // 10-1. 推進到第 2 年第 1 季（頂欄序數 ≥ 8）：每次推進一季並處理彈窗
            await step('academy-advance-to-year2', async (rec) => {
                await requireLobby();
                await installApiCounter();
                const log = [];
                for (let i = 0; i < 6; i++) {
                    await backToLobbyBar();
                    await closeMissionLayers();
                    const cur = await readSeason();
                    if (cur.ordinal !== null && cur.ordinal >= ACADEMY_ENROLL_SEASON) break;
                    await rm.click({ ucuf: 'lobby-hall-screen.back' }, '右下「推進一季」');
                    await runSeasonPopups(rec, `adv${i + 1}`);
                    // 第 1 年末換季會自動進「年終守城」戰場：打到結算回大廳，再處理戰後彈窗
                    for (let b = 0; b < 2 && (await scene()) === 'BattleScene'; b++) {
                        rec.detail.yearEndBattles = (rec.detail.yearEndBattles || 0) + 1;
                        await driveBattle(rec, {}, Date.now());
                        await delay(2000);
                        await runSeasonPopups(rec, `adv${i + 1}b${b + 1}`).catch(() => []);
                    }
                    await delay(800);
                    let after = await readSeason();
                    // 機器忙時年終換季與彈窗會很晚才冒出：季別沒變就再處理一輪彈窗（含晚到的季報、事件、年報與守城戰），最多 5 輪
                    for (let k = 0; k < 5 && after.ordinal === cur.ordinal; k++) {
                        await delay(3000);
                        await runSeasonPopups(rec, `adv${i + 1}r${k + 1}`).catch(() => []);
                        for (let b = 0; b < 2 && (await scene()) === 'BattleScene'; b++) {
                            rec.detail.yearEndBattles = (rec.detail.yearEndBattles || 0) + 1;
                            await driveBattle(rec, {}, Date.now());
                            await delay(2000);
                            await runSeasonPopups(rec, `adv${i + 1}r${k + 1}b${b + 1}`).catch(() => []);
                        }
                        after = await readSeason();
                    }
                    // 季別已前進但事件／年報可能還沒處理完：再清一輪，避免遮住大廳與下一次推進
                    await runSeasonPopups(rec, `adv${i + 1}z`).catch(() => []);
                    log.push(`${cur.text} → ${after.text}`);
                    if (cur.ordinal !== null && after.ordinal !== cur.ordinal + 1) throw new Error(`季別沒有前進：「${cur.text}」→「${after.text || '讀不到'}」`);
                }
                const now = await readSeason();
                rec.detail.advanced = log;
                rec.detail.season = now.text;
                ar.seasonBeforeEnroll = now.text;
                if (now.ordinal === null || now.ordinal < ACADEMY_ENROLL_SEASON) throw new Error(`沒推進到第 2 年第 1 季：目前「${now.text}」`);
                const st = await readAcademy();
                ar.youth = st.roster[0] || null;
                rec.detail.roster = st.roster;
                ar.seasonsBefore = st.seasons;
                await waitToastGone();
                return rec.detail;
            }, { skipIfFailed: true });

            // 10-1b. QA 快進入口 qaAcademy=11：把「入學前」存檔複製到全新情境，網址帶 qaAcademy=11 進大廳，第一個學府畫面要是第 12 回合期中打斷
            await step('academy-qa-fast-forward', async (rec) => {
                if (!args.dir) { rec.detail.skipped = 'qa 第二情境需要本機建置目錄（--dir）才有同源空白頁，--url 模式略過'; return rec.detail; }
                const dump = await page.evaluate(() => new Promise((resolve, reject) => {
                    const open = indexedDB.open('3KLifeData');
                    open.onerror = () => reject(open.error);
                    open.onsuccess = () => {
                        const db = open.result;
                        if (!db.objectStoreNames.contains('kv')) { resolve({ version: db.version, rows: [] }); return; }
                        const req = db.transaction('kv', 'readonly').objectStore('kv').getAll();
                        req.onerror = () => reject(req.error);
                        req.onsuccess = () => resolve({ version: db.version, rows: req.result.map((r) => ({ key: r.key, json: JSON.stringify(r) })) });
                    };
                }));
                rec.detail.dumpRows = dump.rows.length;
                const origContext = context;
                const origPage = page;
                const qaContext = await browser.createBrowserContext();
                const qaPage = await qaContext.newPage();
                await qaPage.setViewport(viewport);
                attachCollectors(qaPage);
                const qaLogs = [];
                qaPage.on('console', (m) => { const t = m.text(); if (/qaAcademy|學府|academy|debug\./i.test(t)) qaLogs.push(`${m.type()}: ${t.slice(0, 300)}`); });
                try {
                    // 同源空白頁（不載遊戲）才能寫 IndexedDB；寫完再開帶參數的遊戲網址
                    await qaPage.goto(`${target}__pt-blank.html`, { waitUntil: 'load' });
                    await qaPage.evaluate((d) => new Promise((resolve, reject) => {
                        const open = indexedDB.open('3KLifeData', d.version);
                        open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('kv')) open.result.createObjectStore('kv', { keyPath: 'key' }); };
                        open.onerror = () => reject(open.error);
                        open.onsuccess = () => {
                            const db = open.result;
                            const tx = db.transaction('kv', 'readwrite');
                            for (const r of d.rows) tx.objectStore('kv').put(JSON.parse(r.json));
                            tx.oncomplete = () => { db.close(); resolve(true); };
                            tx.onerror = () => reject(tx.error);
                        };
                    }), dump);
                    context = qaContext;
                    page = qaPage;
                    await qaPage.goto(`${target}?qaAcademy=11`, { waitUntil: 'load', timeout: stuckMs });
                    await waitUntil(() => page.evaluate(() => Boolean(window.cc && window.cc.director && window.cc.director.getScene())), stuckMs, 'qa 情境引擎未就緒');
                    await installHelpers();
                    await waitUntil(async () => (await scene()) === 'LoginScene', stuckMs, 'qa 情境未進入 LoginScene');
                    await waitLoginStartReady();
                    await clickLoginStart();
                    await waitUntil(async () => (await scene()) === 'LobbyScene', stuckMs, 'qa 情境未進入 LobbyScene');
                    // 快進完成：學府紀錄停在第 12 回合、期中打斷掛上；畫面上修業畫面作用中
                    let st = null;
                    await waitUntil(async () => {
                        st = await readAcademy().catch(() => null);
                        return st && st.hasRecord && st.turn === 12 && st.pendingInterrupt === 'MIDTERM';
                    }, 300000, 'qaAcademy=11 沒有停在第 12 回合期中打斷').catch(async (e) => { throw new Error(`${e.message}；最後狀態 ${JSON.stringify(st)}；結果 ${JSON.stringify(await page.evaluate(() => window.__qaAcademy).catch(() => null))}；console：${qaLogs.filter((l) => !/UCUF/.test(l)).join(' | ') || '無'}`); });
                    await delay(3000);
                    const buttons = await listButtons();
                    const texts = (await rm.allTexts()).slice(0, 40);
                    const file = await acShot('qa-midterm-interrupt');
                    rec.detail.qaState = { turn: st.turn, pending: st.pendingInterrupt, energy: st.energy, tokens: st.tokens, options: st.interruptOptions };
                    rec.detail.buttons = buttons;
                    rec.detail.texts = texts;
                    rec.detail.shot = path.relative(projectRoot, file).replace(/\\/g, '/');
                    // 第 11 回合結算畫面還開著時要先按「確認」，打斷鈕才會出現（與 36 回合流程一致），結算確認鈕也算「打斷即將彈出」
                    const interruptVisible = buttons.some((n) => /^(?:[Bb]tn)?Ac(?:Interrupt|Confirm)$/.test(n));
                    ar.qaFastForward = { url: '?qaAcademy=11', turn: st.turn, pendingInterrupt: st.pendingInterrupt, interruptButtonVisible: interruptVisible, texts: texts.slice(0, 20), screenshot: rec.detail.shot };
                    if (!interruptVisible) throw new Error(`第一個學府畫面沒有打斷鈕／結算確認鈕（畫面按鈕：${buttons.join('、') || '無'}）`);
                } finally {
                    page = origPage;
                    context = origContext;
                    await qaPage.close().catch(() => undefined);
                    await qaContext.close().catch(() => undefined);
                }
                return rec.detail;
            }, { skipIfFailed: true });

            // 10-2. 入學：開「培育」→「學府」，截入學畫面，點「入學」，核對入學令 −1（item.consume）與紀錄建立
            await step('academy-enroll', async (rec) => {
                await requireLobby();
                await installApiCounter();
                await page.evaluate(() => { window.__ptApi = { calls: {} }; }); // 計數從入學前一刻歸零
                const opened = await openAcademyMenu();
                if (!opened) throw new Error('底欄「培育」→「學府」打不開');
                await delay(2500);
                const before = await readAcademy();
                ar.tokenBefore = before.tokens;
                rec.detail.buttons = await listButtons();
                rec.detail.enrollTexts = (await rm.allTexts()).slice(0, 40);
                await acShot('01-enroll');
                if (!(await clickButton('^(?:[Bb]tn)?AcEnrollConfirm$'))) throw new Error(`入學畫面點不到「入學」鈕（畫面按鈕：${rec.detail.buttons.join('、') || '無'}；畫面文字：${rec.detail.enrollTexts.slice(0, 12).join(' / ')}）`);
                let st = null;
                await waitUntil(async () => { st = await readAcademy(); return st.hasRecord; }, 20000, '點入學後 20 秒內沒有建立學府紀錄（可能缺入學令、年齡不足或被擋）');
                await delay(1500);
                ar.tokenAfterEnroll = st.tokens;
                rec.detail.tokens = { before: before.tokens, after: st.tokens };
                rec.detail.turn = st.turn;
                rec.detail.sessionTexts = (await rm.allTexts()).slice(0, 40);
                await acShot('02-session-turn1-start');
                if (st.tokens !== before.tokens - 1) throw new Error(`入學後入學令沒有 −1：入學前 ${before.tokens}、入學後 ${st.tokens}（item.consume 沒生效）`);
                return rec.detail;
            }, { skipIfFailed: true });

            // 10-3. 修業中的武將不在任務牆（OCC-M）：占用登記表有此人；任務牆與詳情窗文字不含此人
            await step('academy-occupancy-taskwall', async (rec) => {
                const st = await readAcademy();
                const youthId = st.childId;
                const youthName = ((st.roster || []).find((x) => x.id === youthId) || {}).name || youthId;
                const occ = await page.evaluate(async () => {
                    const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                    const res = await loader.services().api.query('occupancy.query', {});
                    return res && res.ok ? res.result : { error: res && res.reason };
                });
                ar.occupancy = { youthId, youthName, occupiedIds: occ.occupiedIds || null, records: occ.records || null, error: occ.error || null };
                rec.detail.occupancy = ar.occupancy;
                // 修業畫面先暫離，回大廳點任務牆第一張卡，收集詳情窗與牆面全部文字，找這位武將的名字
                await clickButton('^(?:[Bb]tn)?AcLeave$');
                await delay(1500);
                await backToLobbyBar();
                await closeMissionLayers();
                // 走動武將的名牌（HallStageCrowd，輪替隨機）不是任務牆內容，略過；否則輪到修業中的武將上場就誤判
                const wallTexts = (await rm.textsUnder('^lobby-hall-screen$', '^HallStageCrowd$')) || [];
                let dialogTexts = [];
                let wallError = null;
                try {
                    await openFirstWallCard(rec);
                    dialogTexts = (await rm.textsUnder(MISSION_DIALOG)) || [];
                    await acShot('03-taskwall-detail');
                    // 點「委任」看候選（若有）；只收集文字，不執行
                    await clickByText('.*', '^\\s*委任\\s*$');
                    await delay(1500);
                    dialogTexts = dialogTexts.concat((await rm.textsUnder(MISSION_DIALOG)) || [], (await rm.textsUnder('^HallBoardHost$')) || []);
                    await acShot('03-taskwall-delegate');
                } catch (e) { wallError = String((e && e.message) || e).split('\n')[0]; }
                await closeMissionLayers();
                const all = [...wallTexts, ...dialogTexts];
                const listed = all.filter((t) => youthName && t.includes(youthName));
                ar.taskWall = { youthName, listed: listed.length > 0, listedInWall: wallTexts.filter((t) => youthName && t.includes(youthName)).length, listedInDialog: dialogTexts.filter((t) => youthName && t.includes(youthName)).length, listedTexts: listed.slice(0, 6), wallError, dialogTextSample: dialogTexts.slice(0, 20) };
                rec.detail.taskWall = ar.taskWall;
                const inRegistry = Array.isArray(ar.occupancy.occupiedIds) && ar.occupancy.occupiedIds.includes(youthId);
                if (!inRegistry) throw new Error(`占用登記表沒有修業中的武將 ${youthId}（occupancy.query occupiedIds：${JSON.stringify(ar.occupancy.occupiedIds)}）`);
                if (listed.length) throw new Error(`修業中的武將「${youthName}」仍出現在任務牆畫面文字：${listed.slice(0, 3).join(' / ')}`);
                return rec.detail;
            }, { skipIfFailed: true });

            // 10-4. 36 回合：每回合真滑鼠「訓練／休息 → 確認結算」；遇專屬互動與打斷點照規則點；關鍵點截圖
            await step('academy-36-turns', async (rec) => {
                await requireLobby();
                const opened = await openAcademyMenu();
                if (!opened) throw new Error('底欄「培育」→「學府修業中」打不開');
                await delay(2000);
                const seenInterrupt = new Set();
                const turnLog = [];
                let guard = 0;
                let lastTurn = 0;
                let stuckSince = Date.now();
                const deadline = Date.now() + 25 * 60 * 1000;
                while (Date.now() < deadline) {
                    guard++;
                    const st = await readAcademy();
                    if (!st.hasRecord || st.graduated) break;
                    if (st.turn !== lastTurn) { lastTurn = st.turn; stuckSince = Date.now(); }
                    const buttons = await listButtons();
                    if (Date.now() - stuckSince > 90000) throw new Error(`第 ${st.turn} 回合卡住超過 90 秒（打斷 ${st.pendingInterrupt}、精力 ${st.energy}、按鈕 ${buttons.join('、')}）`);
                    if (st.pendingInterrupt) {
                        const key = `${st.pendingInterrupt}@${st.turn}`;
                        if (!seenInterrupt.has(key)) {
                            seenInterrupt.add(key);
                            await delay(800);
                            const texts = (await rm.allTexts()).slice(0, 40);
                            const tag = { MIDTERM: '04-midterm-interrupt', COMING_OF_AGE: '06-coming-of-age-interrupt', RESONANCE: 'x-resonance-interrupt', GRADUATION: '08-graduation-interrupt' }[st.pendingInterrupt] || `x-${st.pendingInterrupt}`;
                            await acShot(tag);
                            ar.interrupts.push({ kind: st.pendingInterrupt, turn: st.turn, options: st.interruptOptions, texts, screenshot: `ac-${tag}.png` });
                        }
                        if (buttons.some((n) => /^(?:[Bb]tn)?AcInterrupt$/.test(n)) && await clickButton('^(?:[Bb]tn)?AcInterrupt$')) {
                            await delay(1000);
                            if (st.pendingInterrupt === 'MIDTERM' || st.pendingInterrupt === 'COMING_OF_AGE') {
                                await acShot(st.pendingInterrupt === 'MIDTERM' ? '05-after-midterm-reward-toast' : '07-after-coming-of-age-toast');
                                ar.interrupts[ar.interrupts.length - 1].afterTexts = (await rm.allTexts()).slice(0, 30);
                            }
                        } else if (buttons.some((n) => /^(?:[Bb]tn)?AcConfirm$/.test(n))) {
                            // 前一回合結算畫面還沒關：打斷鈕要確認結算後才出現
                            await clickButton('^(?:[Bb]tn)?AcConfirm$'); await delay(900);
                        } else { await delay(800); }
                        continue;
                    }
                    if (buttons.some((n) => /^(?:[Bb]tn)?AcConfirm$/.test(n))) {
                        // 結算確認；第 1 回合與第 36 回合結算畫面截圖
                        if (st.turn === 1 && !ar.screenshots.some((s) => /ac-02b-/.test(s))) await acShot('02b-turn1-settle');
                        if (st.turn === 36) await acShot('08a-turn36-settle');
                        if (await clickButton('^(?:[Bb]tn)?AcConfirm$')) await delay(900);
                        continue;
                    }
                    if (st.eventPending) { if (await clickButton('^(?:[Bb]tn)?AcEventA$')) await delay(900); else await delay(600); continue; }
                    if (st.debatePending) {
                        if (st.handLen === 0) { if (await clickButton('^(?:[Bb]tn)?AcSkip$')) await delay(900); else await delay(600); continue; }
                        for (let i = 0; i < Math.min(3, st.handLen); i++) { await clickButton(`^(?:[Bb]tn)?AcCard${i}$`); await delay(350); }
                        if (await clickButton('^(?:[Bb]tn)?AcDebate$')) await delay(900);
                        continue;
                    }
                    const train = st.energy >= 20;
                    const t = st.turn;
                    if (await clickButton(train ? '^(?:[Bb]tn)?AcTrain_int$' : '^(?:[Bb]tn)?AcRest$')) {
                        turnLog.push({ turn: t, action: train ? 'TRAIN:int' : 'REST', energyBefore: st.energy });
                        await delay(900);
                        if (t === 1) await acShot('02a-turn1-after-train');
                    } else {
                        await delay(700);
                    }
                    if (guard > 1500) throw new Error('36 回合迴圈超過 1500 次仍未結業');
                }
                const fin = await readAcademy();
                ar.turnsPlayed = turnLog.length;
                rec.detail.turnsPlayed = turnLog.length;
                rec.detail.lastTurn = lastTurn;
                rec.detail.graduated = fin.graduated || !fin.hasRecord;
                rec.detail.interrupts = ar.interrupts.map((i) => `${i.kind}@${i.turn}`);
                rec.detail.finalStats = fin.stats;
                ar.nodeCounts.beforeGraduation = await page.evaluate(() => (window.__pt.nodeCount ? window.__pt.nodeCount() : null)).catch(() => null);
                if (!fin.graduated && fin.hasRecord) throw new Error(`36 回合沒走完：停在第 ${fin.turn} 回合`);
                return rec.detail;
            }, { skipIfFailed: true });

            // 10-5. 結業：結算彈窗出現（評級、新戰法顯示中文名）→ 關閉 → 回大廳；9191（結業串接推季）尚未完成，推季與清紀錄屬待辦
            await step('academy-graduation', async (rec) => {
                const found = await waitUntil(async () => (await listButtons()).some((n) => /^(?:[Bb]tn)?Academy(?:Grad|Graduation)Close(?:Button)?$/.test(n)), 30000, '').catch(() => false);
                rec.detail.popupFound = !!found;
                const texts = (await rm.allTexts()).slice(0, 60);
                ar.graduationTexts = texts;
                await acShot('09-graduation-popup');
                const st = await readAcademy();
                rec.detail.learnedTactics = st.learnedTactics;
                rec.detail.graduationTexts = texts;
                if (!found) throw new Error(`結業後 30 秒內沒有出現結業結算彈窗（btnAcademyGradClose）；畫面按鈕：${(await listButtons()).join('、')}`);
                const raw = texts.filter((t) => /TACTIC_|TRT_|ITEM_/.test(t));
                if (raw.length) rec.detail.rawIdTexts = raw;
                await clickButton('^(?:[Bb]tn)?Academy(?:Grad|Graduation)Close(?:Button)?$');
                await delay(2000);
                await backToLobbyBar();
                await acShot('10-back-to-lobby');
                const after = await readAcademy();
                ar.seasonsAfter = after.seasons;
                ar.seasonAfterGraduation = (await readSeason()).text;
                rec.detail.after = { hasRecord: after.hasRecord, seasons: after.seasons, season: ar.seasonAfterGraduation };
                if (raw.length) throw new Error(`結業彈窗出現未翻成中文的 id：${raw.slice(0, 3).join(' / ')}`);
                return rec.detail;
            }, { skipIfFailed: true });

            // 10-6. 收尾：apiCalls、評級、節點數、報告
            await step('academy-report', async (rec) => {
                ar.apiCalls = await summarizeApi();
                ar.nodeCounts.final = await page.evaluate(() => (window.__pt.nodeCount ? window.__pt.nodeCount() : null)).catch(() => null);
                ar.graduationRating = await page.evaluate(async () => {
                    const loader = await window.System.import('chunks:///_virtual/ServiceLoader.ts');
                    const g = loader.services().session.roster.find((x) => x.graduationRating);
                    return g ? g.graduationRating : null;
                }).catch(() => null);
                ar.todo.push('結業後推進一季與清除修業紀錄：待 PROG-2-9191（結業串接）完成後補驗與截圖');
                ar.todo.push('打斷彈窗改讀劇情 base 事件定義（STY-M）、開獎 toast 接線：待 PROG-2-9190；目前畫面是占位打斷鈕「以預設選項繼續」');
                ar.finishedAt = new Date().toISOString();
                writeAcademyReport();
                rec.detail.apiCalls = ar.apiCalls;
                return rec.detail;
            });
            writeAcademyReport();
        }

        report.finishedAt = new Date().toISOString();
    } catch (error) {
        report.fatal = String((error && error.stack) || error);
        console.error(`[playtest] 致命錯誤：${report.fatal}`);
    } finally {
        report.passed = report.steps.length > 0 && report.steps.every((s) => s.ok) && !report.fatal;
        report.consoleErrors = collector.entries.filter((e) => e.kind !== 'pageerror' && e.kind !== 'known-env-error').map((e) => e.detail);
        report.knownEnvErrors = collector.entries.filter((e) => e.kind === 'known-env-error').map((e) => e.detail);
        report.pageErrors = collector.entries.filter((e) => e.kind === 'pageerror').map((e) => e.detail);
        fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
        if (page) await page.close().catch(() => undefined);
        if (context) await context.close().catch(() => undefined);
        shuttingDown = true;
        if (browser) await browser.close().catch(() => undefined);
        if (staticServer) staticServer.server.close();
        exitCode = report.passed ? 0 : (report.fatal && report.steps.length === 0 ? 2 : 1);
    }

    const passCount = report.steps.filter((s) => s.ok).length;
    console.log(`[playtest] 結果：${passCount}/${report.steps.length} 步通過，console error ${report.consoleErrors.length} 筆，pageerror ${report.pageErrors.length} 筆，已知環境錯誤：${report.knownEnvErrors.length} 筆`);
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

/** 開機步驟失敗時的中止原因（純函式，供單元測試） */
function buildBootAbortReason(rec) {
    if (!rec) return '開機步驟未執行';
    const texts = rec.detail && rec.detail.lastLoadingTexts;
    return `${rec.reason || '開機步驟失敗'}${texts && texts.length ? `（最後畫面文字：${texts.join('|')}）` : ''}`;
}

if (require.main === module) {
    main().then((code) => { process.exitCode = code; }, (error) => {
        console.error(`[playtest] ${error && error.stack || error}`);
        process.exitCode = 2;
    });
}

module.exports = { parseArgs, parseViewport, DEFAULT_URL, buildBootAbortReason };
