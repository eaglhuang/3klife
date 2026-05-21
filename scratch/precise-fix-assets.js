/**
 * precise-fix-assets.js
 * 根據 scratch/assets-errors.json 精確修復 assets/scripts/ 的 no-unused-vars 問題
 *
 * 策略：
 * 1. catch (e) → catch (_e)
 * 2. 函式參數 paramName → _paramName（逐行用 regex 改參數宣告）
 * 3. 未使用 import 名稱：從 import { ..., Name, ... } 中移除該名稱
 *    - 若整行移完後只剩 import {} from '...' → 刪除整行
 *    - 若行指向的不是 import 行 → 跳過，記錄 MANUAL
 *
 * 加 --apply 才真正寫入
 * 加 --verbose 顯示更多資訊
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

if (DRY_RUN) console.log('[DRY-RUN] 加 --apply 才會寫入');

const data = JSON.parse(fs.readFileSync('scratch/assets-errors.json', 'utf8'));

let fixed = 0, skipped = 0, manual = 0;

// ── 輔助：以行陣列方式操作檔案
function readLines(absPath) {
  return fs.readFileSync(absPath, 'utf8').split('\n');
}
function writeLines(absPath, lines) {
  fs.writeFileSync(absPath, lines.join('\n'), 'utf8');
}

// ── 工具：從 import 行移除一個識別符
function removeFromImportLine(line, name) {
  // 移除 ", Name" 或 "Name," 或單獨的 "Name"
  let result = line;
  // 先嘗試去掉 ",\s*Name" (name 在後)
  result = result.replace(new RegExp(`,\\s*\\b${name}\\b`, 'g'), '');
  // 若沒變，嘗試去掉 "Name\s*," (name 在前)
  if (result === line) result = result.replace(new RegExp(`\\b${name}\\b\\s*,\\s*`, 'g'), '');
  // 若還沒變（唯一元素），嘗試去掉整個 "{ Name }"  → "{}"
  if (result === line) result = result.replace(new RegExp(`\\{\\s*\\b${name}\\b\\s*\\}`), '{}');
  return result;
}

// ── 判斷是否為空 import
function isEmptyImport(line) {
  return /^\s*import\s+(type\s+)?\{\s*\}\s+from/.test(line);
}

// ── 1. 修 catch 變數
const catchByFile = {};
for (const e of data.catchErrors) {
  const p = e.file.replace(/\\/g, '/');
  if (!catchByFile[p]) catchByFile[p] = [];
  catchByFile[p].push(e.line);
}

for (const [relPath, lines] of Object.entries(catchByFile)) {
  const absPath = path.resolve(relPath);
  const lineArr = readLines(absPath);
  let changed = false;
  for (const ln of lines) {
    const idx = ln - 1;
    if (idx < 0 || idx >= lineArr.length) continue;
    const orig = lineArr[idx];
    const fixed_line = orig.replace(/\bcatch\s*\(\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\)/, (m, n) => {
      if (n.startsWith('_')) return m;
      return `catch (_${n})`;
    });
    if (fixed_line !== orig) {
      lineArr[idx] = fixed_line;
      console.log(`  [catch] ${relPath}:${ln}`);
      fixed++; changed = true;
    }
  }
  if (!DRY_RUN && changed) writeLines(absPath, lineArr);
}

// ── 2. 修函式參數
const argByFile = {};
for (const e of data.argErrors) {
  const p = e.file.replace(/\\/g, '/');
  if (!argByFile[p]) argByFile[p] = [];
  argByFile[p].push({ line: e.line, name: e.name });
}

for (const [relPath, items] of Object.entries(argByFile)) {
  const absPath = path.resolve(relPath);
  const lineArr = readLines(absPath);
  let changed = false;
  for (const { line: ln, name } of items) {
    const idx = ln - 1;
    if (idx < 0 || idx >= lineArr.length) continue;
    const orig = lineArr[idx];
    if (name.startsWith('_')) { if(VERBOSE) console.log(`  [ARG-SKIP] already _ ${relPath}:${ln}`); continue; }
    // 只在函式宣告行中改參數名（有 function 或 => 的行）
    // 用 word boundary 改第一個 name 出現（通常是參數宣告）
    const re = new RegExp(`\\b${name}\\b`);
    const fixed_line = orig.replace(re, `_${name}`);
    if (fixed_line !== orig) {
      lineArr[idx] = fixed_line;
      console.log(`  [arg] ${relPath}:${ln} '${name}' → '_${name}'`);
      fixed++; changed = true;
    } else {
      console.log(`  [ARG-MANUAL] ${relPath}:${ln} '${name}' 無法自動替換`);
      manual++;
    }
  }
  if (!DRY_RUN && changed) writeLines(absPath, lineArr);
}

// ── 3. 修未使用 import/var
// 按 (file, line) 分組，同一行可能有多個名稱要刪
const importByFileLine = {};
for (const e of data.importErrors) {
  const p = e.file.replace(/\\/g, '/');
  const key = `${p}|||${e.line}`;
  if (!importByFileLine[key]) importByFileLine[key] = { file: p, line: e.line, names: [] };
  importByFileLine[key].names.push(e.name);
}

// 按檔案分組
const importByFile = {};
for (const val of Object.values(importByFileLine)) {
  const p = val.file;
  if (!importByFile[p]) importByFile[p] = [];
  importByFile[p].push({ line: val.line, names: val.names });
}

for (const [relPath, edits] of Object.entries(importByFile)) {
  const absPath = path.resolve(relPath);
  if (!fs.existsSync(absPath)) { console.log(`[SKIP-NOTFOUND] ${relPath}`); skipped++; continue; }
  const lineArr = readLines(absPath);
  let changed = false;
  // 按行號從大到小處理，避免行號偏移
  const sorted = edits.slice().sort((a, b) => b.line - a.line);
  for (const { line: ln, names } of sorted) {
    const idx = ln - 1;
    if (idx < 0 || idx >= lineArr.length) continue;
    const orig = lineArr[idx];
    const isImport = /^\s*import\s/.test(orig);
    if (!isImport) {
      // 非 import 行（變數宣告、常數等）→ 人工審閱
      console.log(`  [MANUAL] ${relPath}:${ln} (${names.join(',')}) 非 import 行: ${orig.trim().substring(0, 60)}`);
      manual += names.length;
      continue;
    }
    let line = orig;
    for (const name of names) {
      const prev = line;
      line = removeFromImportLine(line, name);
      if (line !== prev) {
        if (VERBOSE) console.log(`  [import] ${relPath}:${ln} removed '${name}'`);
        fixed++;
      } else {
        console.log(`  [IMPORT-FAIL] ${relPath}:${ln} '${name}' 移除失敗: ${orig.trim().substring(0, 60)}`);
        manual++;
      }
    }
    if (isEmptyImport(line)) {
      // 整行刪除
      lineArr.splice(idx, 1);
      console.log(`  [DEL-LINE] ${relPath}:${ln} (empty import removed)`);
      changed = true;
    } else if (line !== orig) {
      lineArr[idx] = line;
      console.log(`  [IMPORT] ${relPath}:${ln} → ${line.trim().substring(0, 80)}`);
      changed = true;
    }
  }
  if (!DRY_RUN && changed) writeLines(absPath, lineArr);
}

console.log(`\n=== 結果: fixed=${fixed}, skipped=${skipped}, manual=${manual} ===`);
if (DRY_RUN) console.log('加 --apply 執行實際修改');
