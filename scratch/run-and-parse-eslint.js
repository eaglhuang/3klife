/**
 * 直接在 Node.js 中執行 ESLint 並解析結果
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

console.log('正在執行 ESLint...');

try {
  // 直接用 execSync 取得 JSON 結果，maxBuffer 設大
  const raw = execSync('npx eslint . --format json --no-error-on-unmatched-pattern', {
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024, // 100MB
    cwd: process.cwd(),
  });
  writeFileSync('scratch/eslint-full-result.json', raw, 'utf8');
} catch (e) {
  // ESLint exit code 1 = lint errors found, stdout still has JSON
  if (e.stdout) {
    writeFileSync('scratch/eslint-full-result.json', e.stdout, 'utf8');
  } else {
    console.error('ESLint 執行失敗:', e.message);
    process.exit(1);
  }
}

// 讀取結果
import { readFileSync } from 'fs';
const raw = readFileSync('scratch/eslint-full-result.json', 'utf8');

const jsonStart = raw.indexOf('[');
const jsonEnd = raw.lastIndexOf(']');
if (jsonStart === -1 || jsonEnd === -1) {
  console.error('無法在輸出中找到 JSON 陣列');
  process.exit(1);
}

const jsonStr = raw.substring(jsonStart, jsonEnd + 1);
let results;
try {
  results = JSON.parse(jsonStr);
} catch (e) {
  console.error('JSON 解析失敗:', e.message);
  // 試著找出問題位置
  const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
  if (pos > 0) {
    console.error('問題附近文字:', jsonStr.substring(pos - 50, pos + 50));
  }
  process.exit(1);
}

// 統計
const ruleStats = {};
let totalErrors = 0;
let totalWarnings = 0;
let totalFixable = 0;
let filesWithIssues = 0;
const totalFiles = results.length;

// 目錄統計
const dirStats = {};

for (const file of results) {
  if (file.messages.length > 0) filesWithIssues++;
  
  const shortPath = file.filePath.replace(/^.*3KLife[\\/]/, '');
  const topDir = shortPath.split(/[\\/]/)[0];
  
  for (const msg of file.messages) {
    const ruleId = msg.ruleId || '(parse-error)';
    const severity = msg.severity === 2 ? 'error' : 'warning';
    
    if (severity === 'error') totalErrors++;
    else totalWarnings++;
    if (msg.fix) totalFixable++;

    if (!ruleStats[ruleId]) {
      ruleStats[ruleId] = { count: 0, errorCount: 0, warnCount: 0, files: new Set(), examples: [], fixable: 0 };
    }
    ruleStats[ruleId].count++;
    if (severity === 'error') ruleStats[ruleId].errorCount++;
    else ruleStats[ruleId].warnCount++;
    if (msg.fix) ruleStats[ruleId].fixable++;
    ruleStats[ruleId].files.add(shortPath);
    
    if (ruleStats[ruleId].examples.length < 3) {
      ruleStats[ruleId].examples.push({
        file: shortPath,
        line: msg.line,
        message: msg.message.substring(0, 150),
      });
    }

    // 目錄統計
    if (!dirStats[topDir]) dirStats[topDir] = { errors: 0, warnings: 0 };
    if (severity === 'error') dirStats[topDir].errors++;
    else dirStats[topDir].warnings++;
  }
}

// 排序
const sorted = Object.entries(ruleStats).sort((a, b) => b[1].count - a[1].count);

// 輸出摘要到檔案
const lines = [];
lines.push('# ESLint 全專案分析結果');
lines.push('');
lines.push('## 總覽');
lines.push(`- 檢查檔案數: ${totalFiles}`);
lines.push(`- 有問題的檔案數: ${filesWithIssues}`);
lines.push(`- 總 Errors: ${totalErrors}`);
lines.push(`- 總 Warnings: ${totalWarnings}`);
lines.push(`- 總計: ${totalErrors + totalWarnings}`);
lines.push(`- 可自動修復 (--fix): ${totalFixable}`);
lines.push(`- 規則種類數: ${sorted.length}`);
lines.push('');

lines.push('## 按目錄分布');
lines.push('| 目錄 | Errors | Warnings | 合計 |');
lines.push('|------|--------|----------|------|');
const sortedDirs = Object.entries(dirStats).sort((a, b) => (b[1].errors + b[1].warnings) - (a[1].errors + a[1].warnings));
for (const [dir, s] of sortedDirs) {
  lines.push(`| ${dir} | ${s.errors} | ${s.warnings} | ${s.errors + s.warnings} |`);
}
lines.push('');

lines.push('## 按規則分類（數量降序）');
lines.push('| 規則 | Errors | Warnings | 合計 | 影響檔案數 | 可自動修復 |');
lines.push('|------|--------|----------|------|-----------|-----------|');
for (const [ruleId, stats] of sorted) {
  lines.push(`| ${ruleId} | ${stats.errorCount} | ${stats.warnCount} | ${stats.count} | ${stats.files.size} | ${stats.fixable} |`);
}
lines.push('');

lines.push('## 各規則詳情與範例');
lines.push('');
for (const [ruleId, stats] of sorted) {
  lines.push(`### ${ruleId}`);
  lines.push(`- 類型: ${stats.errorCount > 0 ? 'error' : 'warning'} | 合計: ${stats.count} | 影響檔案: ${stats.files.size} | 可自動修復: ${stats.fixable}`);
  lines.push('- 範例:');
  for (const ex of stats.examples) {
    lines.push(`  - \`${ex.file}:${ex.line}\` → ${ex.message}`);
  }
  lines.push('');
}

const output = lines.join('\n');
writeFileSync('scratch/eslint-summary.md', output, 'utf8');
console.log(output);
console.log('\n已寫入 scratch/eslint-summary.md');
