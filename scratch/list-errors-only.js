/**
 * 只列出 Errors（severity=2），分規則 + 具體位置
 * 用法: node scratch/list-errors-only.js
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('掃描所有 Errors...');
let raw;
try {
  raw = execSync('npx eslint . --format json --no-error-on-unmatched-pattern', {
    encoding: 'utf8', maxBuffer: 100 * 1024 * 1024,
  });
} catch (e) { raw = e.stdout || ''; }

const j = raw.indexOf('['), k = raw.lastIndexOf(']');
const results = JSON.parse(raw.substring(j, k + 1));

const byRule = {};
let totalErrors = 0;

for (const file of results) {
  const shortPath = file.filePath.replace(/^.*3KLife[\\/]/, '');
  for (const msg of file.messages) {
    if (msg.severity !== 2) continue;
    totalErrors++;
    const rule = msg.ruleId || '(parse-error/no-ruleId)';
    if (!byRule[rule]) byRule[rule] = [];
    byRule[rule].push({ file: shortPath, line: msg.line, message: msg.message.substring(0, 120) });
  }
}

console.log(`\n=== 總 Errors: ${totalErrors} ===\n`);

const sorted = Object.entries(byRule).sort((a, b) => b[1].length - a[1].length);
for (const [rule, hits] of sorted) {
  console.log(`### ${rule} (${hits.length})`);
  for (const h of hits) {
    console.log(`  ${h.file}:${h.line} → ${h.message}`);
  }
  console.log('');
}

fs.writeFileSync('scratch/errors-detail.txt',
  sorted.map(([r, hs]) =>
    `### ${r} (${hs.length})\n` + hs.map(h => `  ${h.file}:${h.line} → ${h.message}`).join('\n')
  ).join('\n\n'),
  'utf8'
);
console.log('已寫入 scratch/errors-detail.txt');
