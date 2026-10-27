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
  refreshUnimplementedRows();
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
  if (checkOnly) process.exit(changed ? 1 : 0);
  if (changed) fs.writeFileSync(progressPath, lines.join('\n'), 'utf8');
}
