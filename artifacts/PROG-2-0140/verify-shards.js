'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'docs/tasks/tasks-aao.json');
const dir = path.join(root, 'docs/tasks-aao-shards');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = fs.readFileSync(source);
const sourceData = JSON.parse(before);
const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.shardrc.json'), 'utf8'));
assert.equal(cfg.keepSourceIntact, true);
const generate = () => cp.execFileSync(process.execPath,
  ['tools_node/shard-manager.js', 'shard', 'docs/tasks-aao-shards'],
  { cwd: root, stdio: 'pipe' });
generate();
assert.deepEqual(fs.readFileSync(source), before, 'aggregate bytes must be unchanged');
const files = cfg.shards.map(s => path.join(dir, s.name + '.json'));
const projected = files.flatMap(file => JSON.parse(fs.readFileSync(file, 'utf8')));
assert.equal(projected.length, sourceData.tasks.length, 'record count');
const byId = new Map();
for (const task of projected) {
  assert(!byId.has(task.id), 'duplicate projected ID: ' + task.id);
  byId.set(task.id, task);
}
for (const task of sourceData.tasks) {
  assert.deepEqual(byId.get(task.id), task, 'record fields: ' + task.id);
}
const digests = files.map(file => hash(fs.readFileSync(file)));
generate();
assert.deepEqual(files.map(file => hash(fs.readFileSync(file))), digests, 'idempotence');
assert.deepEqual(fs.readFileSync(source), before, 'repeat aggregate bytes unchanged');
const report = {
  passed: true,
  taskCount: projected.length,
  uniqueIds: byId.size,
  allRecordsIdentical: true,
  aggregateSha256: hash(before),
  aggregateBytesUnchanged: true,
  idempotent: true,
  maxPartBytes: Math.max(...files.map(file => fs.statSync(file).size)),
  parts: files.map((file, i) => ({ path: path.relative(root, file).replace(/\\/g, '/'), sha256: digests[i] }))
};
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
