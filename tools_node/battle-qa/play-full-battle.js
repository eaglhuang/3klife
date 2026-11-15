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
 *   --ultimate             SP 滿時施放奧義並選第一個技能（最佳努力，尚未在遊戲實測過選技能流程）
 *   --max-turns <n>        回合上限（預設 60）
 *   --out <資料夾>          輸出資料夾（預設系統暫存目錄下 battle-qa-<時間戳>）
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
  const tapText = (text, pick) => {
    const hits = [];
    window.__bq.walk(cc.director.getScene(), (n) => { for (const c of n.components || []) { if (typeof c.string === 'string' && c.string.trim() === text && window.__bq.visible(n)) hits.push(n); } return false; });
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
function parseArgs(argv) {
  const o = { url: 'http://localhost:7456', browserUrl: 'http://127.0.0.1:9333', duel: 'accept', ultimate: false, maxTurns: 60, out: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => { i += 1; if (i >= argv.length) throw new Error(`參數 ${a} 缺少值`); return argv[i]; };
    if (a === '--url') o.url = next();
    else if (a === '--browser-url') o.browserUrl = next();
    else if (a === '--duel') o.duel = next();
    else if (a === '--ultimate') o.ultimate = true;
    else if (a === '--max-turns') o.maxTurns = Number(next());
    else if (a === '--out') o.out = next();
    else throw new Error(`未知參數：${a}`);
  }
  if (!['accept', 'reject'].includes(o.duel)) throw new Error('--duel 只接受 accept 或 reject');
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
function pageLobbyTick() {
  const bq = window.__bq;
  const sn = cc.director.getScene() ? cc.director.getScene().name : '(無)';
  const out = { scene: sn, battle: !!bq.battle(), action: null };
  if (out.battle) return out;
  const tryTap = (t) => {
    if (bq.findLabels(t).length) { bq.tapLabel(t); out.action = `點「${t}」`; return true; }
    return false;
  };
  if (sn === 'LoginScene') {
    if (!tryTap('開始遊戲')) { bq.tapWorld(960, 540); out.action = '點畫面中央'; }
    return out;
  }
  // 幕府大廳的新手教學（1/3 下一步）、城市 hub 的「出征 → 戰場」，以及戰前確認的「親自指揮」
  const order = ['下一步', '開始遊戲', '下一位', '前往宿命轉蛋', '繼續', '跳過', '收起', '關閉', '親自指揮', '出　戰', '戰場'];
  for (const t of order) if (tryTap(t)) return out;
  if (tryTap('出征')) return out;
  // 新手開場的抽卡結果：只點「確定 · 全部收下」，不碰「免費重轉」
  let collect = null;
  bq.walk(cc.director.getScene(), (n) => {
    for (const c of n.components || []) {
      if (typeof c.string === 'string' && /全部收下/.test(c.string) && bq.visible(n)) collect = n;
    }
    return false;
  });
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
  duels: [],
  ultimates: [],
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
async function openPreview(page, opt) {
  await page.setViewport({ width: 1920, height: 1080 });
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

async function enterFromLobby(page) {
  const t0 = Date.now();
  let lastLog = 0;
  let lastTexts = [];
  const actions = [];
  while (Date.now() - t0 < 180000) {
    const r = await ev(page, pageLobbyTick);
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
  throw new QaError('進場', `180 秒內沒有進到戰場（最後動作：${actions.slice(-3).join(' → ')}）`, lastTexts);
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
async function tryDeploy(page, s, turnRec) {
  const LANES = 5;
  turnRec.deployAttempts = [];
  turnRec.deployOk = 0;
  const wrapped = await ev(page, pageInstallDeployWrap);
  if (!wrapped) { turnRec.deploy = '無法包裝 tryDeployTroop（戰場元件不存在）'; return; }
  const triedLanes = new Set();
  let consecFail = 0;
  let stop = '';
  let snap = s;
  for (let k = 0; k < DEPLOY_MAX_ATTEMPTS; k += 1) {
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

async function maybeUltimate(page, s, turnRec) {
  const pg = s.playerGeneral;
  if (!pg || !(pg.sp >= pg.maxSp) || !s.texts.includes('奧義')) return;
  const before = new Set(s.texts);
  await tapText(page, '奧義');
  await sleep(1200);
  const after = await ev(page, pageSnapshot);
  const candidates = after.texts.filter((t) => !before.has(t) && t.length >= 2 && t.length <= 14 && !['取消', '返回', '關閉'].includes(t));
  const rec = { turn: turnRec.turn, opened: true, candidates: candidates.slice(0, 10), picked: null };
  if (candidates.length) {
    rec.picked = candidates[0];
    await tapText(page, candidates[0]);
    await sleep(800);
  }
  rep.ultimates.push(rec);
  log(`奧義：第 ${turnRec.turn} 回合，選擇 ${rec.picked || '（找不到技能選項）'}`);
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
    if (s.enemyGeneral && s.enemyGeneral.hp <= 0 && rep.zeroHp.enemy == null) rep.zeroHp.enemy = s.turn;
    if (s.playerGeneral && s.playerGeneral.hp <= 0 && rep.zeroHp.player == null) rep.zeroHp.player = s.turn;
    rep.lastGeneral = { player: s.playerGeneral, enemy: s.enemyGeneral, turn: s.turn };
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
      cur = { turn: s.turn, before: brief(s), after: null, closed: false, endedAt: 0, endTurnTapped: false, errorsFrom: rep.consoleErrors.length, errorsTo: null, deployed: null, deployAttempts: [], deployOk: 0, deployStop: null, deploy: null, supplyStart: null, supplyEnd: null, ultimate: null };
      rep.turns.push(cur);
      ctx.turn = s.turn;
      log(`第 ${s.turn} 回合：我方 ${cur.before.unitCount.我方} 單位，敵方 ${cur.before.unitCount.敵方} 單位，我方主將 HP ${s.playerGeneral && s.playerGeneral.hp}，SP ${s.playerGeneral && s.playerGeneral.sp}`);
      if (s.turn > opt.maxTurns) {
        rep.turns.pop();
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
      if (opt.ultimate) await maybeUltimate(page, ready, cur);
      cur.supplyStart = await ev(page, pageSupply);
      await tryDeploy(page, ready, cur);
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
    result: rep.result ? rep.result.outcome : '未出現結果彈窗',
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
  lines.push(`- 參數：duel=${opt.duel}，ultimate=${opt.ultimate}，max-turns=${opt.maxTurns}`);
  lines.push(`- 是否進戰場：${rep.entered ? `是（方式：${rep.entered}）` : '否'}`);
  lines.push(`- 打了幾回合：${turnsPlayed}（成功部署 ${S.totalDeployOk} 隊）`);
  lines.push(`- 結果：${rep.result ? rep.result.outcome : '未出現結果彈窗'}`);
  lines.push(`- 是否回到大廳：${rep.lobby && rep.lobby.ok ? '是' : '否'}`);
  lines.push(`- 單挑邀請：${rep.duels.length} 次；教學面板收起：${rep.tutorialDismissed} 次；奧義：${rep.ultimates.length} 次`);
  lines.push(`- 主控台 error：${rep.consoleErrors.length} 筆；未捕捉例外：${rep.pageErrors.length} 筆`);
  lines.push(`- 結論：${ok ? '通過（整場串通並回到大廳）' : `未通過：${rep.failure ? rep.failure.message : '未知原因'}`}`, '');

  lines.push('## 總結');
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
  if (rep.ultimates.length) {
    lines.push('## 奧義');
    for (const u of rep.ultimates) lines.push(`- 第 ${u.turn} 回合：選項 ${JSON.stringify(u.candidates)}，選擇 ${u.picked || '無'}`);
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
    await runStep('注入 enter-battle.js 進場', () => enterWithHelper(page));
    if (!rep.entered) {
      log('enter-battle.js 未進到戰場，改走大廳備用流程');
      await runStep('大廳備用流程進場', () => enterFromLobby(page));
    }
    await shot(page, opt, 'battle-start');
    await runStep('整場打到結束', () => playBattle(page, opt));
    await runStep('返回大廳', () => backToLobby(page, opt));
    ok = rep.steps.every((st) => st.ok) && !!(rep.lobby && rep.lobby.ok);
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
