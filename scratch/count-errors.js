const { execSync } = require('child_process');
let raw;
try {
  raw = execSync('npx eslint . --format json --no-error-on-unmatched-pattern', {
    encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'],
  });
} catch (e) { raw = e.stdout || ''; }

const j = raw.indexOf('['), k = raw.lastIndexOf(']');
if (j < 0 || k < 0) { console.log('無法解析 JSON'); process.exit(1); }

let results;
try { results = JSON.parse(raw.substring(j, k + 1)); }
catch(e) { console.log('JSON 解析錯誤:', e.message.substring(0, 100)); process.exit(1); }

let errors = 0, warnings = 0;
const errorsByRule = {};
for (const file of results) {
  for (const msg of file.messages) {
    if (msg.severity === 2) { errors++; const r = msg.ruleId||'unknown'; errorsByRule[r]=(errorsByRule[r]||0)+1; }
    else if (msg.severity === 1) warnings++;
  }
}

console.log(`\n=== 全域掃描 ===`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);
console.log('\n-- Errors by rule:');
const sorted = Object.entries(errorsByRule).sort((a,b)=>b[1]-a[1]);
for (const [r, n] of sorted) console.log(`  ${r}: ${n}`);
