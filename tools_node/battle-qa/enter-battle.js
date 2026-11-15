// 戰場實跑輔助：一鍵從標題畫面進到戰場。
// 用法：預覽頁（http://localhost:7456）載入後，把整段貼進瀏覽器主控台，或由瀏覽器自動化工具在頁面內執行。
// 執行後 window.__bq 留有輔助函式（tapLabel、findLabels、battle 等），window.__enterBattle 為進場結果。
// 這裡的按鈕多半不是 cc.Button，而是掛在畫面宿主節點上的觸控判定，所以一律用「在畫布上模擬滑鼠點擊」的方式操作。
window.__bq = (() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const walk = (n, f) => { if (f(n)) return n; for (const c of n.children) { const r = walk(c, f); if (r) return r; } return null; };
  const scene = () => cc.director.getScene();
  const textOf = (n) => { for (const c of n.components || []) { if (typeof c.string === 'string') return c.string.trim(); } return null; };
  const visible = (n) => { for (let p = n; p; p = p.parent) { if (p.active === false) return false; } return true; };
  const canvas = () => document.getElementById('GameCanvas') || document.querySelector('canvas');
  // 世界座標（設計解析度）換成頁面座標後，對畫布送出按下與放開
  const toClient = (wx, wy) => {
    const vs = cc.view.getVisibleSize(); const r = canvas().getBoundingClientRect();
    return [r.left + wx / vs.width * r.width, r.top + (1 - wy / vs.height) * r.height];
  };
  const mouse = (type, x, y) => canvas().dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true, cancelable: true }));
  const tapWorld = (wx, wy) => { const [x, y] = toClient(wx, wy); mouse('mousedown', x, y); mouse('mouseup', x, y); return [Math.round(x), Math.round(y)]; };
  const centerOf = (n) => { const ui = n.components.find((c) => c.getBoundingBoxToWorld); const b = ui.getBoundingBoxToWorld(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const tapNode = (n) => tapWorld(...centerOf(n));
  // 拖曳：按下 → 分段移動 → 放開（部署虎符用）
  const dragWorld = async (from, to, steps = 8) => {
    const [x0, y0] = toClient(...from); const [x1, y1] = toClient(...to);
    mouse('mousedown', x0, y0);
    for (let i = 1; i <= steps; i += 1) { await sleep(30); mouse('mousemove', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); }
    await sleep(30); mouse('mouseup', x1, y1);
  };
  const findLabels = (text) => { const hits = []; if (!scene()) return hits; walk(scene(), (n) => { if (textOf(n) === text && visible(n)) hits.push(n); return false; }); return hits; };
  // pick：第幾個同名文字（負數從後面數）
  const tapLabel = (text, pick = -1) => { const h = findLabels(text); if (!h.length) return null; return tapNode(h[pick < 0 ? h.length + pick : pick]); };
  // 戰場主元件（帶 ctrl 與 unitRenderer）
  const battle = () => { if (!scene()) return null; const n = walk(scene(), (m) => (m.components || []).some((c) => c.ctrl && c.unitRenderer)); return n ? n.components.find((c) => c.ctrl && c.unitRenderer) : null; };
  const waitFor = async (f, ms) => { const s = performance.now(); while (performance.now() - s < ms) { if (f()) return true; await sleep(250); } return false; };
  return { sleep, walk, scene, textOf, visible, toClient, tapWorld, tapNode, centerOf, dragWorld, findLabels, tapLabel, battle, waitFor };
})();

window.__enterBattle = 'running';
(async () => {
  const b = window.__bq; const log = []; const t0 = performance.now();
  const mark = (s) => log.push(`${s} ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  if (!b.battle()) {
    if (await b.waitFor(() => b.findLabels('開始遊戲').length > 0 || b.findLabels('出征').length > 0, 40000) && b.findLabels('開始遊戲').length) { b.tapLabel('開始遊戲'); mark('開始遊戲'); }
    await b.waitFor(() => !!b.scene() && b.scene().name === 'LobbyScene' && b.findLabels('出征').length > 0, 60000);
    await b.sleep(1500);
    b.tapLabel('出征', 0); mark('出征');
    await b.sleep(1500);
    // 大廳到戰場中間的畫面會隨版本增減（城市頁「戰場」、選擇戰鬥模式「親自指揮」、兵勢劣勢「強行出征」、戰前偵查「出征」），
    // 所以不寫死順序：每輪看畫面上有哪個就點哪個，直到進入戰場。
    for (let i = 0; i < 40 && !b.battle(); i += 1) {
      let hit = null;
      for (const text of ['親自指揮', '強行出征', '戰場']) { if (b.findLabels(text).length) { b.tapLabel(text, 0); hit = text; break; } }
      if (!hit && b.findLabels('戰前偵查').length) { const h = b.findLabels('出征'); if (h.length) { b.tapNode(h[h.length - 1]); hit = '戰前偵查出征'; } }
      if (!hit && i === 3) { b.tapLabel('出征', -1); hit = '出征（重試）'; }
      if (hit) mark(hit);
      await b.sleep(1500);
    }
    await b.waitFor(() => !!b.battle(), 30000);
  }
  mark('進入戰場');
  await b.sleep(1500);
  b.tapLabel('收起');
  return JSON.stringify({ ok: !!b.battle(), log });
})().then((r) => { window.__enterBattle = r; }, (e) => { window.__enterBattle = `ERR ${e}`; });
