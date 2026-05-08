#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  create3KLifeProjectAdapter,
} = require('../../tools_node/adapters/atm-3klife/project-adapter');

const projectRoot = path.resolve(__dirname, '..', '..');
const artifactRoot = path.join(projectRoot, 'artifacts', 'atm-3-0001');

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(artifactRoot, fileName), 'utf8'));
}

function assertFileExists(fileName) {
  const filePath = path.join(artifactRoot, fileName);
  assert.ok(fs.existsSync(filePath), `${fileName} should exist in artifacts/atm-3-0001`);
}

function main() {
  const adapter = create3KLifeProjectAdapter();
  const context = {
    repositoryRoot: projectRoot,
    lifecycleMode: 'evolution',
    actor: 'adapter-integration-test',
  };
  const workItem = {
    workItemId: 'ATM-3-0001',
    title: '3KLife ProjectAdapter wrapper',
    status: 'running',
  };

  assert.strictEqual(adapter.adapterName, '@3klife/project-adapter-shadow');
  assert.ok(adapter.capabilities.some((entry) => entry.capabilityId === '3klife.lock-store.shadow'));
  assert.ok(adapter.capabilities.some((entry) => entry.capabilityId === '3klife.rule-guard.shadow'));

  const initializeResult = adapter.initialize(context);
  assert.strictEqual(initializeResult.ok, true);
  const task = adapter.stores.taskStore.getTask('ATM-3-0001');
  assert.ok(task, 'taskStore should resolve ATM-3-0001');
  assert.strictEqual(task.workItemId, 'ATM-3-0001');

  const docPath = adapter.stores.documentIndex.resolveDocumentId('doc_task_0264');
  assert.strictEqual(docPath, 'docs/agent-briefs/tasks/ATM/ATM-3-0001.md');

  const shard = adapter.stores.shardStore.readShard('docs/tasks/tasks-atm/tasks-atm-part-12.json');
  assert.ok(Array.isArray(shard), 'ATM shard should load as an array');

  const syntheticLock = adapter.stores.lockStore.acquireLock(
    { workItemId: 'ATM-3-0001-SHADOW', title: 'Synthetic Shadow Lock', status: 'running' },
    ['artifacts/atm-3-0001/synthetic-shadow.txt'],
    'adapter-integration-test'
  );
  assert.strictEqual(syntheticLock.lockedBy, 'adapter-integration-test');
  assert.strictEqual(adapter.stores.lockStore.getLock('ATM-3-0001-SHADOW'), null);

  const encodingGuard = adapter.stores.ruleGuard.runGuard('encoding', {
    files: ['docs/agent-briefs/tasks/ATM/ATM-3-0001.md'],
  });
  assert.strictEqual(encodingGuard.ok, true);

  const evidence = adapter.stores.evidenceStore.writeEvidence('ATM-3-0001', {
    evidenceKind: 'handoff',
    summary: 'integration test evidence',
    artifactPaths: [],
  });
  assert.strictEqual(evidence.evidenceKind, 'handoff');
  assert.ok(adapter.stores.evidenceStore.listEvidence('ATM-3-0001').length >= 1);

  const prepareResult = adapter.prepareWorkItem(context, workItem);
  assert.strictEqual(prepareResult.ok, true);
  const finalizeResult = adapter.finalizeWorkItem(context, workItem);
  assert.strictEqual(finalizeResult.ok, true);

  assertFileExists('adapter-capability-matrix.json');
  assertFileExists('governance-mapping-matrix.json');
  assertFileExists('shadow-mode-report.json');
  assertFileExists('shadow-mode-report.md');

  const capabilityMatrix = readJson('adapter-capability-matrix.json');
  const mappingMatrix = readJson('governance-mapping-matrix.json');
  assert.strictEqual(capabilityMatrix.giantAtomDecision, 'rejected');
  const ruleGuardEntry = mappingMatrix.stores.find((entry) => entry.storeId === 'ruleGuard');
  assert.strictEqual(ruleGuardEntry.phase2.mode, 'atom-map');
  assert.strictEqual(ruleGuardEntry.phase2.proposedAtomMapId, 'ATM-GOV-MAP-0001');

  const summary = adapter.stores.contextSummaryStore.readSummary('ATM-3-0001');
  assert.ok(summary, 'context summary should be written during prepareWorkItem');

  console.log('project-adapter integration tests passed');
}

main();