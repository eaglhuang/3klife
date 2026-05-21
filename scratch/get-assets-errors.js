const { execSync } = require('child_process');
let raw;
try {
  raw = execSync('npx eslint assets/scripts --format json --no-error-on-unmatched-pattern', {
    encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'],
  });
} catch (e) { raw = e.stdout || ''; }

const j = raw.indexOf('['), k = raw.lastIndexOf(']');
const results = JSON.parse(raw.substring(j, k + 1));

const errors = [];
for (const file of results) {
  for (const msg of file.messages) {
    if (msg.severity === 2) {
      errors.push({
        file: file.filePath.replace(/\\/g, '/').split('assets/scripts/')[1],
        line: msg.line,
        msg: msg.message
      });
    }
  }
}
console.log(JSON.stringify(errors, null, 2));
