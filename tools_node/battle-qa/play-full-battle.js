#!/usr/bin/env node
/**
 * play-full-battle.js — 戰場 MVP 整場實跑（自動化 QA 工具）
 *
 * 用途：在本機預覽（預設 http://localhost:7456）上，從標題畫面進到戰場，逐回合部署兵種卡並結束回合，
 *       直到出現結果彈窗，再點返回大廳。每回合記錄雙方主將、單位與主控台錯誤，輸出 report.json / report.md。
 *
 * 用法：
 *   node tools_node/battle-qa/play-full-battle.js
 *   node tools_node/battle-qa/play-full-battle.js --duel reject --ultimate --max-turns 30
 *   node tools_node/battle-qa/play-full-battle.js --out D:/qa/run1
 *
 * 參數：
 *   --url <網址>           預覽網址（預設 http://localhost:7456）
 *   --browser-url <網址>   既有 Chrome 遠端除錯位址（預設 http://127.0.0.1:9333）；連不上會自行啟動 Chrome
 *   --duel accept|reject   單挑邀請回應（預設 accept）
 *   --ultimate             SP 滿時點「發動」並選第一個技能，以 SP 是否下降判定有沒有放出去；同時每回合點一次計謀按鈕
 *   --max-turns <n>        回合上限（預設 60）
 *   --out <資料夾>          輸出資料夾（預設系統暫存目錄下 battle-qa-<時間戳>）
 *   --fresh                開預覽前清空該來源的 localStorage／sessionStorage／IndexedDB（全新玩家），並改走真實大廳流程
 *                          （信件「關閉」、季報「婉言謝絕」→「收起季報」、出征→戰場→戰前偵查出征）
 *   --general <武將 id>     指定主將，只能配 --fresh：宿命轉蛋免費重轉到抽中這位名將才收下
 *                          （zhang-fei｜wei-yan｜xiahou-dun｜zhang-he｜sun-ce｜gan-ning）；不改遊戲、不寫存檔
 *   --second-battle        第一場打完回大廳後再進第二場（一般戰鬥），只截圖並記下計謀鈕文字，不打完
 *   --deploy-mode <模式>   full（預設，每回合部署到上限）｜one-per-turn（每回合 1 隊）｜first-turn-one（只第 1 回合 1 隊，之後只結束回合）
 *
 * 流程：
 *   1. 連瀏覽器、開新分頁（1920x1080）、等 cc 與場景載入。
 *   2. 注入 enter-battle.js 並輪詢 window.__enterBattle（上限 120 秒）。
 *      若沒進到戰場，改走大廳備用流程（新手開場、出　戰、親自指揮）。
 *   3. 每回合：若有卡片節點且最前排（深度 0）有空格，拖一張卡部署（卡與路每回合輪換）；
 *      再點「結束回合」；等回合數前進，逾時 20 秒判定卡住。
 *   4. 途中處理單挑邀請（接受／拒絕）與教學面板「收起」。
 *   5. 偵測結果彈窗（勝利／失敗／平局 + 返回大廳），點「返回大廳」，等場景變成 LobbyScene。
 *   6. 輸出報告與截圖。離開碼：全程串通為 0，否則為 1。
 *
 * 注意：本工具只讀取與操作執行中的遊戲，不修改遊戲程式與資產。
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ENTER_JS = path.join(__dirname, 'enter-battle.js');
const CHROME_PATH = process.env.BATTLE_QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// enter-battle.js 內 window.__bq 輔助函式的定義段（到 window.__enterBattle 之前）
const HELPER_SRC = (() => {
  const src = fs.readFileSync(ENTER_JS, 'utf8');
  const cut = src.indexOf("window.__enterBattle = 'running';");
  if (cut < 0) throw new Error('enter-battle.js 結構已改變：找不到 window.__enterBattle 起點');
  return src.slice(0, cut);
})();

// 戰場專用投影與點擊（注入到頁面，供所有 page.evaluate 呼叫）
// 戰場 UI 節點座標以畫面中心為原點，與 enter-battle.js 的 toClient 假設不同，所以戰場內一律走「節點 → 螢幕像素 → 視窗座標」
const PAGE_EXTRA_SRC = `window.__bqx = (() => {
  const canvasEl = () => document.getElementById('GameCanvas') || document.querySelector('canvas');
  const toClient = (sx, sy) => { const cv = canvasEl(); const r = cv.getBoundingClientRect(); return [r.left + sx * r.width / cv.width, r.top + (cv.height - sy) * r.height / cv.height]; };
  const uiCam = () => { const c = cc.director.getScene().getComponentInChildren(cc.Canvas); return c ? c.cameraComponent : null; };
  const nodeClient = (node) => { const sp = new cc.Vec3(); uiCam().worldToScreen(node.worldPosition, sp); return toClient(sp.x, sp.y); };
  const cellClient = (lane, depth) => {
    const b = window.__bq.battle(); const ur = b.unitRenderer;
    const worldCam = ur.worldCamera || ur.canvasNode.getComponentInChildren(cc.Camera);
    const wp = b.boardRenderer.getCellWorldPosition(lane, depth, 0);
    const sp = new cc.Vec3(); worldCam.worldToScreen(wp, sp); return toClient(sp.x, sp.y);
  };
  const mouseOn = (type, x, y) => canvasEl().dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true, cancelable: true }));
  const click = (x, y) => { mouseOn('mousedown', x, y); mouseOn('mouseup', x, y); };
  // 比對前把連續空白（含換行）壓成一個空白：快照的文字就是這樣正規化的，兩行字的按鈕（計謀＋點數）才點得到
  const norm = (t) => t.split(/\\s+/).filter(Boolean).join(' ');
  const tapText = (text, pick) => {
    const hits = []; const want = norm(text);
    window.__bq.walk(cc.director.getScene(), (n) => { for (const c of n.components || []) { if (typeof c.string === 'string' && norm(c.string) === want && window.__bq.visible(n)) hits.push(n); } return false; });
    if (!hits.length) return false;
    const idx = pick === undefined || pick < 0 ? hits.length + (pick === undefined ? -1 : pick) : pick;
    const [x, y] = nodeClient(hits[idx]); click(x, y); return true;
  };
  const drag = async (from, to) => {
    mouseOn('mousedown', from[0], from[1]);
    for (let i = 1; i <= 10; i += 1) { await new Promise((r) => setTimeout(r, 30)); mouseOn('mousemove', from[0] + (to[0] - from[0]) * i / 10, from[1] + (to[1] - from[1]) * i / 10); }
    await new Promise((r) => setTimeout(r, 30)); mouseOn('mouseup', to[0], to[1]); return true;
  };
  return { toClient, nodeClient, cellClient, click, tapText, drag, uiCam };
})();`;

const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const elapsed = () => `${((Date.now() - T0) / 1000).toFixed(1)}s`;
function log(msg) { console.log(`[${elapsed()}] ${msg}`); }

class QaError extends Error {
  constructor(step, message, texts) {
    super(`[${step}] ${message}`);
    this.step = step;
    this.texts = texts || [];
  }
}

// ---------- 參數 ----------
// --general 用：六位宿命名將的 id 與畫面上顯示的名字
const STARTER_NAMES = { 'zhang-fei': '張飛', 'wei-yan': '魏延', 'xiahou-dun': '夏侯惇', 'zhang-he': '張郃', 'sun-ce': '孫策', 'gan-ning': '甘寧' };

function parseArgs(argv) {
  const o = { url: 'http://localhost:7456', browserUrl: 'http://127.0.0.1:9333', duel: 'accept', ultimate: false, maxTurns: 60, out: '', fresh: false, deployMode: 'full' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => { i += 1; if (i >= argv.length) throw new Error(`參數 ${a} 缺少值`); return argv[i]; };
    if (a === '--url') o.url = next();
    else if (a === '--browser-url') o.browserUrl = next();
    else if (a === '--duel') o.duel = next();
    else if (a === '--ultimate') o.ultimate = true;
    else if (a === '--max-turns') o.maxTurns = Number(next());
    else if (a === '--out') o.out = next();
    else if (a === '--fresh') o.fresh = true;
    else if (a === '--second-battle') o.secondBattle = true;
    else if (a === '--deploy-mode') o.deployMode = next();
    else if (a === '--general') o.general = next();
    else throw new Error(`未知參數：${a}`);
  }
  if (!['accept', 'reject'].includes(o.duel)) throw new Error('--duel 只接受 accept 或 reject');
  if (o.general && !STARTER_NAMES[o.general]) throw new Error(`--general 只接受 ${Object.keys(STARTER_NAMES).join('、')}`);
  if (o.general && !o.fresh) throw new Error('--general 要配 --fresh（靠宿命轉蛋重轉選主將）');
  if (!['full', 'one-per-turn', 'first-turn-one'].includes(o.deployMode)) throw new Error('--deploy-mode 只接受 full、one-per-turn 或 first-turn-one');
  if (!Number.isFinite(o.maxTurns) || o.maxTurns < 1) throw new Error('--max-turns 必須是正整數');
  if (!o.out) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    o.out = path.join(os.tmpdir(), `battle-qa-${ts}`);
  }
  return o;
}

// ---------- 頁面操作 ----------
// 頁面評估：遇到整頁重新整理（執行環境被銷毀）時重新注入輔助函式後重試
async function ev(page, fn, ...args) {
  let lastErr = null;
  for (let i = 0; i < 4; i += 1) {
    try {
      return await page.evaluate(fn, ...args);
    } catch (e) {
      lastErr = e;
      if (!/Execution context was destroyed|Cannot find context|Target closed|Session closed|is not defined/i.test(e.message)) throw e;
      await sleep(2000);
      await ensureHelpers(page);
    }
  }
  throw lastErr;
}

// 戰場內點文字（經 window.__bqx 以視窗座標點擊）
function tapText(page, text, pick) {
  return ev(page, (t, p) => window.__bqx.tapText(t, p), text, pick);
}

async function ensureHelpers(page) {
  const has = await page.evaluate(() => !!window.__bq).catch(() => false);
  if (has) return;
  await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director && cc.director.getScene(), { timeout: 120000 });
  await page.addScriptTag({ content: HELPER_SRC });
  await page.addScriptTag({ content: PAGE_EXTRA_SRC });
}

// 頁面端：掃描場景文字、戰場狀態與卡片（在瀏覽器內執行）
function pageSnapshot() {
  const bq = window.__bq;
  const scene = cc.director.getScene();
  if (!scene) return { scene: '(無)', battle: false, texts: [] };
  const texts = [];
  const seen = new Set();
  const walk = (n) => {
    for (const c of n.components || []) {
      if (typeof c.string === 'string' && c.string.trim()) {
        let vis = true;
        for (let p = n; p; p = p.parent) if (p.active === false) { vis = false; break; }
        const t = c.string.trim().replace(/\s+/g, ' ').slice(0, 60);
        if (vis && !seen.has(t)) { seen.add(t); texts.push(t); }
      }
    }
    for (const ch of n.children) walk(ch);
  };
  walk(scene);
  const out = { scene: scene.name, battle: false, texts: texts.slice(0, 200) };
  const b = bq.battle();
  if (!b) return out;
  out.battle = true;
  const ctrl = b.ctrl;
  const s = ctrl.state;
  let turn = null;
  for (const k of Object.keys(ctrl)) {
    const v = ctrl[k];
    if (v && typeof v.getSnapshot === 'function') {
      try { turn = v.getSnapshot().turn; } catch (e) { turn = null; }
      if (turn != null) break;
    }
  }
  if (turn == null) {
    const m = texts.join(' ').match(/第\s*(\d+)\s*回合/);
    if (m) turn = Number(m[1]);
  }
  out.turn = turn;
  const pg = s.playerGeneral;
  const eg = s.enemyGeneral;
  const gen = (g) => (g ? { name: g.name, hp: g.currentHp, maxHp: g.maxHp, sp: g.currentSp, maxSp: g.maxSp } : null);
  out.playerGeneral = gen(pg);
  // 單挑邀請是否已經發生並結算（我方發起時沒有接受／拒絕視窗，只能直接問控制器）
  out.duelResolved = typeof ctrl.isDuelChallengeResolved === 'function' ? !!ctrl.isDuelChallengeResolved() : null;
  out.enemyGeneral = gen(eg);
  out.fortress = { player: s.playerFortressHp, enemy: s.enemyFortressHp };
  out.ended = !!s.battleEndAnnounced;
  const playerFaction = pg ? pg.faction : null;
  out.units = [...s.units.values()].map((u) => ({
    id: u.id,
    side: u.faction === playerFaction ? '我方' : '敵方',
    lane: u.lane,
    depth: u.depth,
    hp: u.currentHp,
    maxHp: u.maxHp,
    name: u.name,
    type: u.type,
  }));
  const cards = [];
  bq.walk(scene, (n) => {
    if (/^TallyCard\d+$/.test(n.name)) {
      let client = null;
      try { client = window.__bqx.nodeClient(n); } catch (e) { client = null; }
      cards.push({ name: n.name, active: n.activeInHierarchy, client });
    }
    return false;
  });
  out.cards = cards;
  return out;
}

// 頁面端：目前畫面上某文字是否可見
function pageSceneName() {
  const s = cc.director.getScene();
  return s ? s.name : '(無)';
}

// 頁面端：大廳備用流程單步（在 LoginScene／LobbyScene 內推進到戰場）
function pageLobbyTick(wantName, skip) {
  const bq = window.__bq;
  const sn = cc.director.getScene() ? cc.director.getScene().name : '(無)';
  const out = { scene: sn, battle: !!bq.battle(), action: null };
  if (out.battle) return out;
  // skip：連點好幾次都沒反應的字先跳過（例如畫面上殘留、點了沒作用的「關閉」），讓後面的按鈕有機會被按到（PROG-2-9339）
  const skipped = new Set(skip || []);
  const tryTap = (t) => {
    if (skipped.has(t)) return false;
    if (bq.findLabels(t).length) { bq.tapLabel(t); out.action = `點「${t}」`; return true; }
    return false;
  };
  if (sn === 'LoginScene') {
    if (!tryTap('開始遊戲')) { bq.tapWorld(960, 540); out.action = '點畫面中央'; }
    return out;
  }
  // 幕府大廳的新手教學（1/3 下一步）、城市 hub 的「出征 → 戰場」，以及戰前確認的「親自指揮」
  // 全新玩家：三國季報先按「婉言謝絕」再按右上「收起季報」（致你的一封信用「關閉」）
  // 戰前偵查若兵勢劣勢會出現「強行出征」（與 enter-battle.js 同），之後「出征」為戰前偵查的確認鈕
  // 季報裡的市井奇遇要先二選一才能收起，選項名稱每則不同：說明文字寫著「某選項：無事發生」，就點那個選項（PROG-2-9339）
  let idle = null;
  bq.walk(cc.director.getScene(), (n) => {
    for (const c of n.components || []) {
      if (typeof c.string !== 'string' || !bq.visible(n)) continue;
      const m = c.string.match(/([^\s／/：:]+)[：:]無事發生/);
      if (m) idle = m[1];
    }
    return false;
  });
  if (idle && tryTap(idle)) return out;
  const order = ['婉言謝絕', '收起季報', '下一步', '開始遊戲', '下一位', '前往宿命轉蛋', '繼續', '跳過', '收起', '關閉', '親自指揮', '強行出征', '出　戰', '戰場'];
  for (const t of order) if (tryTap(t)) return out;
  if (tryTap('出征')) return out;
  // 新手開場的抽卡結果：只點「確定 · 全部收下」；指定主將（--general）時，畫面上沒有那位名將就先點「免費重轉」
  let collect = null;
  let reroll = null;
  let wanted = !wantName;
  bq.walk(cc.director.getScene(), (n) => {
    for (const c of n.components || []) {
      if (typeof c.string !== 'string' || !bq.visible(n)) continue;
      if (/全部收下/.test(c.string)) collect = n;
      if (/免費重轉/.test(c.string)) reroll = n;
      if (wantName && c.string.includes(wantName)) wanted = true;
    }
    return false;
  });
  if (collect && !wanted && reroll) { bq.tapNode(reroll); out.action = `點「免費重轉」（還沒抽中${wantName}）`; return out; }
  if (collect) { bq.tapNode(collect); out.action = '點「確定 · 全部收下」（抽卡結果）'; return out; }
  // 單抽演出階段還沒出現收下鈕：點畫面中央推進演出（不會落在「免費重轉」上）
  let reveal = false;
  bq.walk(cc.director.getScene(), (n) => {
    for (const c of n.components || []) {
      if (typeof c.string === 'string' && /絕世登場|登場/.test(c.string) && bq.visible(n)) reveal = true;
    }
    return false;
  });
  if (reveal) { bq.tapWorld(960, 540); out.action = '點畫面中央（推進抽卡演出）'; }
  return out;
}

// ---------- 瀏覽器 ----------
async function connectBrowser(opt) {
  try {
    const browser = await puppeteer.connect({ browserURL: opt.browserUrl, defaultViewport: null });
    log(`已連上既有瀏覽器 ${opt.browserUrl}`);
    return { browser, owned: false, profile: '' };
  } catch (e) {
    log(`連不上 ${opt.browserUrl}（${e.message.split('\n')[0]}），改自行啟動 Chrome`);
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'battle-qa-chrome-'));
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    userDataDir: profile,
    defaultViewport: null,
    args: ['--window-size=1920,1080', '--autoplay-policy=no-user-gesture-required'],
  });
  return { browser, owned: true, profile };
}

// ---------- 報告與截圖 ----------
const rep = {
  startedAt: new Date().toISOString(),
  options: null,
  steps: [],
  enter: null,
  entered: '',
  turns: [],
  duels: [], duelResolvedAt: null, duelTexts: [], toasts: [],
  ultimates: [],
  tactics: [],
  duelAttempt: null,
  tutorialDismissed: 0,
  consoleErrors: [],
  pageErrors: [],
  screenshots: {},
  result: null,
  backButton: null,
  lobby: null,
  failure: null,
  verdict: '',
  zeroHp: { enemy: null, player: null },
  lastGeneral: null,
  summary: null,
};
const ctx = { turn: 0 };

async function shot(page, opt, name) {
  const file = path.join(opt.out, `${name}.png`);
  try {
    await page.screenshot({ path: file });
    rep.screenshots[name] = file;
    log(`截圖：${file}`);
  } catch (e) {
    log(`截圖失敗（${name}）：${e.message.split('\n')[0]}`);
  }
}

async function runStep(name, fn) {
  const t = Date.now();
  log(`步驟開始：${name}`);
  try {
    const note = await fn();
    rep.steps.push({ name, ok: true, ms: Date.now() - t, note: note === undefined ? '' : note });
    log(`步驟完成：${name}`);
    return note;
  } catch (e) {
    rep.steps.push({ name, ok: false, ms: Date.now() - t, error: e.message, texts: e.texts || [] });
    throw e;
  }
}

// ---------- 步驟 ----------
// --fresh：清空該來源的 localStorage / sessionStorage / IndexedDB，讓遊戲當成全新玩家
async function clearOriginStorage(page, opt) {
  // 先到同源的輕量網址（不載入遊戲），避免遊戲在清除前後重複載入；localStorage 與 IndexedDB 以來源為單位，清得到
  await page.goto(new URL('/robots.txt', opt.url).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const clearFn = async () => {
    const names = [];
    try { localStorage.clear(); names.push('localStorage'); } catch (e) { /* 忽略 */ }
    try { sessionStorage.clear(); names.push('sessionStorage'); } catch (e) { /* 忽略 */ }
    if (indexedDB && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const d of dbs) {
        if (!d.name) continue;
        // 若其他分頁仍開著同一資料庫，刪除會被擋住：每個刪除最多等 3 秒就放行
        await new Promise((r) => {
          const q = indexedDB.deleteDatabase(d.name);
          q.onsuccess = q.onerror = q.onblocked = () => r();
          setTimeout(r, 3000);
        });
        names.push(`IndexedDB:${d.name}`);
      }
    }
    return names;
  };
  // 評估若遇到導頁造成執行環境被銷毀，等一下重試
  let cleared = null;
  let lastErr = null;
  for (let i = 0; i < 5 && cleared === null; i += 1) {
    try { cleared = await page.evaluate(clearFn); } catch (e) { lastErr = e; await sleep(2000); }
  }
  if (cleared === null) throw new QaError('開啟預覽', `--fresh 清除儲存失敗：${lastErr && lastErr.message}`, []);
  log(`--fresh：已清空 ${cleared.join('、') || '（無）'}`);
  return cleared;
}

async function openPreview(page, opt) {
  // 非前景分頁會被節流（rAF 停住），Cocos 大廳會卡在「正在準備大廳」或不前進；確保本分頁可見，最多重試 5 次
  for (let i = 0; i < 5; i += 1) {
    await Promise.race([page.bringToFront().catch(() => {}), sleep(3000)]);
    const vis = await page.evaluate(() => document.visibilityState).catch(() => 'unknown');
    if (vis === 'visible') break;
    await sleep(1000);
  }
  await page.setViewport({ width: 1920, height: 1080 });
  if (opt.fresh) await clearOriginStorage(page, opt);
  await page.goto(opt.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForFunction(() => typeof cc !== 'undefined' && cc.director && cc.director.getScene(), { timeout: 120000 });
  } catch (e) {
    throw new QaError('開啟預覽', '120 秒內 cc 與場景未載入（預覽可能編譯中或未啟動）', []);
  }
  await ensureHelpers(page);
  return `場景：${await ev(page, pageSceneName)}`;
}

async function enterWithHelper(page) {
  const full = fs.readFileSync(ENTER_JS, 'utf8');
  await page.addScriptTag({ content: full });
  const t0 = Date.now();
  let st = 'running';
  while (Date.now() - t0 < 120000) {
    st = await ev(page, () => window.__enterBattle);
    if (st !== 'running') break;
    await sleep(1000);
  }
  const battle = await ev(page, () => !!(window.__bq && window.__bq.battle()));
  rep.enter = { enterBattleResult: String(st).slice(0, 400), battle };
  if (battle) rep.entered = 'enter-battle.js';
  return rep.enter;
}

async function enterFromLobby(page, wantName = null) {
  const t0 = Date.now();
  let lastLog = 0;
  let lastTexts = [];
  const actions = [];
  const skipList = [];
  while (Date.now() - t0 < 300000) {
    // 同一個動作連做 4 次還在原地，就把那個字列入跳過（這次進場期間都不再點）
    const tail = actions.slice(-4);
    const stuck = tail.length === 4 && tail.every((a) => a === tail[0]) ? /點「(.+?)」/.exec(tail[0]) : null;
    // 只對已知會空點的字生效；「下一位」這類本來就要連點很多次的不能跳過
    if (stuck && ['關閉', '收起季報', '收起'].includes(stuck[1]) && !skipList.includes(stuck[1])) { skipList.push(stuck[1]); log(`大廳備用流程：「${stuck[1]}」連點 4 次沒反應，先跳過`); }
    const r = await ev(page, pageLobbyTick, wantName, skipList);
    if (r.action) actions.push(`${r.scene}:${r.action}`);
    if (r.battle) {
      rep.entered = 'lobby-fallback';
      return { actions: actions.slice(-40), scene: r.scene };
    }
    if (Date.now() - lastLog > 15000) {
      lastLog = Date.now();
      const snap = await ev(page, pageSnapshot);
      lastTexts = snap.texts;
      log(`大廳備用流程：場景 ${snap.scene}，已執行 ${actions.length} 個動作`);
    }
    await sleep(1200);
  }
  throw new QaError('進場', `300 秒內沒有進到戰場（最後動作：${actions.slice(-3).join(' → ')}）`, lastTexts);
}

// 頁面端：包一層提示函式（保留原行為），把遊戲實際跳過的每一句提示收起來，回傳上次讀取之後的新提示。
// 提示只停幾秒，又會被下一句蓋掉，光靠定時讀畫面文字會漏（PROG-2-9338）
function pageDrainToasts() {
  const b = window.__bq.battle();
  const rt = b && (b._deployPanelRuntime || b.deployRuntime);
  if (!rt || typeof rt.showToast !== 'function') return null;
  if (!window.__bqToasts) window.__bqToasts = [];
  if (!rt.__bqToastWrapped) {
    const orig = rt.showToast;
    rt.showToast = function (...args) { window.__bqToasts.push(String(args[0])); return orig.apply(this, args); };
    rt.__bqToastWrapped = true;
  }
  return window.__bqToasts.splice(0);
}

// 頁面端：包一層 ctrl.tryDeployTroop（保留原行為與回傳值），每次呼叫的結果記到 window.__bqDeployLog
function pageInstallDeployWrap() {
  const b = window.__bq.battle();
  if (!b || !b.ctrl || typeof b.ctrl.tryDeployTroop !== 'function') return false;
  if (!window.__bqDeployLog) window.__bqDeployLog = [];
  const c = b.ctrl;
  if (!c.__bqWrapped) {
    const orig = c.tryDeployTroop;
    c.tryDeployTroop = function (...args) {
      const r = orig.apply(this, args);
      window.__bqDeployLog.push({ type: args[0] == null ? null : String(args[0]), lane: args[1], ok: !!(r && r.ok), reason: (r && r.reason) || null, reasons: (r && r.reasons) || null, suggestion: (r && r.suggestion) || null });
      return r;
    };
    c.__bqWrapped = true;
  }
  return true;
}

// 頁面端：本回合部署進度 { used, limit, reached }
function pageDeployProgress() {
  const b = window.__bq.battle();
  if (!b || !b.ctrl || typeof b.ctrl.getPlayerDeployProgress !== 'function') return null;
  return b.ctrl.getPlayerDeployProgress();
}

// 頁面端：糧草與軍勢狀態。軍勢帳本來自 ctrl.getSortieState()；services.battle 的糧草不掛在 window 上，
// 只能從 ctrl 欄位（最多兩層）找出 getSnapshot() 含 playerFood 的物件，找不到就記「無法取得」。
function pageSupply() {
  const b = window.__bq.battle();
  const out = { sortie: null, battleFood: '無法取得', note: '' };
  if (!b || !b.ctrl) { out.note = '戰場元件不存在'; return out; }
  const c = b.ctrl;
  const st = typeof c.getSortieState === 'function' ? c.getSortieState() : null;
  if (st) {
    out.sortie = { food: st.food, maxFood: st.maxFood, foodSpent: st.foodSpent, poolCurrent: st.poolCurrent, poolMax: st.poolMax, militiaDeployed: st.militiaDeployed, eliteDeployed: st.eliteDeployed, tacticCurrent: st.tacticCurrent, tacticMax: st.tacticMax };
  }
  const seen = new Set();
  const probe = (obj, depth) => {
    if (!obj || typeof obj !== 'object' || seen.has(obj) || depth < 0) return null;
    seen.add(obj);
    for (const k of Object.keys(obj)) {
      let v;
      try { v = obj[k]; } catch (e) { continue; }
      if (!v || typeof v !== 'object') continue;
      if (typeof v.getSnapshot === 'function') {
        try { const sn = v.getSnapshot(); if (sn && typeof sn.playerFood === 'number') return sn.playerFood; } catch (e) { /* 忽略 */ }
      }
      if (Object.getPrototypeOf(v) !== Object.prototype && !Array.isArray(v) && !(v instanceof Map) && !(v instanceof Set)) {
        const r = probe(v, depth - 1);
        if (r != null) return r;
      }
    }
    return null;
  };
  const food = probe(c, 2);
  if (food != null) out.battleFood = food;
  else out.note = 'ctrl 兩層內找不到 services.battle（window 也未掛 services）；糧草請看 sortie.food';
  return out;
}

const DEPLOY_MAX_ATTEMPTS = 12;
const DEPLOY_MAX_CONSEC_FAIL = 2;

// 回合內持續部署：直到 getPlayerDeployProgress().reached、沒有可用卡或空格、或連續失敗 2 次為止。
// 每次挑一個尚未試過的空的最前排格（深度 0），用真實滑鼠拖曳部署；失敗原因取自 tryDeployTroop 的回傳。
// 部署模式：本回合允許成功部署的隊數上限
//   full＝不限（到遊戲上限為止）；one-per-turn＝每回合 1 隊；first-turn-one＝只有第 1 回合 1 隊，之後 0 隊
function deployAllowance(opt, turnRec) {
  if (opt.deployMode === 'one-per-turn') return 1;
  if (opt.deployMode === 'first-turn-one') return turnRec.isFirstTurn ? 1 : 0;
  return Infinity;
}

async function tryDeploy(page, s, turnRec, opt) {
  const LANES = 5;
  turnRec.deployAttempts = [];
  turnRec.deployOk = 0;
  const allow = deployAllowance(opt, turnRec);
  if (allow === 0) { turnRec.deployStop = `部署模式 ${opt.deployMode}：本回合不部署`; turnRec.deploy = turnRec.deployStop; return; }
  const wrapped = await ev(page, pageInstallDeployWrap);
  if (!wrapped) { turnRec.deploy = '無法包裝 tryDeployTroop（戰場元件不存在）'; return; }
  const triedLanes = new Set();
  let consecFail = 0;
  let stop = '';
  let snap = s;
  for (let k = 0; k < DEPLOY_MAX_ATTEMPTS; k += 1) {
    if (turnRec.deployOk >= allow) { stop = `部署模式 ${opt.deployMode}：本回合已部署 ${turnRec.deployOk} 隊，停止`; break; }
    const prog = await ev(page, pageDeployProgress);
    if (prog && prog.reached) { stop = `已達單回合上限 ${prog.used}/${prog.limit}`; break; }
    if (snap.turn !== turnRec.turn) { stop = '回合已前進'; break; }
    const occupied = new Set(snap.units.filter((u) => u.depth === 0).map((u) => u.lane));
    const lane = [0, 1, 2, 3, 4].find((l) => l < LANES && !occupied.has(l) && !triedLanes.has(l));
    if (lane === undefined) { stop = '沒有可用的空部署格'; break; }
    const usable = snap.cards.filter((c) => c.active && c.client);
    if (!usable.length) { stop = '無可用卡片節點'; break; }
    const card = usable[(turnRec.turn + k) % usable.length];
    triedLanes.add(lane);
    const to = await ev(page, (l, d) => window.__bqx.cellClient(l, d), lane, 0);
    const logFrom = await ev(page, () => (window.__bqDeployLog || []).length);
    const unitsBefore = snap.units.length;
    await ev(page, (f, t) => window.__bqx.drag(f, t), card.client, to);
    await sleep(900);
    const calls = await ev(page, (i) => (window.__bqDeployLog || []).slice(i), logFrom);
    snap = await ev(page, pageSnapshot);
    const placed = snap.units.some((u) => u.side === '我方' && u.lane === lane && u.depth === 0) && snap.units.length > unitsBefore;
    const last = calls.length ? calls[calls.length - 1] : null;
    let failReason = null;
    if (!placed) failReason = !last ? '未觸發部署（拖曳未進入 tryDeployTroop）' : (last.ok ? '呼叫成功但單位未出現' : (last.reason || 'unknown'));
    turnRec.deployAttempts.push({
      n: k + 1, card: card.name, lane, depth: 0, placed, failReason,
      call: last ? { type: last.type, ok: last.ok, reason: last.reason, reasons: last.reasons, suggestion: last.suggestion, calls: calls.length } : null,
      unitsBefore, unitsAfter: snap.units.length,
    });
    if (placed) {
      turnRec.deployOk += 1;
      consecFail = 0;
      if (!turnRec.deployed) turnRec.deployed = { card: card.name, lane, depth: 0 };
    } else {
      consecFail += 1;
      if (consecFail >= DEPLOY_MAX_CONSEC_FAIL) { stop = `連續失敗 ${consecFail} 次`; break; }
    }
  }
  if (!stop) stop = `達單回合嘗試上限 ${DEPLOY_MAX_ATTEMPTS} 次`;
  turnRec.deployStop = stop;
  if (!turnRec.deployAttempts.length) turnRec.deploy = stop;
}

// 奧義按鈕在 SP 滿時顯示「發動」（i18n ui.ultimate.ready）；點了會開技能選單，選第一招。
// 以施放後 SP 是否下降判定有沒有真的放出去，並記在報告裡。
async function maybeUltimate(page, opt, s, turnRec) {
  const pg = s.playerGeneral;
  if (!pg || !(pg.sp >= pg.maxSp) || !s.texts.includes('發動')) return;
  const before = new Set(s.texts);
  await tapText(page, '發動');
  // 選單是動態建立的，出現時間不固定：最多等 5 秒看到「選擇奧義」
  let after = null;
  for (let i = 0; i < 10; i += 1) { await sleep(500); after = await ev(page, pageSnapshot); if (after.texts.includes('選擇奧義')) break; }
  const candidates = after.texts.filter((t) => !before.has(t) && t.length >= 2 && t.length <= 14 && !/^\d+$/.test(t) && !['取消', '返回', '關閉', '選擇奧義', '未配置奧義'].includes(t));
  const rec = { turn: turnRec.turn, opened: true, candidates: candidates.slice(0, 10), picked: null, cast: false };
  // 選單滑入要 0.2 秒左右，等它定位後拍一張，用來看選單有沒有蓋到別的按鈕（每場只拍第一次）
  if (!rep.ultimates.length) { await sleep(600); await shot(page, opt, 'ultimate-popup'); }
  if (candidates.length) {
    rec.picked = candidates[0];
    await tapText(page, candidates[0]);
    await sleep(2500);
    const done = await ev(page, pageSnapshot);
    rec.cast = !!done.playerGeneral && done.playerGeneral.sp < pg.sp;
    // 施放前後敵方各隊生命的差額：看得出這一招打了誰、打多少（暈眩之類不扣血的效果不會出現在這裡）
    const hpBefore = new Map(s.units.filter((u) => u.side === '敵方').map((u) => [u.id, u]));
    const hpAfter = new Map(done.units.filter((u) => u.side === '敵方').map((u) => [u.id, u.hp]));
    rec.enemyHits = [...hpBefore.values()].map((u) => ({ name: u.name, depth: u.depth, lost: u.hp - (hpAfter.has(u.id) ? hpAfter.get(u.id) : 0), killed: !hpAfter.has(u.id) })).filter((h) => h.lost > 0);
    rec.enemyGeneralLost = s.enemyGeneral && done.enemyGeneral ? s.enemyGeneral.hp - done.enemyGeneral.hp : 0;
  } else if (after.texts.includes('取消')) {
    // 沒有可選的奧義（例如「未配置奧義」）：關掉選單，免得擋住後面的操作
    rec.unassigned = after.texts.includes('未配置奧義');
    await tapText(page, '取消');
    await sleep(600);
  }
  rep.ultimates.push(rec);
  log(`奧義：第 ${turnRec.turn} 回合，選擇 ${rec.picked || '（找不到技能選項）'}，${rec.cast ? '已施放（SP 下降）' : '未確認施放'}${rec.enemyHits ? `；敵隊損血 ${rec.enemyHits.length ? rec.enemyHits.map((h) => `${h.name}@排${h.depth + 1} -${h.lost}${h.killed ? '（擊潰）' : ''}`).join('、') : '無'}；敵主將 -${rec.enemyGeneralLost}` : ''}`);
}

// 計謀按鈕文字以「計謀」開頭（後面接點數）；每回合點一次，記錄點了之後畫面多出的文字。
async function maybeTactic(page, opt, s, turnRec) {
  const label = s.texts.find((t) => /^計謀/.test(t));
  if (!label) return;
  // 直接讀遊戲內部狀態：主將帶的戰法、計謀點、是否正在等玩家選目標
  const probe = () => ev(page, () => {
    const b = window.__bq.battle(); const c = b && b.ctrl; if (!c) return null;
    const d = c.getPlayerSeedTacticDescriptor && c.getPlayerSeedTacticDescriptor();
    const p = c.getPlayerTacticPointState ? c.getPlayerTacticPointState() : {};
    const pend = b.skillTargetingFlow && b.skillTargetingFlow.pendingSkillTargeting;
    return { skillId: d ? d.skillId : null, tacticId: d ? d.tacticId : null, targetMode: d ? d.targetMode : null,
      points: p.current, enabled: p.enabled, pending: pend ? pend.targetMode : null };
  });
  const before = new Set(s.texts);
  let rec0Tapped = false;
  const state0 = await probe();
  rec0Tapped = await tapText(page, label);
  // 提示是短暫的 Toast：每 0.3 秒看一次，把出現過的新文字都收起來
  const fresh = new Set();
  for (let i = 0; i < 5; i += 1) { await sleep(300); (await ev(page, pageSnapshot)).texts.filter((t) => !before.has(t)).forEach((t) => fresh.add(t)); }
  let state1 = await probe();
  const rec = { turn: turnRec.turn, label: label.replace(/\s+/g, ' '), tapped: rec0Tapped, newTexts: [...fresh].slice(0, 8), before: state0, afterTap: state1, target: null, after: null };
  if (!rep.tactics.length) await shot(page, opt, 'tactic-after-tap');
  if (state1 && state1.pending) {
    // 進入選目標：敵方類點最前面的敵軍，其餘點我方第一隊
    const snap = await ev(page, pageSnapshot);
    const wantEnemy = /enemy|line|fan|tile|area|adjacent/.test(state1.pending);
    const pool = (snap.units || []).filter((u) => (u.side === '敵方') === wantEnemy);
    const unit = pool.sort((a, b) => a.depth - b.depth)[0];
    if (unit) {
      rec.target = { lane: unit.lane, depth: unit.depth, side: unit.side };
      await ev(page, (l, d) => { const [x, y] = window.__bqx.cellClient(l, d); window.__bqx.click(x, y); }, unit.lane, unit.depth);
      await sleep(1500);
    }
    state1 = await probe();
    // 沒目標或沒放出去：再點一次計謀鈕取消瞄準，免得擋住後面的部署
    if (state1 && state1.pending) { const l2 = (await ev(page, pageSnapshot)).texts.find((t) => /^計謀/.test(t)); if (l2) await tapText(page, l2); await sleep(400); }
  }
  // 診斷：點了沒放出去時，直接呼叫遊戲的施放入口，記下是哪一層擋下（只在沒放出去時做）
  rec.after = await probe();
  if (turnRec.turn >= 3 && state0 && rec.after && !(rec.after.points < state0.points) && !rep.tactics.some((t) => t.diag)) {
    rec.diag = await ev(page, () => {
      const b = window.__bq.battle(); const c = b.ctrl; const out = {};
      try {
        const d = c.getPlayerSeedTacticDescriptor();
        const pg = c.state.playerGeneral;
        out.canUsePlayerSkills = c.canUsePlayerSkills();
        out.needsSp = c.seedTacticNeedsSp(); out.sp = pg ? pg.currentSp + '/' + pg.maxSp : null;
        out.hasSortie = !!c.sortie; out.flow = c.flowStateMachine && (c.flowStateMachine.state || c.flowStateMachine.current || null);
        out.hasTurnFlow = !!b.turnFlowManager; out.hasTargetingFlow = !!b.skillTargetingFlow;
        // 不直接呼叫 castBattleSkill：那會真的結算一次又不扣點，等於白送玩家一招，戰況就失真了
        out.descriptor = d ? { skillId: d.skillId, tacticId: d.tacticId, targetMode: d.targetMode } : null;
      } catch (e) { out.error = String(e && e.message || e); }
      return out;
    });
    log(`計謀診斷：${JSON.stringify(rec.diag)}`);
  }
  rec.cast = !!(state0 && rec.after && typeof state0.points === 'number' && rec.after.points < state0.points);
  rep.tactics.push(rec);
  log(`計謀：第 ${turnRec.turn} 回合 ${rec.cast ? '已施放' : '未施放'}，戰法 ${state0 ? state0.skillId : '?'}，點數 ${state0 ? state0.points : '?'} → ${rec.after ? rec.after.points : '?'}，瞄準 ${rec.afterTap ? rec.afterTap.pending : '?'}，提示 ${JSON.stringify(rec.newTexts)}`);
}

// 主動單挑：第 3 回合起，單挑鈕沒鎖時點一次，再點棋盤中路的空格把主將放上去（整場只做一次）。
async function maybeDuel(page, s, turnRec) {
  if (rep.duelAttempt || turnRec.turn < 3 || !s.texts.includes('單挑')) return;
  await tapText(page, '單挑');
  await sleep(800);
  const taken = new Set((s.units || []).map((u) => `${u.lane},${u.depth}`));
  let cell = null;
  for (const depth of [1, 2, 0, 3]) { for (const lane of [2, 1, 3, 0, 4]) { if (!cell && !taken.has(`${lane},${depth}`)) cell = { lane, depth }; } }
  if (cell) {
    await ev(page, (l, d) => { const [x, y] = window.__bqx.cellClient(l, d); window.__bqx.click(x, y); }, cell.lane, cell.depth);
    await sleep(1500);
  }
  const after = await ev(page, pageSnapshot);
  rep.duelAttempt = { turn: turnRec.turn, cell, unitsBefore: (s.units || []).length, unitsAfter: (after.units || []).length, invite: after.texts.includes('接受') };
  log(`主動單挑：第 ${turnRec.turn} 回合點「單挑」，放在 ${cell ? `路${cell.lane + 1} 深度${cell.depth}` : '（找不到空格）'}，單位數 ${rep.duelAttempt.unitsBefore} → ${rep.duelAttempt.unitsAfter}`);
}

function brief(s) {
  return {
    turn: s.turn,
    playerGeneral: s.playerGeneral,
    enemyGeneral: s.enemyGeneral,
    fortress: s.fortress,
    unitCount: { 我方: s.units.filter((u) => u.side === '我方').length, 敵方: s.units.filter((u) => u.side === '敵方').length },
    units: s.units,
  };
}

function isResult(s) {
  const hasOutcome = s.texts.some((t) => /^(勝利|失敗|平局)$/.test(t));
  return s.texts.includes('返回大廳') && (hasOutcome || s.ended);
}

function outcomeOf(texts) {
  const hit = texts.find((t) => /^(勝利|失敗|平局|撤退)$/.test(t));
  return hit || '（未對應到勝利／失敗／平局文字）';
}

async function playBattle(page, opt) {
  const deadline = Date.now() + 240000 + opt.maxTurns * 60000;
  let cur = null;
  let lastDismiss = 0;
  let dismissCount = 0;
  let resultSeenAt = 0;
  while (Date.now() < deadline) {
    const s = await ev(page, pageSnapshot);
    if (!s.battle) {
      if (s.scene === 'LobbyScene') throw new QaError('整場', '戰鬥中途回到大廳（非預期）', s.texts);
      await sleep(500);
      continue;
    }
    if (rep.stage == null) {
      // 關卡名稱：畫面上方標題（例如「虎 牢 關 之 戰」），取第一次看到戰場時符合的文字
      rep.stage = s.texts.find((t) => /之\s*[戰役]|突\s*圍|會\s*戰/.test(t) && t.length <= 20) || '（未在畫面文字找到關卡名稱）';
      log(`關卡名稱：${rep.stage}`);
    }
    if (s.enemyGeneral && s.enemyGeneral.hp <= 0 && rep.zeroHp.enemy == null) rep.zeroHp.enemy = s.turn;
    if (s.playerGeneral && s.playerGeneral.hp <= 0 && rep.zeroHp.player == null) rep.zeroHp.player = s.turn;
    rep.lastGeneral = { player: s.playerGeneral, enemy: s.enemyGeneral, turn: s.turn };
    // 我方發起的單挑由敵將自動回應，畫面只閃過提示：記下第一次結算的回合與當下所有提到單挑的文字
    if (s.duelResolved && !rep.duelResolvedAt) { rep.duelResolvedAt = s.turn; log(`單挑邀請已發生並結算：第 ${s.turn} 回合`); }
    for (const t of s.texts) {
      if (/單挑/.test(t) && t.length > 5 && !rep.duelTexts.includes(t)) {
        rep.duelTexts.push(t); log(`單挑文字（第 ${s.turn} 回合）：${t.slice(0, 80)}`);
        // 單挑提示只停幾秒：出現新文字就截一張，才看得到發起、過程、結果的畫面（PROG-2-9337）
        if (/單挑(開始|獲勝|落敗|成立)|拒絕單挑/.test(t)) await shot(page, opt, `duel-${rep.duelTexts.length}`);
      }
    }
    // 遊戲實際跳過的提示（不靠畫面取樣）：全部寫進紀錄
    const toasts = await ev(page, pageDrainToasts);
    if (toasts === null && !rep.toastWrapMissing) { rep.toastWrapMissing = true; log('提示紀錄：找不到提示元件，無法記錄跳出的提示'); }
    for (const t of toasts || []) { rep.toasts.push({ turn: s.turn, text: t }); log(`提示（第 ${s.turn} 回合）：${t.slice(0, 80)}`); }
    // 兵池見底的提示只停留 3 秒，看到就記下來，才知道玩家有沒有被告知（PROG-2-9337）
    for (const t of s.texts) { if (/軍勢已用盡|軍勢不足/.test(t) && !rep.duelTexts.includes(t)) { rep.duelTexts.push(t); log(`兵池提示（第 ${s.turn} 回合）：${t.slice(0, 80)}`); } }
    if (isResult(s)) {
      if (cur && !cur.closed) { cur.after = brief(s); cur.closed = true; cur.errorsTo = rep.consoleErrors.length; }
      rep.result = { outcome: outcomeOf(s.texts), announced: s.ended, texts: s.texts, turnAtEnd: s.turn };
      log(`結果彈窗出現：${rep.result.outcome}（回合 ${s.turn}）`);
      return 'ended';
    }
    if (s.ended) {
      if (!resultSeenAt) resultSeenAt = Date.now();
      if (Date.now() - resultSeenAt > 15000) throw new QaError('結果彈窗', '戰鬥已判定結束，但 15 秒內沒有出現結果彈窗', s.texts);
    }
    if (s.texts.includes('接受') && s.texts.includes('拒絕')) {
      const pick = opt.duel === 'accept' ? '接受' : '拒絕';
      await tapText(page, pick);
      rep.duels.push({ turn: s.turn, choice: pick, at: elapsed() });
      log(`單挑邀請：點「${pick}」`);
      await sleep(1500);
      continue;
    }
    if (s.texts.includes('收起') && dismissCount < 20 && Date.now() - lastDismiss > 4000) {
      await tapText(page, '收起');
      lastDismiss = Date.now();
      dismissCount += 1;
      rep.tutorialDismissed += 1;
      await sleep(800);
      continue;
    }
    if (s.turn != null && (!cur || cur.turn !== s.turn)) {
      if (cur && !cur.closed) { cur.after = brief(s); cur.closed = true; cur.errorsTo = rep.consoleErrors.length; }
      cur = { turn: s.turn, isFirstTurn: rep.turns.length === 0, before: brief(s), after: null, closed: false, endedAt: 0, endTurnTapped: false, errorsFrom: rep.consoleErrors.length, errorsTo: null, deployed: null, deployAttempts: [], deployOk: 0, deployStop: null, deploy: null, supplyStart: null, supplyEnd: null, ultimate: null };
      rep.turns.push(cur);
      ctx.turn = s.turn;
      log(`第 ${s.turn} 回合：我方 ${cur.before.unitCount.我方} 單位，敵方 ${cur.before.unitCount.敵方} 單位，我方主將 HP ${s.playerGeneral && s.playerGeneral.hp}，SP ${s.playerGeneral && s.playerGeneral.sp}`);
      if (s.turn > opt.maxTurns) {
        rep.turns.pop();
        rep.maxTurnsReached = true;
        return 'max-turns';
      }
      if (s.turn % 5 === 0) await shot(page, opt, `turn-${String(s.turn).padStart(2, '0')}`);
    }
    if (cur && !cur.endedAt && s.texts.includes('結束回合')) {
      // 回合開始的橫幅會蓋住棋盤、吃掉拖曳，先等橫幅消失再行動
      let ready = s;
      const bannerDeadline = Date.now() + 6000;
      while (ready.texts.some((t) => /回合開始$/.test(t)) && Date.now() < bannerDeadline) {
        await sleep(400);
        ready = await ev(page, pageSnapshot);
      }
      if (opt.ultimate) await maybeUltimate(page, opt, ready, cur);
      if (opt.ultimate) await maybeTactic(page, opt, await ev(page, pageSnapshot), cur);
      if (opt.ultimate) await maybeDuel(page, await ev(page, pageSnapshot), cur);
      cur.supplyStart = await ev(page, pageSupply);
      await tryDeploy(page, ready, cur, opt);
      cur.supplyEnd = await ev(page, pageSupply);
      const s2 = await ev(page, pageSnapshot);
      if (s2.turn === cur.turn && s2.texts.includes('結束回合')) {
        await tapText(page, '結束回合');
        cur.endTurnTapped = true;
      }
      cur.endedAt = Date.now();
      await sleep(400);
      continue;
    }
    if (cur && cur.endedAt && s.turn === cur.turn) {
      const waited = Date.now() - cur.endedAt;
      if (waited > 8000 && !cur.retapped && s.texts.includes('結束回合')) {
        cur.retapped = true;
        await tapText(page, '結束回合');
        log(`第 ${cur.turn} 回合：結束回合點擊後 8 秒仍未前進，補點一次`);
      }
      if (waited > 20000) {
        throw new QaError('回合推進', `第 ${cur.turn} 回合結束後 20 秒回合數未前進（卡住）`, s.texts);
      }
    }
    await sleep(400);
  }
  throw new QaError('整場', '超過整場逾時仍未出現結果彈窗', (await ev(page, pageSnapshot)).texts);
}

async function backToLobby(page, opt) {
  const s = await ev(page, pageSnapshot);
  const pick = ['返回大廳', '返回'].find((t) => s.texts.includes(t));
  if (!pick) throw new QaError('返回大廳', '結果彈窗上找不到「返回大廳」或「返回」按鈕', s.texts);
  rep.backButton = { tapped: pick, visibleTexts: s.texts };
  await shot(page, opt, 'result-popup');
  await tapText(page, pick);
  log(`點「${pick}」，等待回到 LobbyScene`);
  const t0 = Date.now();
  let scene = '';
  while (Date.now() - t0 < 30000) {
    scene = await ev(page, pageSceneName);
    if (scene === 'LobbyScene') break;
    await sleep(1000);
  }
  const after = await ev(page, pageSnapshot);
  rep.lobby = { ok: scene === 'LobbyScene', scene, seconds: Math.round((Date.now() - t0) / 1000), texts: after.texts.slice(0, 40) };
  if (scene !== 'LobbyScene') throw new QaError('返回大廳', `30 秒內場景未變成 LobbyScene（目前：${scene}）`, after.texts);
  await shot(page, opt, 'back-in-lobby');
  return rep.lobby;
}

// ---------- 報告 ----------
// 報告總結：回合數、勝敗、主將歸零回合、平均部署成功數、失敗原因次數
function buildSummary() {
  const turns = rep.turns;
  const totalDeployOk = turns.reduce((a, t) => a + (t.deployOk || 0), 0);
  const failReasons = {};
  for (const t of turns) {
    for (const a of t.deployAttempts || []) {
      if (a.placed) continue;
      const key = a.failReason || 'unknown';
      failReasons[key] = (failReasons[key] || 0) + 1;
    }
  }
  const lg = rep.lastGeneral || {};
  const pick = (g) => (g ? { hp: g.hp, maxHp: g.maxHp } : null);
  return {
    totalTurns: turns.length,
    result: rep.result ? rep.result.outcome : (rep.maxTurnsReached ? `達回合上限未分勝負（上限 ${rep.options.maxTurns} 回合）` : '未出現結果彈窗'),
    enemyGeneralZeroAtTurn: rep.zeroHp.enemy,
    playerGeneralZeroAtTurn: rep.zeroHp.player,
    finalPlayerGeneral: pick(lg.player),
    finalEnemyGeneral: pick(lg.enemy),
    avgDeployOkPerTurn: turns.length ? Number((totalDeployOk / turns.length).toFixed(2)) : 0,
    totalDeployOk,
    failReasons,
  };
}

function fmtGen(g) { return g ? `${g.hp}/${g.maxHp}` : '—'; }

function fmtSupply(sp) {
  if (!sp) return '—';
  const bf = sp.battleFood === '無法取得' ? '無法取得' : sp.battleFood;
  const sortie = sp.sortie ? `軍勢糧 ${sp.sortie.food}/${sp.sortie.maxFood}，兵池 ${sp.sortie.poolCurrent}/${sp.sortie.poolMax}，計謀 ${sp.sortie.tacticCurrent}/${sp.sortie.tacticMax}` : '無出征帳本';
  return `${sortie}；戰場糧 ${bf}`;
}

function fmtDeployCell(t) {
  if (!t.deployAttempts || !t.deployAttempts.length) return t.deploy || '未部署';
  const parts = t.deployAttempts.map((a) => (a.placed ? `${a.card}→路${a.lane + 1} 成功` : `路${a.lane + 1} 失敗：${a.failReason}`));
  return `${parts.join('；')}（停：${t.deployStop || '—'}）`;
}

function writeReports(opt, ok) {
  rep.finishedAt = new Date().toISOString();
  rep.consoleErrorCount = rep.consoleErrors.length;
  rep.pageErrorCount = rep.pageErrors.length;
  rep.summary = buildSummary();
  fs.writeFileSync(path.join(opt.out, 'report.json'), JSON.stringify(rep, null, 2), 'utf8');

  const lines = [];
  const turnsPlayed = rep.turns.length;
  const S = rep.summary;
  lines.push('# 戰場整場實跑報告', '');
  lines.push(`- 執行時間：${rep.startedAt} → ${rep.finishedAt}`);
  lines.push(`- 參數：duel=${opt.duel}，ultimate=${opt.ultimate}，max-turns=${opt.maxTurns}，fresh=${opt.fresh}，deploy-mode=${opt.deployMode}`);
  lines.push(`- 關卡名稱（畫面標題）：${rep.stage || '（未進戰場）'}`);
  lines.push(`- 是否進戰場：${rep.entered ? `是（方式：${rep.entered}）` : (rep.stage ? '是（大廳流程）' : '否')}`);
  lines.push(`- 打了幾回合：${turnsPlayed}（成功部署 ${S.totalDeployOk} 隊）`);
  lines.push(`- 結果：${rep.result ? rep.result.outcome : (rep.maxTurnsReached ? '達回合上限未分勝負' : '未出現結果彈窗')}`);
  lines.push(`- 是否回到大廳：${rep.lobby && rep.lobby.ok ? '是' : '否'}`);
  lines.push(`- 單挑邀請：${rep.duels.length} 次；教學面板收起：${rep.tutorialDismissed} 次；奧義：${rep.ultimates.length} 次`);
  lines.push(`- 主控台 error：${rep.consoleErrors.length} 筆；未捕捉例外：${rep.pageErrors.length} 筆`);
  const concl = ok ? '通過（整場串通並回到大廳）' : rep.maxTurnsReached && !rep.failure ? '非錯誤：達回合上限仍未分勝負' : `未通過：${rep.failure ? rep.failure.message : '未知原因'}`;
  lines.push(`- 結論：${concl}`, '');

  lines.push('## 總結');
  lines.push(`- 關卡：${rep.stage || '（未進戰場）'}；部署模式：${opt.deployMode}`);
  lines.push(`- 總回合數：${S.totalTurns}`);
  lines.push(`- 勝敗：${S.result}`);
  lines.push(`- 敵方主將 HP 歸零：${S.enemyGeneralZeroAtTurn != null ? `第 ${S.enemyGeneralZeroAtTurn} 回合` : '未擊倒'}`);
  lines.push(`- 我方主將 HP 歸零：${S.playerGeneralZeroAtTurn != null ? `第 ${S.playerGeneralZeroAtTurn} 回合` : '未歸零'}`);
  lines.push(`- 最後主將 HP：我方 ${fmtGen(S.finalPlayerGeneral)}；敵方 ${fmtGen(S.finalEnemyGeneral)}`);
  lines.push(`- 每回合平均部署成功數：${S.avgDeployOkPerTurn}（總成功 ${S.totalDeployOk} 隊）`);
  const frs = Object.entries(S.failReasons);
  lines.push(`- 失敗原因次數：${frs.length ? frs.map(([k, v]) => `${k} × ${v}`).join('、') : '（無失敗部署）'}`, '');

  lines.push('## 步驟');
  lines.push('| 步驟 | 結果 | 耗時 |', '|---|---|---|');
  for (const st of rep.steps) lines.push(`| ${st.name} | ${st.ok ? '成功' : `失敗：${st.error}`} | ${(st.ms / 1000).toFixed(1)}s |`);
  lines.push('');

  if (rep.enter) lines.push(`進場細節：enter-battle.js 回傳 \`${rep.enter.enterBattleResult}\`，戰場元件 ${rep.enter.battle ? '存在' : '不存在'}`, '');

  lines.push('## 逐回合');
  lines.push('| 回合 | 我方單位 | 敵方單位 | 我方主將 HP/SP | 敵方主將 HP/SP | 要塞 我/敵 | 部署成功數 | 部署結果／失敗原因 | 糧草／軍勢（開始 → 結束） | 本回合 error |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const t of rep.turns) {
    const b = t.before;
    const pgTxt = b.playerGeneral ? `${b.playerGeneral.hp}/${b.playerGeneral.maxHp} · ${b.playerGeneral.sp}/${b.playerGeneral.maxSp}` : '—';
    const egTxt = b.enemyGeneral ? `${b.enemyGeneral.hp}/${b.enemyGeneral.maxHp} · ${b.enemyGeneral.sp}/${b.enemyGeneral.maxSp}` : '—';
    const fTxt = b.fortress ? `${b.fortress.player}/${b.fortress.enemy}` : '—';
    const dep = fmtDeployCell(t);
    const supTxt = `${fmtSupply(t.supplyStart)} → ${fmtSupply(t.supplyEnd)}`;
    const errs = (t.errorsTo != null ? t.errorsTo : rep.consoleErrors.length) - t.errorsFrom;
    lines.push(`| ${t.turn} | ${b.unitCount.我方} | ${b.unitCount.敵方} | ${pgTxt} | ${egTxt} | ${fTxt} | ${t.deployOk || 0} | ${dep.replace(/\|/g, '/')} | ${supTxt.replace(/\|/g, '/')} | ${errs} |`);
  }
  lines.push('');

  lines.push('## 例外與錯誤（去重）');
  const uniq = (arr) => [...new Map(arr.map((e) => [e.text, e])).values()];
  const errList = uniq(rep.consoleErrors);
  const pErrList = uniq(rep.pageErrors);
  if (!errList.length && !pErrList.length) lines.push('（無）');
  for (const e of pErrList.slice(0, 20)) lines.push(`- [pageerror] 第 ${e.turn} 回合：${e.text}`);
  for (const e of errList.slice(0, 30)) lines.push(`- [console.error] 第 ${e.turn} 回合：${e.text}`);
  lines.push('');

  if (rep.duels.length) {
    lines.push('## 單挑邀請');
    for (const d of rep.duels) lines.push(`- 第 ${d.turn} 回合：點「${d.choice}」（${d.at}）`);
    lines.push('');
  }
  if (rep.duelAttempt) lines.push(`- 主動單挑：第 ${rep.duelAttempt.turn} 回合，放置格 ${JSON.stringify(rep.duelAttempt.cell)}，單位數 ${rep.duelAttempt.unitsBefore} → ${rep.duelAttempt.unitsAfter}，是否出現邀請 ${rep.duelAttempt.invite ? '是' : '否'}`, '');
  if (rep.tactics.length) {
    lines.push('## 計謀');
    for (const t of rep.tactics) lines.push(`- 第 ${t.turn} 回合：點「${t.label}」，${t.cast ? '已施放' : '未施放'}；戰法 ${t.before ? t.before.skillId : '?'}，點數 ${t.before ? t.before.points : '?'} → ${t.after ? t.after.points : '?'}；瞄準 ${t.afterTap ? t.afterTap.pending : '?'}，目標 ${JSON.stringify(t.target)}；提示 ${JSON.stringify(t.newTexts)}`);
    lines.push('');
  }
  if (rep.ultimates.length) {
    lines.push('## 奧義');
    for (const u of rep.ultimates) lines.push(`- 第 ${u.turn} 回合：選項 ${JSON.stringify(u.candidates)}，選擇 ${u.picked || '無'}，${u.cast ? '已施放' : '未確認施放'}`);
    lines.push('');
  }

  lines.push('## 結果彈窗與返回');
  if (rep.result) lines.push(`- 文字：${rep.result.texts.join(' / ')}`);
  if (rep.backButton) lines.push(`- 點擊：「${rep.backButton.tapped}」`);
  if (rep.lobby) lines.push(`- 回到大廳：${rep.lobby.ok ? '成功' : '失敗'}（場景 ${rep.lobby.scene}，耗時 ${rep.lobby.seconds}s）`);
  lines.push('');

  if (rep.failure) {
    lines.push('## 卡住的地方');
    lines.push(`- 步驟：${rep.failure.step || '（未標示）'}`);
    lines.push(`- 訊息：${rep.failure.message}`);
    lines.push(`- 當時畫面文字：${(rep.failure.texts || []).slice(0, 60).join(' / ') || '（無）'}`, '');
  }

  lines.push('## 截圖');
  for (const [k, v] of Object.entries(rep.screenshots)) lines.push(`- ${k}：${v}`);
  lines.push('');

  const md = lines.join('\n');
  const mdPath = path.join(opt.out, 'report.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  return mdPath;
}

// ---------- 主流程 ----------
async function main() {
  const opt = parseArgs(process.argv);
  rep.options = opt;
  fs.mkdirSync(opt.out, { recursive: true });
  log(`輸出資料夾：${opt.out}`);

  let conn = null;
  let page = null;
  let ok = false;
  try {
    conn = await runStep('連接瀏覽器', () => connectBrowser(opt));
    page = await conn.browser.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') rep.consoleErrors.push({ turn: ctx.turn, text: m.text().slice(0, 300) });
    });
    page.on('pageerror', (e) => rep.pageErrors.push({ turn: ctx.turn, text: String(e.message || e).slice(0, 300) }));

    await runStep('開啟預覽', () => openPreview(page, opt));
    if (opt.fresh) {
      // 全新玩家：不用 enter-battle.js（它直接走出征鈕），改走真實大廳流程（信件、季報、出征→戰場→出征）
      rep.entered = '';
      await runStep('大廳流程進場（全新玩家）', () => enterFromLobby(page, opt.general ? STARTER_NAMES[opt.general] : null));
    } else {
      await runStep('注入 enter-battle.js 進場', () => enterWithHelper(page));
      if (!rep.entered) {
        log('enter-battle.js 未進到戰場，改走大廳備用流程');
        await runStep('大廳備用流程進場', () => enterFromLobby(page, opt.general ? STARTER_NAMES[opt.general] : null));
      }
    }
    await shot(page, opt, 'battle-start');
    const outcome = await runStep('整場打到結束', () => playBattle(page, opt));
    if (outcome === 'max-turns') {
      // 達回合上限仍未分勝負：不是失敗，略過返回大廳（沒有結果彈窗可點）
      await shot(page, opt, 'max-turns-reached');
      log(`達回合上限 ${opt.maxTurns} 仍未分勝負`);
      ok = false;
    } else {
      await runStep('返回大廳', () => backToLobby(page, opt));
      ok = rep.steps.every((st) => st.ok) && !!(rep.lobby && rep.lobby.ok);
      if (opt.secondBattle && ok) {
        // 第二場是一般戰鬥（不是教學戰）：只進場、截圖、記下計謀鈕與教學旗標，不打完（PROG-2-9339）
        await runStep('第二場進場（一般戰鬥）', () => enterFromLobby(page, null));
        await sleep(4000);
        await shot(page, opt, 'battle2-start');
        const s2 = await ev(page, pageSnapshot);
        const info = await ev(page, () => {
          const b = window.__bq.battle(); const c = b && b.ctrl;
          if (!c) return null;
          const un = typeof c.getPlayerSeedTacticUnmetCondition === 'function' ? c.getPlayerSeedTacticUnmetCondition() : '（沒有這個函式）';
          return { tutorial: !!(c.tutorialBattle ?? c._tutorialBattle), unmet: un, weather: c.state && c.state.weather };
        });
        rep.secondBattle = { stage: s2.texts.find((t) => /之\s*[戰役]|突\s*圍|會\s*戰/.test(t) && t.length <= 20) || null, tacticLabel: s2.texts.find((t) => /^計謀/.test(t)) || null, info };
        log(`第二場：${JSON.stringify(rep.secondBattle)}`);
        // 點數不夠時按鈕依設計先寫點數；多結束幾回合等點數夠了，才看得到「待風」這類原因
        for (let i = 0; i < 6 && /\d+點/.test(rep.secondBattle.tacticLabel || ''); i++) {
          const before = await ev(page, pageSnapshot);
          if (!before.texts.includes('結束回合')) { await sleep(3000); continue; }
          await tapText(page, '結束回合');
          for (let w = 0; w < 20; w++) { await sleep(1000); const n = await ev(page, pageSnapshot); if (n.turn !== before.turn && n.texts.includes('結束回合')) break; }
          const after = await ev(page, pageSnapshot);
          rep.secondBattle.tacticLabel = after.texts.find((t) => /^計謀/.test(t)) || null;
          rep.secondBattle.tacticLabelTurn = after.turn;
          log(`第二場第 ${after.turn} 回合計謀鈕：${JSON.stringify(rep.secondBattle.tacticLabel)}`);
        }
        await shot(page, opt, 'battle2-tactic');
      }
    }
  } catch (e) {
    rep.failure = { message: e.message, step: e.step || null, texts: e.texts || [] };
    log(`失敗：${e.message}`);
    if (page) await shot(page, opt, 'failure');
    if (page) {
      try {
        const s = await ev(page, pageSnapshot);
        rep.failure.texts = s.texts;
        rep.failure.snapshot = brief(s).unitCount ? { scene: s.scene, turn: s.turn, battle: s.battle } : null;
      } catch (e2) { /* 忽略：頁面可能已壞 */ }
    }
  } finally {
    const mdPath = writeReports(opt, ok);
    if (page) await page.close().catch(() => {});
    if (conn) {
      if (conn.owned) {
        await conn.browser.close().catch(() => {});
        try { fs.rmSync(conn.profile, { recursive: true, force: true }); } catch (e) { /* 忽略 */ }
      } else {
        conn.browser.disconnect();
      }
    }
    console.log(`\n報告：${mdPath}`);
    const outcome = rep.result ? rep.result.outcome : '無結果';
    console.log(`結論：${ok ? '通過' : '未通過'} — 回合 ${rep.turns.length}，結果 ${outcome}，回大廳 ${rep.lobby && rep.lobby.ok ? '是' : '否'}${rep.failure ? `，失敗於「${rep.failure.step || '未知'}」：${rep.failure.message}` : ''}`);
    process.exitCode = ok ? 0 : 1;
  }
}

main().catch((e) => {
  console.error('未預期錯誤：', e);
  process.exitCode = 1;
});
