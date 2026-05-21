/**
 * 解析 ESLint JSON 輸出，分類所有 warnings 和 errors
 */
import { readFileSync } from 'fs';

const raw = readFileSync('scratch/eslint-full-result.json', 'utf8');

// 有時候 ESLint 在 JSON 前面會有 warning 文字，找到 JSON 開始位置
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
  process.exit(1);
}

// 統計
const ruleStats = {};  // { ruleId: { count, severity, files: Set, examples: [] } }
let totalErrors = 0;
let totalWarnings = 0;
let totalFixable = 0;
let filesWithIssues = 0;
let totalFiles = results.length;

for (const file of results) {
  if (file.messages.length > 0) filesWithIssues++;
  for (const msg of file.messages) {
    const ruleId = msg.ruleId || '(parse-error)';
    const severity = msg.severity === 2 ? 'error' : 'warning';
    
    if (severity === 'error') totalErrors++;
    else totalWarnings++;
    if (msg.fix) totalFixable++;

    if (!ruleStats[ruleId]) {
      ruleStats[ruleId] = { count: 0, severity, files: new Set(), examples: [] };
    }
    ruleStats[ruleId].count++;
    
    // 短路徑
    const shortPath = file.filePath.replace(/^.*3KLife[\\/]/, '');
    ruleStats[ruleId].files.add(shortPath);
    
    if (ruleStats[ruleId].examples.length < 3) {
      ruleStats[ruleId].examples.push({
        file: shortPath,
        line: msg.line,
        message: msg.message.substring(0, 120),
      });
    }
  }
}

// 排序：按數量降序
const sorted = Object.entries(ruleStats).sort((a, b) => b[1].count - a[1].count);

console.log('=== ESLint 分析結果摘要 ===');
console.log(`檢查檔案數: ${totalFiles}`);
console.log(`有問題的檔案數: ${filesWithIssues}`);
console.log(`總 Errors: ${totalErrors}`);
console.log(`總 Warnings: ${totalWarnings}`);
console.log(`總計 (Errors + Warnings): ${totalErrors + totalWarnings}`);
console.log(`可自動修復: ${totalFixable}`);
console.log(`規則種類數: ${sorted.length}`);
console.log('');

console.log('=== 按規則分類（數量降序） ===');
console.log('');

for (const [ruleId, stats] of sorted) {
  console.log(`### ${ruleId}`);
  console.log(`  類型: ${stats.severity} | 出現次數: ${stats.count} | 影響檔案數: ${stats.files.size}`);
  console.log(`  範例:`);
  for (const ex of stats.examples) {
    console.log(`    - ${ex.file}:${ex.line} → ${ex.message}`);
  }
  console.log('');
}

// 分類統計表（適合產出 markdown）
console.log('=== 分類統計表 ===');
console.log('| 規則 | 類型 | 數量 | 影響檔案數 |');
console.log('|------|------|------|-----------|');
for (const [ruleId, stats] of sorted) {
  console.log(`| ${ruleId} | ${stats.severity} | ${stats.count} | ${stats.files.size} |`);
}
