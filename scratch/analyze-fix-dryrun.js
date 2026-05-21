/**
 * 分析 ESLint --fix-dry-run 輸出，只摘要可修項目
 * 用法: node scratch/analyze-fix-dryrun.js
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('正在執行 ESLint --fix-dry-run ...');

let raw;
try {
  raw = execSync('npx eslint . --fix-dry-run --format json --no-error-on-unmatched-pattern', {
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  });
} catch (e) {
  raw = e.stdout || '';
}

const jsonStart = raw.indexOf('[');
const jsonEnd = raw.lastIndexOf(']');
if (jsonStart === -1 || jsonEnd === -1) {
  console.error('找不到 JSON');
  process.exit(1);
}

const results = JSON.parse(raw.substring(jsonStart, jsonEnd + 1));

// 只看有 fix 的 message
const fixableByRule = {};
let totalFixable = 0;
const fixableFiles = new Set();

// 同時統計新配置下的總 errors/warnings
let totalErrors = 0;
let totalWarnings = 0;
const ruleStats = {};

for (const file of results) {
  const shortPath = file.filePath.replace(/^.*3KLife[\\/]/, '');
  for (const msg of file.messages) {
    const ruleId = msg.ruleId || '(parse-error)';
    const severity = msg.severity === 2 ? 'error' : 'warning';
    if (severity === 'error') totalErrors++;
    else totalWarnings++;

    if (!ruleStats[ruleId]) ruleStats[ruleId] = { errors: 0, warnings: 0 };
    if (severity === 'error') ruleStats[ruleId].errors++;
    else ruleStats[ruleId].warnings++;

    if (msg.fix) {
      totalFixable++;
      fixableFiles.add(shortPath);
      if (!fixableByRule[ruleId]) fixableByRule[ruleId] = { count: 0, files: new Set() };
      fixableByRule[ruleId].count++;
      fixableByRule[ruleId].files.add(shortPath);
    }
  }
}

console.log('\n=== 新配置下的總問題數 ===');
console.log(`Errors: ${totalErrors}`);
console.log(`Warnings: ${totalWarnings}`);
console.log(`合計: ${totalErrors + totalWarnings}`);
console.log('');

console.log('=== 按規則統計 ===');
const sortedRules = Object.entries(ruleStats).sort((a, b) => (b[1].errors + b[1].warnings) - (a[1].errors + a[1].warnings));
console.log('| 規則 | Errors | Warnings | 合計 |');
console.log('|------|--------|----------|------|');
for (const [rule, s] of sortedRules) {
  console.log(`| ${rule} | ${s.errors} | ${s.warnings} | ${s.errors + s.warnings} |`);
}

console.log('\n=== 可自動修復 (--fix) 摘要 ===');
console.log(`可自動修復總數: ${totalFixable}`);
console.log(`涉及檔案數: ${fixableFiles.size}`);
console.log('');

const sortedFix = Object.entries(fixableByRule).sort((a, b) => b[1].count - a[1].count);
console.log('| 規則 | 可修數 | 涉及檔案數 |');
console.log('|------|--------|-----------|');
for (const [rule, s] of sortedFix) {
  console.log(`| ${rule} | ${s.count} | ${s.files.size} |`);
}

// 寫入詳細可修檔案清單
const fixFileList = [...fixableFiles].sort();
fs.writeFileSync('scratch/fixable-files.txt', fixFileList.join('\n'), 'utf8');
console.log(`\n可修檔案清單已寫入 scratch/fixable-files.txt (${fixFileList.length} 檔)`);
