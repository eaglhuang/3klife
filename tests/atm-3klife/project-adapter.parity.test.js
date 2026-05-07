#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  create3KLifeProjectAdapter,
} = require('../../tools_node/adapters/atm-3klife/project-adapter');

const projectRoot = path.resolve(__dirname, '..', '..');

function runNodeScript(scriptRelativePath, args) {
  const scriptPath = path.join(projectRoot, scriptRelativePath);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    shell: false,
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`${scriptRelativePath} failed: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return String(result.stdout || '').trim();
}

function main() {
  const adapter = create3KLifeProjectAdapter();

  const directResolve = runNodeScript('tools_node/resolve-doc-id.js', ['doc_task_0264']);
  const adapterResolve = adapter.stores.documentIndex.resolveDocumentId('doc_task_0264');
  assert.ok(directResolve.includes('docs/agent-briefs/tasks/ATM-3-0001.md'));
  assert.strictEqual(adapterResolve, 'docs/agent-briefs/tasks/ATM-3-0001.md');

  const directEncoding = spawnSync(process.execPath, [
    path.join(projectRoot, 'tools_node', 'check-encoding-touched.js'),
    '--files',
    'docs/agent-briefs/tasks/ATM-3-0001.md',
  ], {
    cwd: projectRoot,
    encoding: 'utf8',
    shell: false,
  });
  const adapterEncoding = adapter.stores.ruleGuard.runGuard('encoding', {
    files: ['docs/agent-briefs/tasks/ATM-3-0001.md'],
  });
  assert.strictEqual(directEncoding.status, 0);
  assert.strictEqual(adapterEncoding.ok, true);

  const lockRecord = adapter.stores.lockStore.acquireLock(
    { workItemId: 'ATM-3-0001-PARITY', title: 'Parity', status: 'running' },
    ['artifacts/atm-3-0001/parity-free.txt'],
    'adapter-parity-test'
  );
  assert.deepStrictEqual(lockRecord.files, ['artifacts/atm-3-0001/parity-free.txt']);
  assert.strictEqual(adapter.stores.lockStore.getLock('ATM-3-0001-PARITY'), null);

  console.log('project-adapter parity tests passed');
}

main();