const puppeteer = require('C:/Users/User/3KLife/node_modules/puppeteer-core');
const fs = require('fs');
const OUT = 'C:/Users/User/wt-fun-1127/artifacts/ui-review/fun4-1127';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chromes = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const only = process.argv[2] || 'all';

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromes.find((p) => fs.existsSync(p)), headless: 'new', args: ['--no-sandbox', '--window-size=1920,1115'] });
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1920, height: 1115 });
  const logs = [];
  page.on('console', (m) => { const t = m.text(); if (/\[FUN/.test(t)) logs.push(t); });
  await page.goto('http://localhost:7456', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.cc && cc.director && cc.director.getScene && cc.director.getScene(), { timeout: 120000 });
  await sleep(4000);
  await page.evaluate(() => { for (const id of ['web-boot-backdrop', 'web-boot-progress']) document.getElementById(id)?.remove(); });
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  const ev = (fn, ...a) => page.evaluate(fn, ...a).catch((e) => { if (/null|undefined|destroyed|Execution context/.test(String(e))) return null; throw e; });

  const tapLabel = (text) => ev((text) => { const vs = cc.view.getVisibleSize(); const c = document.getElementById('GameCanvas') || document.querySelector('canvas'); const r = c.getBoundingClientRect(); let hit = null; const w = (n) => { if (!n.activeInHierarchy) return; const l = n.getComponent(cc.Label); if (l && l.string && l.string.trim().startsWith(text)) hit = n; n.children.forEach(w); }; w(cc.director.getScene()); if (!hit) return false; const b = hit.getComponent('cc.UITransform').getBoundingBoxToWorld(); const x = r.left + (b.x + b.width / 2) / vs.width * r.width, y = r.top + (1 - (b.y + b.height / 2) / vs.height) * r.height; for (const type of ['mousedown', 'mouseup']) c.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true, cancelable: true })); return true; }, text);
  // 走完開場
  await ev(() => cc.director.loadScene('LobbyScene'));
  const order = ['btnintronext', 'btncloseopeningletter', 'btndestinyroll', 'btnframe0', 'btndestinyconfirm', 'btnshowcasenext', 'btnnexttutorial'];
  let idle = 0;
  for (let i = 0; i < 150; i += 1) {
    await sleep(1100);
    const hit = await ev((order) => {
      const walk = (n, f) => { if (f(n)) return true; for (const c of n.children) if (walk(c, f)) return true; return false; };
      const vis = (n) => { for (let p = n; p; p = p.parent) if (p.active === false) return false; return true; };
      for (const key of order) {
        let found = null;
        walk(cc.director.getScene(), (n) => { if (n.name.toLowerCase() === key && vis(n) && n.getComponent(cc.Button)) { found = n; return true; } return false; });
        if (found) { found.emit('click', found.getComponent(cc.Button)); return key; }
      }
      return null;
    }, order);
    if (i % 10 === 0) { console.log('i', i, JSON.stringify(await ev(() => { const o = []; const w = (n) => { if (!n.activeInHierarchy) return; const l = n.getComponent(cc.Label); if (l && l.string && o.length < 60) o.push(l.string.slice(0, 12)); n.children.forEach(w); }; w(cc.director.getScene()); return o; }))); }
    if (hit) { idle = 0; console.log('click', hit); } else if (await tapLabel(i % 3 === 0 ? '【武將】趙雲' : '確定 · 全部收下')) { console.log('tap confirm/youth'); } else if (await tapLabel('返回大廳')) { console.log('tap back'); } else { await ev(() => { const c = document.getElementById('GameCanvas') || document.querySelector('canvas'); const r = c.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; for (const type of ['mousedown', 'mouseup']) c.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true, cancelable: true })); }); idle += 1; }
    const done = await ev(() => { let f = false; const w = (n) => { if (f) return; const l = n.getComponent(cc.Label); if (l && l.string === '出征' && n.activeInHierarchy) f = true; n.children.forEach(w); }; w(cc.director.getScene()); return f; });
    if (done) { console.log('lobby ready'); const dump = await ev(async () => { const o = { ls: {}, idb: [] }; for (let k = 0; k < localStorage.length; k++) { const key = localStorage.key(k); o.ls[key] = localStorage.getItem(key); } o.idb = (indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : []); return o; }); fs.writeFileSync('C:/Users/User/AppData/Local/Temp/claude/24b210bbfa013a93/aa64f30b-b332-4889-8e1f-6cc4a5ed215b/scratchpad/qa-save-dump.json', JSON.stringify(dump)); console.log('dump keys', Object.keys(dump.ls).length, JSON.stringify(dump.idb)); break; }
  }
  // 以非新手身份重進大廳
  await ev(() => cc.director.loadScene('LobbyScene'));
  await page.waitForFunction(() => globalThis.__FUN_QA__, { timeout: 30000 }).catch(async () => { await shot("zz-fail"); console.log("scene", await ev(() => cc.director.getScene().name)); throw new Error("no QA hook"); });
  await sleep(3000);
  await shot('00-lobby');
  console.log('funlogs', JSON.stringify(logs));
  const info = await ev(() => {
    const q = globalThis.__FUN_QA__; const s = q.services().session;
    return { roster: s.roster.length, season: s.gameTime.totalSeasonsElapsed, ids: s.roster.slice(0, 8).map((g) => `${g.id}:${g.name}:${g.gender}:${g.age}`) };
  });
  console.log(JSON.stringify(info));

  for (let k = 0; k < 20; k += 1) { const hit = await ev(() => { let f = null; const w = (n) => { if (f || !n.activeInHierarchy) return; if (/tutorial/i.test(n.name) && /btn/i.test(n.name) && n.getComponent(cc.Button)) f = n; else n.children.forEach(w); }; w(cc.director.getScene()); if (f) { f.emit('click', f.getComponent(cc.Button)); return f.name; } return null; }); const ok = hit || (await tapLabel('開始遊戲')) || (await tapLabel('下一步')) || (await tapLabel('禮貌辭退')) || (await tapLabel('知道了')) || (await tapLabel('確定')) || (await tapLabel('關閉')) || (await tapLabel('繼續')); console.log('tutorial', hit, ok); await sleep(1200); if (!ok) break; }
  for (let k = 0; k < 3; k += 1) { await ev(() => { const c = document.getElementById('GameCanvas') || document.querySelector('canvas'); for (const type of ['mousedown', 'mouseup']) c.dispatchEvent(new MouseEvent(type, { clientX: 713, clientY: 868, button: 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true, cancelable: true })); }); await sleep(1500); }
  await tapLabel('收起季報'); await sleep(1500);
  await shot('00-lobby-after-tutorial');
  const counts = () => ev(() => ({ f2: __FUN_QA__.funStageShownCount('fun02'), f3: __FUN_QA__.funStageShownCount('fun03'), f4: __FUN_QA__.funStageShownCount('fun04') }));
  const waitStage = async (name) => { for (let i = 0; i < 40; i += 1) { const on = await ev(() => { const h = cc.director.getScene().getChildByName('Canvas'); const n = h && h.getChildByName('FunStage'); return !!(n && n.activeInHierarchy); }); if (on) { await sleep(900); return shot(name); } await sleep(500); } console.log('NOSTAGE', name); };
  const gpu = () => ev(() => ({ s: __FUN_QA__.services().session }) && 1);
  // FUN-04：真的走 enrollGenerals 招募一位關羽
  await ev(() => { const s = __FUN_QA__.services().session; const base = s.roster[0]; s.enrollGenerals([{ ...JSON.parse(JSON.stringify(base)), id: 'guan-yu', name: '關羽', gender: '男', age: 30 }]); });
  await waitStage('fun04-intro-first-beat'); await sleep(5000); console.log('FUN04 counts', JSON.stringify(await counts()));
  // 再招一位張飛（不再是第一位，沒有預告句）
  await ev(() => { const s = __FUN_QA__.services().session; const base = s.roster[1]; s.enrollGenerals([{ ...JSON.parse(JSON.stringify(base)), id: 'zhang-fei', name: '張飛', gender: '男', age: 30 }]); });
  await waitStage('fun04-intro-second');
  await sleep(5000); console.log('FUN04b counts', JSON.stringify(await counts()));
  // FUN-02：造一個滿一季的首子（出生季 1，現在第 3 季）
  const set2 = await ev(() => { const s = __FUN_QA__.services().session; s._clock._state.totalSeasonsElapsed = 3; const base = JSON.parse(JSON.stringify(s.roster[2])); s.enrollGenerals([{ ...base, id: 'qa-baby', name: '小寶', gender: '女', age: 0, fatherId: s.roster[0].id, motherId: 'qa-mother', birthSeason: 1 }]); return [s.gameTime.totalSeasonsElapsed, s.roster.some((g) => g.id === 'qa-baby')]; });
  console.log('FUN02 setup', set2);
  await ev(() => { void __FUN_QA__.runFunLobbyTick(); });
  await sleep(5000); await shot('fun02-moon-beat-a');
  await sleep(7000); await shot('fun02-moon-beat-b');
  await sleep(22000); console.log('FUN02 counts', JSON.stringify(await counts()));
  // FUN-03：直接寫一筆待播（戰後搭話），不走完整戰鬥
  await ev(() => { const s = __FUN_QA__.services().session; const st = s.funState(); s.setFunState({ ...st, victoryChat: { ...st.victoryChat, pending: { talkerId: s.roster[3].id, resultBand: 'bigWin', seasonNo: 3 } } }); void __FUN_QA__.runFunLobbyTick(); });
  await sleep(3200); await shot('fun03-victory-chat');
  await sleep(6000); console.log('FUN03 counts', JSON.stringify(await counts()));
  // FUN-01：未滿 5 歲孩子點頭像
  await ev(() => { const s = __FUN_QA__.services().session; window.__kidId = 'qa-baby'; const cv = cc.director.getScene().getChildByName('Canvas'); __FUN_QA__.tryToddlerBarkTap(cv, window.__kidId); });
  await sleep(1800); await shot('fun01-toddler-bark');
  await sleep(1500);
  console.log('FUNLOGS', JSON.stringify(logs));
  await shot('zz-end');
  await browser.close();

})().catch((e) => { console.error('ERR', e); process.exit(1); });
