const fs = require('fs');
const { spawnSync } = require('child_process');

const lockPath = '.atm/runtime/locks/ATM-FRAMEWORK-TEMP-001.lock.json';
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  if (lock.released !== true && lock.status !== 'released') {
    console.error(`${lockPath} still exists and is not released`);
    process.exit(1);
  }
}

const status = spawnSync(
  process.execPath,
  ['atm.mjs', 'tasks', 'status', '--task', 'TASK-CID-0091', '--json'],
  { encoding: 'utf8' },
);

if (status.status !== 0) {
  process.stderr.write(status.stderr || status.stdout);
  process.exit(status.status || 1);
}

const payload = JSON.parse(status.stdout);
const ledger = payload.evidence?.liveLedger;
if (ledger?.status === 'running' && ledger?.claimState === 'active') {
  console.error('TASK-CID-0091 still has an active running claim');
  process.exit(1);
}

console.log('stale claim and framework lock cleanup ok');
