#!/usr/bin/env node
/**
 * 把 docs/cross-ref/cross-ref-進度.md 的 D-1 表轉成五欄矩陣：
 *   規格 / 邏輯 / 接線 / 測試 / runtime 驗收
 *
 * 用法：
 *   node tools_node/build-progress-matrix.js            # 重寫 D-1 表（可重複執行）
 *   node tools_node/build-progress-matrix.js --check    # 只檢查，不寫檔（有落差回傳 1）
 *
 * 五欄表模式（PROG-2-1165）：表已是五欄時，只重算「對應代碼檔」為「尚無實作」的列，
 *   代碼檔改從 assets/scripts 檔頭的 `@spec-source … <規格書名>` 標註掃出；其他列原樣保留。
 *   找到代碼檔的列邏輯標 🟡（只證明有程式，不代表規格全數落地）。
 *
 * 五欄的判定都是「可重算」的，不靠人工估百分比（Unity 類比：像 Test Runner 的綠燈，而不是工程師自評進度）：
 *   規格  ✅ 規格書 doc_id 在 registry 內且檔案存在；❌ 否
 *   邏輯  ✅ 對應代碼檔全部存在於 assets/scripts；🟡 部分存在；❌ 沒有（沿用 MANUAL_LOGIC 覆寫人工判斷）
 *   接線  ✅ 代碼檔被 assets/scripts 內其他檔案 import（= 有被場景/系統接上）；❌ 只有孤立檔案；— 無代碼
 *   測試  ✅ tests/ 內存在對應 *.test.ts；❌ 沒有
 *   runtime 驗收  一律 ⬜，除非 RUNTIME_EVIDENCE 有登記 headless / Playwright 驗收證據
 *
 * 五欄模式另外重算（PROG-2-1430）：
 *   有代碼的列一律依代碼檔重算接線、測試欄（測試＝有同名 *.test.ts 或有測試檔 import 它）；邏輯欄維持人工標記，代碼檔不見時才降級
 *   D-4 加權總表與狀態分布由 D-1 推出：🟢 邏輯／接線／測試全 ✅、🟡 有代碼、🔴 無代碼或邏輯 ❌、🔷 不需代碼；數字有變時順帶寫 D-5 當日一列
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const progressPath = path.join(root, 'docs/cross-ref/cross-ref-進度.md');
const checkOnly = process.argv.includes('--check');

// 人工覆寫：邏輯層判斷（key = doc_id）。沒登記的走自動判定。
const MANUAL_LOGIC = {
  doc_spec_0034: '🟡', // 遊戲時間系統：GameClock.ts（PROG-2-0021）已有，尚未接入大廳
  doc_spec_0018: '🟡', // 武將壽命系統：GeneralAging.ts（PROG-2-0021）已有
};
const MANUAL_CODE = {
  doc_spec_0034: ['GameClock.ts'],
  doc_spec_0018: ['GeneralAging.ts'],
};
// 五欄模式不從 @spec-source 補登的規格（key = doc_id → 原因）
const SPEC_SOURCE_SKIP = {
  doc_spec_0008: '名詞定義文件是名詞表，不是系統',
};
// 只有登記了 headless / Playwright 證據才可標 ✅（key = doc_id → 證據說明）
const RUNTIME_EVIDENCE = {};
// D-4 加權分類（PROG-2-1430）：依序比對，都不中歸最後一類
const D4_CATEGORIES = [
  {
    label: '核心戰場系統（數值 / 兵種 / 戰場部署 / 戰法 / 奧義 / 因子爆發 / AI 強度）',
    weight: 3,
    ids: ['doc_data_0001', 'doc_spec_0012', 'doc_spec_0040', 'doc_spec_0038', 'doc_spec_0030', 'doc_spec_0010', 'doc_data_0002', 'doc_spec_0039'],
  },
  { label: 'UI 系統（doc_ui_*）', weight: 2, idPattern: /^doc_ui_/ },
  { label: '其他系統（大廳 / 養成 / 經濟 / 技術文件等）', weight: 1 },
];
// D-4 不需代碼、直接計滿分的規格（key = doc_id → 原因）
const D4_DOC_ONLY = { ...SPEC_SOURCE_SKIP };
// D-4 狀態分數，沿用 2026-04 公式：完整 / 不需代碼 1.0、進行中 0.5、未實作 0
const D4_POINTS = { '🟢': 1, '🔷': 1, '🟡': 0.5, '🔴': 0 };
const pctOf = (got, max) => (max ? Math.round((got / max) * 100) : 0);
const fmt = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(Math.round(n * 10) / 10));

function git(args) {
  return execSync(`git ${args}`, { cwd: root, maxBuffer: 1 << 28 }).toString().split('\n').filter(Boolean);
}
const decode = (p) => (p.startsWith('"') ? JSON.parse(p) && Buffer.from(p.slice(1, -1).replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))), 'latin1').toString('utf8') : p);
const allFiles = git('-c core.quotepath=false ls-files').map(decode);
const scripts = allFiles.filter((f) => /^assets\/scripts\/.*\.ts$/.test(f));
const tests = allFiles.filter((f) => /^tests\/.*\.test\.ts$/.test(f));
const byBase = new Map();
for (const f of scripts) {
  const b = path.basename(f);
  (byBase.get(b) || byBase.set(b, []).get(b)).push(f);
}
const scriptText = new Map(scripts.map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
const testText = tests.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');

const registry = require('./lib/doc-id-registry-loader').loadDocIdRegistryMap();
const regGet = (id) => (registry instanceof Map ? registry.get(id) : registry[id]);

function isImported(file) {
  const stem = path.basename(file, '.ts');
  const re = new RegExp(`from\\s+['"][^'"]*\\/${stem}['"]|from\\s+['"]\\.\\/${stem}['"]`);
  for (const [f, text] of scriptText) {
    if (f !== file && re.test(text)) return true;
  }
  return false;
}

function parseRow(line) {
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length < 4) return null;
  const m = cells[0].match(/^\*{0,2}(.*?)\s*\((doc_[a-z]+_\d{4})\)(.*?)\*{0,2}$/);
  if (!m) return null;
  return { name: cells[0], id: m[2], codeCell: cells[1], oldPct: cells[2], oldTest: cells[3] };
}

function evaluate(row) {
  const entry = regGet(row.id);
  const specOk = entry && fs.existsSync(path.join(root, entry.path || ''));
  let codeNames = MANUAL_CODE[row.id] || (row.codeCell.match(/[A-Za-z0-9_\-]+\.ts/g) || []);
  codeNames = [...new Set(codeNames)];
  const found = codeNames.filter((n) => byBase.has(n));
  const hasCode = codeNames.length > 0;
  let logic;
  if (MANUAL_LOGIC[row.id]) logic = MANUAL_LOGIC[row.id];
  else if (!hasCode) logic = row.oldPct.includes('100%') ? '✅' : '❌';
  else if (found.length === codeNames.length) logic = /🔴/.test(row.oldPct) ? '🟡' : /🟡/.test(row.oldPct) ? '🟡' : '✅';
  else logic = found.length ? '🟡' : '❌';
  let wiring = '—';
  if (found.length) {
    const wired = found.filter((n) => byBase.get(n).some(isImported));
    wiring = wired.length === found.length ? '✅' : wired.length ? '🟡' : '❌';
  }
  const explicit = (row.oldTest.match(/tests\/[A-Za-z0-9_\/\-]+\.test\.ts/g) || []).map((t) => path.basename(t));
  const stems = found.map((n) => path.basename(n, '.ts'));
  const hasTest = explicit.some((t) => tests.some((x) => path.basename(x) === t))
    || stems.some((s) => tests.some((x) => path.basename(x) === `${s}.test.ts`));
  const test = hasCode || explicit.length ? (hasTest ? '✅' : '❌') : '—';
  const runtime = RUNTIME_EVIDENCE[row.id] ? '✅' : '⬜';
  return { spec: specOk ? '✅' : '❌', logic, wiring, test, runtime, code: found.length ? found.join(', ') : (hasCode ? codeNames.join(', ') : '尚無實作') };
}

const src = fs.readFileSync(progressPath, 'utf8');
const lines = src.split('\n');
const headerIdx = lines.findIndex((l) => /^\| 規格書 \| 對應代碼檔 \|/.test(l));
if (headerIdx < 0) { console.error('找不到 D-1 表頭'); process.exit(2); }
let end = headerIdx + 2;
while (end < lines.length && lines[end].startsWith('|')) end++;

const isFive = /規格 \| 邏輯 \| 接線 \| 測試 \| runtime/.test(lines[headerIdx]);
const rows = [];
for (const l of lines.slice(headerIdx + 2, end)) {
  const r = parseRow(l);
  if (!r) { console.error('無法解析：', l.slice(0, 80)); process.exit(2); }
  rows.push(r);
}
if (isFive) {
  let changed = refreshUnimplementedRows();
  changed += refreshWiringAndTests();
  changed += rebuildD4();
  if (checkOnly) process.exit(changed ? 1 : 0);
  if (changed) fs.writeFileSync(progressPath, lines.join('\n'), 'utf8');
  process.exit(0);
}

const out = ['| 規格書 | 對應代碼檔 | 規格 | 邏輯 | 接線 | 測試 | runtime 驗收 |', '|---|---|:-:|:-:|:-:|:-:|:-:|'];
const tally = { spec: 0, logic: 0, wiring: 0, test: 0, runtime: 0 };
for (const r of rows) {
  const e = evaluate(r);
  for (const k of Object.keys(tally)) if (e[k] === '✅') tally[k]++;
  out.push(`| ${r.name} | ${e.code} | ${e.spec} | ${e.logic} | ${e.wiring} | ${e.test} | ${e.runtime} |`);
}
console.log(`D-1 共 ${rows.length} 列；✅ 數：規格 ${tally.spec} / 邏輯 ${tally.logic} / 接線 ${tally.wiring} / 測試 ${tally.test} / runtime ${tally.runtime}`);
if (!checkOnly) {
  lines.splice(headerIdx, end - headerIdx, ...out);
  fs.writeFileSync(progressPath, lines.join('\n'), 'utf8');
}

/** 規格書檔名（不含 .md）→ 檔頭 @spec-source 指向它的 assets/scripts 檔名 */
function specSourceFiles(specPath) {
  const stem = path.basename(specPath || '', '.md');
  if (!stem) return [];
  const names = [];
  for (const [f, text] of scriptText) {
    const tags = text.match(/@spec-source[^\n]*/g) || [];
    if (tags.some((t) => t.includes(stem))) names.push(path.basename(f));
  }
  return [...new Set(names)];
}

function refreshUnimplementedRows() {
  let changed = 0;
  for (let i = headerIdx + 2; i < end; i++) {
    const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    const r = parseRow(lines[i]);
    if (cells[1] !== '尚無實作' || SPEC_SOURCE_SKIP[r.id]) continue;
    const entry = regGet(r.id);
    const found = specSourceFiles(entry && entry.path);
    if (!found.length) continue;
    const wired = found.filter((n) => byBase.get(n).some(isImported));
    const wiring = wired.length === found.length ? '✅' : wired.length ? '🟡' : '❌';
    const hasTest = found.some((n) => tests.some((x) => path.basename(x) === `${path.basename(n, '.ts')}.test.ts`));
    lines[i] = `| ${cells[0]} | ${found.join(', ')} | ${cells[2]} | 🟡 | ${wiring} | ${hasTest ? '✅' : '❌'} | ${cells[6]} |`;
    changed++;
    console.log(`補登：${cells[0]} → ${found.length} 個代碼檔`);
  }
  console.log(`五欄模式：${changed} 列「尚無實作」可依 @spec-source 補登`);
  return changed;
}
/** 有代碼檔的列：依代碼檔重算接線、測試欄（PROG-2-1430）；代碼檔不見時邏輯欄降級，其餘欄與代碼欄註記原樣保留 */
function refreshWiringAndTests() {
  let changed = 0;
  for (let i = headerIdx + 2; i < end; i++) {
    const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    const names = [...new Set(cells[1].match(/[A-Za-z0-9_\-]+\.ts/g) || [])];
    if (!names.length) continue;
    const found = names.filter((n) => byBase.has(n));
    let logic = cells[3];
    if (found.length < names.length) logic = found.length ? (logic === '❌' ? '❌' : '🟡') : '❌';
    let wiring = '❌';
    let test = '❌';
    if (found.length) {
      const wired = found.filter((n) => byBase.get(n).some(isImported));
      wiring = wired.length === found.length ? '✅' : wired.length ? '🟡' : '❌';
      test = found.some((n) => hasTestFor(path.basename(n, '.ts'))) ? '✅' : '❌';
    }
    const next = `| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${logic} | ${wiring} | ${test} | ${cells[6]} |`;
    if (next !== lines[i]) {
      console.log(`重算：${cells[0]}　邏輯 ${cells[3]}→${logic}　接線 ${cells[4]}→${wiring}　測試 ${cells[5]}→${test}`);
      lines[i] = next;
      changed++;
    }
  }
  console.log(`五欄模式：${changed} 列接線／測試欄依代碼重算後有變`);
  return changed;
}

/** tests/ 內有 <stem>.test.ts，或有測試檔 import 這個代碼檔 */
function hasTestFor(stem) {
  if (tests.some((x) => path.basename(x) === `${stem}.test.ts`)) return true;
  return new RegExp(`from\\s+['"][^'"]*\\/${stem}['"]`).test(testText);
}

/** 規格書狀態：🔷 不需代碼；🟢 邏輯／接線／測試全 ✅；🟡 有代碼；🔴 無代碼或邏輯 ❌ */
function specStatus(id, cells) {
  if (D4_DOC_ONLY[id]) return '🔷';
  if (cells[1] === '尚無實作' || cells[3] === '❌') return '🔴';
  if (cells[3] === '✅' && cells[4] === '✅' && cells[5] === '✅') return '🟢';
  return '🟡';
}


/** 依 D-1 五欄重寫 D-4 加權總表、狀態分布、計算日期與 D-5 當日一列（PROG-2-1430） */
function rebuildD4() {
  const groups = D4_CATEGORIES.map((c) => ({ ...c, count: 0, got: 0 }));
  const byStatus = { '🟢': [], '🔷': [], '🟡': [], '🔴': [] };
  for (let i = headerIdx + 2; i < end; i++) {
    const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    const r = parseRow(lines[i]);
    const status = specStatus(r.id, cells);
    const g = groups.find((c) => (c.ids && c.ids.includes(r.id)) || (c.idPattern && c.idPattern.test(r.id))) || groups[groups.length - 1];
    g.count++;
    g.got += D4_POINTS[status] * g.weight;
    byStatus[status].push(cells[0].replace(/\*/g, '').replace(/\.md\s*\(doc_[a-z]+_\d{4}\)/, '').trim());
  }
  const max = groups.reduce((n, g) => n + g.count * g.weight, 0);
  const got = groups.reduce((n, g) => n + g.got, 0);
  const pct = pctOf(got, max);
  const totalMark = pct >= 60 ? '🟢' : pct >= 20 ? '🟡' : '🔴';
  const total = groups.reduce((n, g) => n + g.count, 0);
  const statusRows = [
    ['🟢 完整（邏輯／接線／測試皆 ✅）', '🟢'],
    ['🔷 名詞表類（不需代碼）', '🔷'],
    ['🟡 進行中（有代碼，三欄未全 ✅）', '🟡'],
    ['🔴 尚無代碼或邏輯 ❌', '🔴'],
  ];
  const body = [
    '#### 加權進度總表',
    '',
    '| 分類 | 計分權重 | 規格書數 | 最高得分 | 實得分 | 完成率 |',
    '|---|---|---|---|---|---|',
    ...groups.map((g) => `| ${g.label} | ×${g.weight} | ${g.count} | ${g.count * g.weight} | ${fmt(g.got)} | **${pctOf(g.got, g.count * g.weight)}%** |`),
    `| **合計（加權）** | — | **${total}** | **${max}** | **${fmt(got)}** | **${totalMark} ${pct}%** |`,
    '',
    '#### 規格書實作狀態分布',
    '',
    '| 狀態 | 規格書 | 規格書數 |',
    '|---|---|---|',
    ...statusRows.map(([label, k]) => `| ${label} | ${byStatus[k].join('、') || '—'} | ${byStatus[k].length} |`),
    `| **合計** | | **${total}** |`,
    '',
  ];
  const start = lines.findIndex((l) => l === '#### 加權進度總表');
  const stop = lines.findIndex((l, i) => i > start && /^#### 代碼覆蓋摘要/.test(l));
  const dateIdx = lines.findIndex((l) => /^> 最後由 .*自動計算：\*\*\d{4}-\d{2}-\d{2}\*\*/.test(l));
  if (start < 0 || stop < 0 || dateIdx < 0) { console.error('找不到 D-4 加權總表區段'); process.exit(2); }
  const same = lines.slice(start, stop).join('\n') === body.join('\n');
  console.log(`D-4：${total} 份規格書，加權 ${fmt(got)}／${max} = ${pct}%（🟢 ${byStatus['🟢'].length}／🔷 ${byStatus['🔷'].length}／🟡 ${byStatus['🟡'].length}／🔴 ${byStatus['🔴'].length}）${same ? '，與表內一致' : '，表內需更新'}`);
  if (same) return 0;
  const today = new Date().toISOString().slice(0, 10);
  lines.splice(start, stop - start, ...body);
  lines[dateIdx] = `> 最後由 \`node tools_node/build-progress-matrix.js\` 依 D-1 五欄自動計算：**${today}**。`;
  upsertHistory(today, pct);
  return 1;
}

function upsertHistory(date, pct) {
  const head = lines.findIndex((l) => /^\| 日期 \| 加權總進度 \|/.test(l));
  if (head < 0) return;
  const row = `| ${date} | ${pct}% | 工具重算（D-4，build-progress-matrix.js） | 同日覆蓋最新值 |`;
  const existing = lines.findIndex((l, i) => i > head && l.startsWith(`| ${date} |`));
  if (existing > 0) lines[existing] = row;
  else lines.splice(head + 2, 0, row);
}
