#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const TARGET_CODE = 'ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET';

const result = spawnSync(process.execPath, ['atm.mjs', 'tasks', 'audit', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 300,
});

const raw = `${result.stdout || ''}${result.stderr || ''}`;
let audit;
try {
  audit = JSON.parse(raw);
} catch (error) {
  console.error('CROSS_REPO_PACKET_BASELINE_PARSE_ERROR');
  console.error(error.message);
  process.exit(1);
}

const findings = audit.evidence?.report?.findings || [];
const crossRepo = findings.filter((finding) => finding.code === TARGET_CODE);
const active = crossRepo.filter((finding) => finding.acknowledged !== true);
const otherActive = findings.filter(
  (finding) => finding.code !== TARGET_CODE && finding.acknowledged !== true,
);

console.log(`AUDIT_OK=${audit.ok === true}`);
console.log(`CROSS_REPO_PACKET_TOTAL=${crossRepo.length}`);
console.log(`CROSS_REPO_PACKET_ACTIVE=${active.length}`);
console.log(`OTHER_ACTIVE_WARNINGS=${otherActive.length}`);

if (audit.ok !== true) {
  console.error('tasks audit did not return ok=true');
  process.exit(1);
}

if (active.length > 0) {
  console.error('Unacknowledged cross-repo packet findings remain:');
  for (const finding of active.slice(0, 20)) {
    console.error(`${finding.taskId || '<unknown>'}\t${finding.path}`);
  }
  if (active.length > 20) {
    console.error(`... ${active.length - 20} more`);
  }
  process.exit(1);
}
