/**
 * 列出新配置下剩餘的 no-var / prefer-const / no-console 問題的具體位置
 */
const { execSync } = require('child_process');

console.log('正在掃描剩餘的機械可修問題位置...');

let raw;
try {
  raw = execSync('npx eslint . --format json --no-error-on-unmatched-pattern', {
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  });
} catch (e) {
  raw = e.stdout || '';
}

const jsonStart = raw.indexOf('[');
const jsonEnd = raw.lastIndexOf(']');
const results = JSON.parse(raw.substring(jsonStart, jsonEnd + 1));

const targetRules = ['no-var', 'prefer-const', 'no-console', 'eqeqeq', 'vue/one-component-per-file', 'import/no-dynamic-require'];

for (const targetRule of targetRules) {
  const hits = [];
  for (const file of results) {
    const shortPath = file.filePath.replace(/^.*3KLife[\\/]/, '');
    for (const msg of file.messages) {
      if (msg.ruleId === targetRule) {
        hits.push({ file: shortPath, line: msg.line, message: msg.message.substring(0, 100) });
      }
    }
  }
  if (hits.length > 0) {
    console.log(`\n### ${targetRule} (${hits.length} 個)`);
    for (const h of hits) {
      console.log(`  ${h.file}:${h.line} → ${h.message}`);
    }
  }
}

// 也列出 parse-error
const parseErrors = [];
for (const file of results) {
  const shortPath = file.filePath.replace(/^.*3KLife[\\/]/, '');
  for (const msg of file.messages) {
    if (!msg.ruleId) {
      parseErrors.push({ file: shortPath, line: msg.line, message: msg.message.substring(0, 120) });
    }
  }
}
if (parseErrors.length > 0) {
  console.log(`\n### (parse-error) (${parseErrors.length} 個)`);
  for (const h of parseErrors) {
    console.log(`  ${h.file}:${h.line} → ${h.message}`);
  }
}
