/**
 * auto-fix-unused-imports.js
 * 針對 assets/scripts/ 的 no-unused-vars 問題：
 * 1. 批次刪除確定未使用的 import（type-only，不影響邏輯）
 * 2. 處理 catch 變數 e → _e
 * 3. 處理函式參數加底線
 *
 * 執行前先 dry-run（不加 --apply）
 * 執行修改加 --apply
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--apply');
if (DRY_RUN) console.log('[DRY RUN] 不實際寫入，加 --apply 才會修改');

// ── 從 errors-detail.txt 讀取 assets/scripts/ 的 no-unused-vars 問題
const errText = fs.readFileSync('scratch/errors-detail.txt', 'utf8');
const lines = errText.split('\n');

// 收集每個檔案需要刪除的 import 名稱 + 行號修改
const fileActions = {}; // path → { deleteImportNames: Set, catchLines: number[], argLines: {line, paramName}[] }

for (const line of lines) {
  const m = line.match(/^\s+(.+?):(\d+) → '(.+?)' (is defined but never used|is assigned a value but never used)/);
  if (!m) continue;

  const [, filePath, lineNum, varName, reason] = m;
  const normPath = filePath.replace(/\\/g, '/');

  // 只處理 assets/scripts/
  if (!normPath.startsWith('assets/scripts/')) continue;

  if (!fileActions[normPath]) {
    fileActions[normPath] = { deleteImportNames: new Set(), catchLines: [], assignedUnused: [] };
  }

  // 如果是「catch errors must match /^_/」 → catch 加底線
  const catchMatch = line.match(/Allowed unused caught errors must match/);
  if (catchMatch) {
    fileActions[normPath].catchLines.push(parseInt(lineNum));
    continue;
  }

  // 如果是「args must match /^_/」 → 函式參數加底線
  const argMatch = line.match(/Allowed unused args must match/);
  if (argMatch) {
    fileActions[normPath].assignedUnused.push({ line: parseInt(lineNum), name: varName, isArg: true });
    continue;
  }

  // 其他：可能是 unused import 或 assigned-never-used 變數
  fileActions[normPath].assignedUnused.push({ line: parseInt(lineNum), name: varName, isArg: false });
}

// ── 處理每個檔案
let totalFixed = 0;
let totalSkipped = 0;

for (const [relPath, actions] of Object.entries(fileActions)) {
  const absPath = path.resolve(relPath);
  if (!fs.existsSync(absPath)) { console.log(`[SKIP] 找不到: ${relPath}`); totalSkipped++; continue; }

  let content = fs.readFileSync(absPath, 'utf8');
  const originalContent = content;

  // 1. 處理 catch (_e) — 只改有問題的 catch 行
  for (const catchLine of actions.catchLines) {
    const lineArr = content.split('\n');
    if (catchLine > 0 && catchLine <= lineArr.length) {
      const ln = lineArr[catchLine - 1];
      // 把 catch (e) → catch (_e)，或 catch (err) → catch (_err)
      const fixed = ln.replace(/\bcatch\s*\(\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\)/, (m, name) => {
        if (name.startsWith('_')) return m; // 已有底線
        return `catch (_${name})`;
      });
      if (fixed !== ln) {
        lineArr[catchLine - 1] = fixed;
        content = lineArr.join('\n');
        console.log(`  [catch] ${relPath}:${catchLine} → ${fixed.trim()}`);
        totalFixed++;
      }
    }
  }

  // 2. 處理函式參數加底線（只改行級別，保守策略）
  for (const item of actions.assignedUnused) {
    if (!item.isArg) continue;
    const lineArr = content.split('\n');
    if (item.line > 0 && item.line <= lineArr.length) {
      const ln = lineArr[item.line - 1];
      // 只改函式參數宣告中的名稱（避免改到函式體內的引用）
      // 用 word boundary 匹配，只改參數列表中的變數名
      const paramPattern = new RegExp(`\\b${item.name}\\b(?=\\s*[:,)\\s])`, 'g');
      // 只改第一次出現（通常是參數宣告位置）
      let count = 0;
      const fixed = ln.replace(paramPattern, (m) => {
        count++;
        if (count === 1 && !m.startsWith('_')) return `_${m}`;
        return m;
      });
      if (fixed !== ln) {
        lineArr[item.line - 1] = fixed;
        content = lineArr.join('\n');
        console.log(`  [arg] ${relPath}:${item.line} → ${fixed.trim().substring(0, 80)}`);
        totalFixed++;
      }
    }
  }

  // 3. 處理 import 行中確定未使用的識別符（只刪除 import-only 型）
  // 注意：不刪除在函式體中出現的變數
  for (const item of actions.assignedUnused) {
    if (item.isArg) continue;
    const lineArr = content.split('\n');
    if (item.line > 0 && item.line <= lineArr.length) {
      const ln = lineArr[item.line - 1].trim();
      // 如果是 import 行，移除該名稱
      if (ln.startsWith('import ') || ln.startsWith('import{') || ln.startsWith('import type')) {
        // 從 import { A, B, C } 中移除某個名稱
        const nameToRemove = item.name;
        const fixed = lineArr[item.line - 1]
          .replace(new RegExp(`,\\s*\\b${nameToRemove}\\b`, 'g'), '')  // 逗號在前
          .replace(new RegExp(`\\b${nameToRemove}\\b\\s*,`, 'g'), '')  // 逗號在後
          .replace(new RegExp(`\\{\\s*\\b${nameToRemove}\\b\\s*\\}`, 'g'), '{}');  // 只有這一個

        if (fixed !== lineArr[item.line - 1]) {
          // 若整行變成空 import，標記為刪除
          if (fixed.trim().match(/^import\s+(type\s+)?\{\s*\}\s+from/)) {
            lineArr[item.line - 1] = '// [ESLINT-REMOVED-EMPTY-IMPORT]';
          } else {
            lineArr[item.line - 1] = fixed;
          }
          content = lineArr.join('\n');
          console.log(`  [import] ${relPath}:${item.line} removed '${nameToRemove}'`);
          totalFixed++;
        } else {
          // import 行但移除不成功（可能是重複行或 re-export）
          console.log(`  [SKIP-IMPORT] ${relPath}:${item.line} '${nameToRemove}' 移除失敗，需人工`);
          totalSkipped++;
        }
      } else {
        // 不是 import 行（是變數宣告未使用）
        console.log(`  [MANUAL] ${relPath}:${item.line} '${nameToRemove}' 非 import 行，需人工審閱: ${ln.substring(0, 80)}`);
        totalSkipped++;
      }
    }
  }

  // 清除空 import 標記行
  content = content.split('\n').filter(l => l.trim() !== '// [ESLINT-REMOVED-EMPTY-IMPORT]').join('\n');

  if (!DRY_RUN && content !== originalContent) {
    fs.writeFileSync(absPath, content, 'utf8');
    console.log(`[WRITE] ${relPath}`);
  }
}

console.log(`\n=== 完成：修復 ${totalFixed}，跳過 ${totalSkipped} ===`);
if (DRY_RUN) console.log('加 --apply 執行實際修改');
