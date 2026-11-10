#!/usr/bin/env node
/** 來源資產量測，不冒充 Creator 建置後大小或實際下載時序。 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : (p.endsWith('.meta') ? [] : [{ path: path.relative(root, p).replace(/\\/g, '/'), bytes: fs.statSync(p).size }]);
  });
}
function summarize(rows) {
  const groups = {};
  for (const row of rows) {
    const key = row.path.startsWith('assets/resources/') ? row.path.split('/')[2] : row.path.split('/').slice(0, 3).join('/');
    groups[key] = (groups[key] || 0) + row.bytes;
  }
  return { bytes: rows.reduce((s, r) => s + r.bytes, 0), files: rows.length,
    groups: Object.entries(groups).map(([path, bytes]) => ({ path, bytes })).sort((a, b) => b.bytes - a.bytes),
    largest: [...rows].sort((a, b) => b.bytes - a.bytes).slice(0, 20) };
}
function audit() {
  return { note: '來源檔案位元組；未計 Creator 壓縮、轉檔、去重、引擎、程式碼與其他靜態依賴；不是下載量或載入耗時。',
    resources: summarize(files(path.join(root, 'assets/resources'))), bundles: summarize(files(path.join(root, 'assets/bundles'))) };
}
if (require.main === module) process.stdout.write(JSON.stringify(audit(), null, 2) + '\n');
module.exports = { summarize, audit };
