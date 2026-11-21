'use strict';
/**
 * perf-probe.js — 網頁版效能量測探針（給 playtest-online.js --perf 使用，也可單獨 require）
 *
 * 每一步（begin → end）量：
 *   平均 FPS、幀時間 p50／p95／最大、long task（>50ms）次數與總時長、
 *   JS heap、DOM／引擎節點數、draw call、CPU 取樣中自耗時最高的前 N 個函式（CDP Profiler）。
 * 取樣在頁面內用 requestAnimationFrame＋PerformanceObserver(longtask)；CPU 熱點用 CDP Profiler。
 * 無頭 Chrome 預設 --disable-gpu（軟體算圖），FPS 絕對值偏低，只適合前後相對比較。
 */

const SAMPLER = `(() => {
  if (window.__perfProbe) return;
  const st = { frames: [], longs: [], last: 0, on: false };
  window.__perfProbe = st;
  const tick = (t) => {
    if (st.on && st.last) st.frames.push(t - st.last);
    st.last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => {
      if (!st.on) return;
      for (const e of list.getEntries()) st.longs.push(Math.round(e.duration));
    }).observe({ entryTypes: ['longtask'] });
  } catch (_) {}
})();`;

const SNAPSHOT = `(() => {
  const st = window.__perfProbe;
  const out = { frames: st ? st.frames.slice() : [], longs: st ? st.longs.slice() : [] };
  const cc = window.cc;
  out.heapMB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null;
  out.domNodes = document.getElementsByTagName('*').length;
  try {
    let n = 0;
    const walk = (node) => { n++; for (const c of node.children) walk(c); };
    const scene = cc.director.getScene();
    if (scene) walk(scene);
    out.ccNodes = n;
  } catch (_) { out.ccNodes = null; }
  try {
    const dev = cc.director.root.device;
    out.drawCalls = dev.numDrawCalls != null ? dev.numDrawCalls : null;
    out.tris = dev.numTris != null ? dev.numTris : null;
  } catch (_) { out.drawCalls = null; }
  try { out.scene = cc.director.getScene().name; } catch (_) {}
  return out;
})()`;

const RESET = `(() => { const s = window.__perfProbe; if (s) { s.frames = []; s.longs = []; s.last = 0; s.on = true; } })()`;
const STOP = `(() => { const s = window.__perfProbe; if (s) s.on = false; })()`;

function pct(sorted, p) {
    if (!sorted.length) return 0;
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function aggregateProfile(profile, topN) {
    const nodes = new Map();
    const parent = new Map();
    for (const n of profile.nodes) {
        nodes.set(n.id, n);
        for (const c of n.children || []) parent.set(c, n.id);
    }
    const label = (n) => {
        const cf = n.callFrame;
        const url = (cf.url || '').split('/').slice(-2).join('/');
        return `${cf.functionName || '(anonymous)'} @ ${url}:${cf.lineNumber + 1}`;
    };
    const self = new Map();
    const incl = new Map();
    const callers = new Map();
    const dts = profile.timeDeltas || [];
    const samples = profile.samples || [];
    for (let i = 0; i < samples.length; i++) {
        const dt = dts[i] || 0;
        const n = nodes.get(samples[i]);
        if (!n) continue;
        const fn = n.callFrame.functionName || '(anonymous)';
        if (fn === '(idle)' || fn === '(program)' || fn === '(root)') continue;
        const key = label(n);
        self.set(key, (self.get(key) || 0) + dt);
        // 呼叫鏈：往上走，每個函式在同一個樣本只記一次（含自己）；同時記自耗時熱點的前三層呼叫者
        const seen = new Set();
        const chain = [];
        for (let id = n.id; id !== undefined; id = parent.get(id)) {
            const m = nodes.get(id);
            if (!m) break;
            const k = label(m);
            if (m.callFrame.functionName === '(root)') break;
            chain.push(k);
            if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + dt); }
        }
        const via = chain.slice(1, 4).join(' <- ');
        const cm = callers.get(key) || new Map();
        cm.set(via, (cm.get(via) || 0) + dt);
        callers.set(key, cm);
    }
    const hot = Array.from(self.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([k, us]) => {
        const cm = callers.get(k);
        const top = cm ? Array.from(cm.entries()).sort((a, b) => b[1] - a[1])[0] : null;
        return { fn: k, selfMs: Math.round(us / 1000), via: top ? top[0] : '' };
    });
    const inclusive = Array.from(incl.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN * 2).map(([k, us]) => ({ fn: k, inclMs: Math.round(us / 1000) }));
    return { hot, inclusive };
}

async function create(page, { topN = 8 } = {}) {
    await page.evaluateOnNewDocument(SAMPLER);
    const cdp = await page.createCDPSession();
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    await cdp.send('Performance.enable');
    let t0 = 0;
    let startMetrics = null;
    let profiling = false;
    return {
        async begin() {
            try { await page.evaluate(SAMPLER); } catch (_) {}
            try { await page.evaluate(RESET); } catch (_) {}
            try { await cdp.send('Profiler.start'); profiling = true; } catch (_) { profiling = false; }
            startMetrics = (await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }))).metrics;
            t0 = Date.now();
        },
        async end() {
            const wall = Date.now() - t0;
            let snap = {};
            try { snap = await page.evaluate(SNAPSHOT); await page.evaluate(STOP); } catch (_) { snap = { frames: [], longs: [] }; }
            let top = { hot: [], inclusive: [] };
            if (profiling) {
                try { top = aggregateProfile((await cdp.send('Profiler.stop')).profile, topN); } catch (_) {}
                profiling = false;
            }
            const endMetrics = (await cdp.send('Performance.getMetrics').catch(() => ({ metrics: [] }))).metrics;
            const m = (arr, k) => (arr.find((x) => x.name === k) || {}).value || 0;
            const frames = snap.frames || [];
            const sorted = frames.slice().sort((a, b) => a - b);
            const sum = frames.reduce((a, b) => a + b, 0);
            const longs = snap.longs || [];
            return {
                wallMs: wall,
                frames: frames.length,
                fps: sum ? +(frames.length / (sum / 1000)).toFixed(1) : 0,
                frameP50: +pct(sorted, 0.5).toFixed(1),
                frameP95: +pct(sorted, 0.95).toFixed(1),
                frameMax: +(sorted[sorted.length - 1] || 0).toFixed(1),
                over50: frames.filter((f) => f > 50).length,
                longTasks: longs.length,
                longTaskMs: longs.reduce((a, b) => a + b, 0),
                scriptMs: Math.round((m(endMetrics, 'ScriptDuration') - m(startMetrics, 'ScriptDuration')) * 1000),
                layoutMs: Math.round((m(endMetrics, 'LayoutDuration') - m(startMetrics, 'LayoutDuration')) * 1000),
                heapMB: snap.heapMB,
                domNodes: snap.domNodes,
                ccNodes: snap.ccNodes,
                drawCalls: snap.drawCalls,
                tris: snap.tris,
                scene: snap.scene,
                hot: top.hot,
                inclusive: top.inclusive,
            };
        },
    };
}

module.exports = { create };
