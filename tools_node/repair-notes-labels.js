#!/usr/bin/env node
/**
 * repair-notes-labels.js
 *
 * 修復任務卡 YAML frontmatter notes 欄位中因 Agent 輸出編碼問題導致的 `??:` 標籤丟失。
 *
 * 背景：
 *   部分 Agent（如 vs-code-gpt-5.4-mini / codex-gpt-5）在寫入 notes 時，
 *   無法輸出中文字元，將 `狀態:` / `驗證:` / `變更:` / `阻塞:` 等 2 字標籤
 *   替換為 `??:`。由於格式是 pipe 分隔的固定位置欄位，可以確定性還原。
 *
 * 修復規則（pipe-delimited 位置）：
 *   DATE | 位置1 | 位置2 | 位置3 | 位置4
 *         ↓狀態:  ↓驗證:  ↓變更:  ↓阻塞:
 *
 * 注意：
 *   - 標籤可 100% 確定性還原，替換前後字元長度相同（??:  === 狀態: 等）
 *   - 值內的 `?` 字元（代表已損失的中文內容）不會被修改
 *   - 支援 word-wrap：notes 行跨多行時，用反向掃描找所屬 note entry 再定位
 *
 * 用法：
 *   node tools_node/repair-notes-labels.js                    # dry run，只報告
 *   node tools_node/repair-notes-labels.js --write            # 實際寫入
 *   node tools_node/repair-notes-labels.js --dir <path>       # 指定目錄（預設 docs/agent-briefs/tasks）
 *   node tools_node/repair-notes-labels.js --file <path>      # 只修一個檔案
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 每個 note entry 的標籤順序
const LABELS = ['狀態', '驗證', '變更', '阻塞'];

// 在 rawContent 裡，對每個 `| ??: ` 找到它屬於哪個 note entry 的第幾個 pipe position
// 然後替換 ??:  為正確標籤
// 策略：用 `YYYY-MM-DD |` 找每個 entry 的起始位置，
//       對 entry 起始到目標 `| ??: ` 之間計算 ` | ` 的出現次數，得出 pipe index
function repairRawContent(rawContent) {
  const PIPE_LABEL = '| ??:';     // 冒號後可能是空格或換行，不要求有 space
  const DATE_ANCHOR = /\d{4}-\d{2}-\d{2}\s*\|/g; // 每個 note entry 的起點

  // 先找出所有 note entry 的起始位置（offset）
  const entryOffsets = [];
  let m;
  DATE_ANCHOR.lastIndex = 0;
  while ((m = DATE_ANCHOR.exec(rawContent)) !== null) {
    entryOffsets.push(m.index);
  }

  if (entryOffsets.length === 0) return { content: rawContent, count: 0 };

  // 對目標字串做就地替換（??:  → label: ，字元數相同，offset 不偏移）
  let result = rawContent;
  let totalFixed = 0;
  let searchFrom = 0;

  while (true) {
    const idx = result.indexOf(PIPE_LABEL, searchFrom);
    if (idx === -1) break;

    // 找這個 | ??: 所屬的最近 note entry 起點
    let entryStart = -1;
    for (const eo of entryOffsets) {
      if (eo <= idx) entryStart = eo;
    }

    if (entryStart === -1) {
      searchFrom = idx + PIPE_LABEL.length;
      continue;
    }

    // 計算從 entryStart 到這個 | ??: 之前，共有幾個 ' | '
    // 用 idx（不含當前 | 本身）作為終點，這樣不會把當前 pipe 自己算進去
    const segment = result.slice(entryStart, idx);
    let pipeCount = 0;
    let p = 0;
    while (true) {
      const found = segment.indexOf(' | ', p);
      if (found === -1) break;
      pipeCount++;
      p = found + 3;
    }
    // pipeCount 0-indexed: 0=狀態, 1=驗證, 2=變更, 3=阻塞
    const label = LABELS[pipeCount];
    if (label) {
      // 替換 ??:  (idx+2 是 ??:  的起點，因為 idx 指向 '| '，idx+2 指向 '?')
      result = result.slice(0, idx + 2) + label + ':' + result.slice(idx + 2 + 3);
      totalFixed++;
    }

    searchFrom = idx + PIPE_LABEL.length; // 繼續搜尋（長度不變，offset 不偏移）
  }

  return { content: result, count: totalFixed };
}

/**
 * 修復單一檔案
 * @param {string} filePath
 * @param {boolean} write
 * @returns {{ changed: boolean, count: number }}
 */
function repairFile(filePath, write) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { content: repaired, count } = repairRawContent(raw);

  if (count === 0) return { changed: false, count: 0 };

  if (write) {
    fs.writeFileSync(filePath, repaired, 'utf8');
  }

  return { changed: true, count };
}

/**
 * 遞迴收集指定目錄下所有 .md 檔案
 * @param {string} dir
 * @returns {string[]}
 */
function collectMdFiles(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push(fullPath);
    }
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const dirIdx = args.indexOf('--dir');
  const fileIdx = args.indexOf('--file');

  let targetFiles = [];

  if (fileIdx !== -1) {
    const targetPath = args[fileIdx + 1];
    if (!targetPath) {
      console.error('[repair-notes-labels] Error: --file requires a path');
      process.exit(1);
    }
    targetFiles = [path.resolve(targetPath)];
  } else {
    const targetDir = dirIdx !== -1
      ? path.resolve(args[dirIdx + 1])
      : path.join(ROOT, 'docs', 'agent-briefs', 'tasks');
    targetFiles = collectMdFiles(targetDir);
  }

  if (targetFiles.length === 0) {
    console.log('[repair-notes-labels] No .md files found.');
    return;
  }

  let totalFiles = 0;
  let totalLabels = 0;

  for (const filePath of targetFiles) {
    const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
    const result = repairFile(filePath, write);
    if (result.changed) {
      totalFiles++;
      totalLabels += result.count;
      const action = write ? '[fixed]' : '[would fix]';
      console.log(`${action} ${relPath} (${result.count} labels)`);
    }
  }

  console.log('');
  if (totalFiles === 0) {
    console.log('[repair-notes-labels] OK: no ??-label corruption found.');
  } else if (write) {
    console.log(`[repair-notes-labels] Fixed: ${totalFiles} files, ${totalLabels} labels restored.`);
  } else {
    console.log(`[repair-notes-labels] Dry run: ${totalFiles} files need repair, ${totalLabels} labels to restore.`);
    console.log('[repair-notes-labels] Run with --write to apply fixes.');
  }
}

main();

