const { execSync } = require('child_process');
let raw;
try {
  raw = execSync('npx eslint . --format json --no-error-on-unmatched-pattern', {
    encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'],
  });
} catch (e) { raw = e.stdout || ''; }

const j = raw.indexOf('['), k = raw.lastIndexOf(']');
const results = JSON.parse(raw.substring(j, k + 1));

// 按目錄分組 Errors
const byDir = {};
for (const file of results) {
  const shortPath = file.filePath.replace(/\\/g, '/').replace(/^.*3KLife\//, '');
  const dir = shortPath.split('/')[0];
  let fileErrors = 0;
  for (const msg of file.messages) {
    if (msg.severity === 2) {
      fileErrors++;
      if (!byDir[dir]) byDir[dir] = { total: 0, files: new Set(), rules: {} };
      byDir[dir].total++;
      byDir[dir].files.add(shortPath);
      const r = msg.ruleId || 'unknown';
      byDir[dir].rules[r] = (byDir[dir].rules[r] || 0) + 1;
    }
  }
}

const sorted = Object.entries(byDir).sort((a, b) => b[1].total - a[1].total);
console.log('\n-- Errors by top-level directory:');
for (const [dir, info] of sorted) {
  console.log(`  ${dir}: ${info.total} errors (${info.files.size} files)`);
  const rules = Object.entries(info.rules).sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [r, n] of rules) console.log(`    ${r}: ${n}`);
}
