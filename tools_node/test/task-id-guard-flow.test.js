#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const tempRoot = path.join(projectRoot, 'temp', 'task-id-guard-flow');
const taskCardDir = path.join(tempRoot, 'docs', 'agent-briefs', 'tasks');
const lockDir = path.join(tempRoot, '.task-locks');
const { runTaskCardOpener } = require('../task-card-opener');
const {
  inspectTaskId,
  releaseReservedTaskId,
  reserveNextTaskId,
  reserveTaskId,
} = require('../lib/task-id-guard');
const { createLockAdapter } = require('../adapters/atm-3klife/lock-adapter');
const { createLockAdapterConfig } = require('../adapters/atm-3klife/lock-adapter-config');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resetTempRoot() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.mkdirSync(taskCardDir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function lockPath(root, taskId) {
  return path.join(root, '.task-locks', `${taskId}.lock.json`);
}

function buildTempLockAdapter() {
  return createLockAdapter(createLockAdapterConfig({
    projectRoot: tempRoot,
    lockDir,
    taskCardDir,
  }));
}

async function runTaskCardOpenerArgs(args) {
  const originalAgentIdentity = process.env.AGENT_IDENTITY;
  process.env.AGENT_IDENTITY = 'task-id-flow-agent';
  try {
    return await runTaskCardOpener([
      process.execPath,
      path.join(projectRoot, 'tools_node', 'task-card-opener.js'),
      ...args,
    ]);
  } finally {
    if (typeof originalAgentIdentity === 'string') {
      process.env.AGENT_IDENTITY = originalAgentIdentity;
    } else {
      delete process.env.AGENT_IDENTITY;
    }
  }
}

function cleanupRealProjectArtifacts(taskId) {
  const lockFilePath = path.join(projectRoot, '.task-locks', `${taskId}.lock.json`);
  if (fs.existsSync(lockFilePath)) {
    fs.unlinkSync(lockFilePath);
  }
  for (const entryName of [
    `${taskId}.md`,
    `${taskId}.json`,
  ]) {
    const filePath = path.join(projectRoot, 'temp', entryName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function testGuardReservationAndPromotion() {
  resetTempRoot();
  const reservation = reserveTaskId(tempRoot, 'ATM-FLOW-0001', 'flow-agent');
  assert(reservation.taskId === 'ATM-FLOW-0001', 'exact reservation should keep requested id');

  const lock = readJson(lockPath(tempRoot, 'ATM-FLOW-0001'));
  assert(lock.reservationOnly === true, 'reserveTaskId should create reservation-only lock');

  const reused = reserveTaskId(tempRoot, 'ATM-FLOW-0001', 'flow-agent');
  assert(reused.reused === true, 'same agent should be able to reuse its own reservation');

  try {
    reserveTaskId(tempRoot, 'ATM-FLOW-0001', 'other-agent');
    throw new Error('foreign reservation should fail');
  } catch (error) {
    assert(/reservation collision/.test(String(error.message)), 'foreign reservation should report collision');
  }

  fs.writeFileSync(path.join(tempRoot, 'scope.txt'), 'scope\n', 'utf8');
  buildTempLockAdapter().lock('ATM-FLOW-0001', 'flow-agent', ['scope.txt']);
  const promotedLock = readJson(lockPath(tempRoot, 'ATM-FLOW-0001'));
  assert(promotedLock.reservationOnly === undefined, 'formal lock should clear reservationOnly');
  assert(promotedLock.files.includes('scope.txt'), 'formal lock should record file scope');
  assert(String(promotedLock.scopeFingerprint || '').startsWith('sha256:'), 'formal lock should record fingerprint');
}

function testReserveNextAndRelease() {
  resetTempRoot();
  fs.writeFileSync(path.join(taskCardDir, 'ATM-FLOW-0004.md'), '---\nid: ATM-FLOW-0004\n---\n', 'utf8');
  const reservation = reserveNextTaskId(tempRoot, 'ATM-FLOW', 'flow-agent');
  assert(reservation.taskId === 'ATM-FLOW-0005', 'reserveNextTaskId should skip task cards and locks');
  assert(inspectTaskId(tempRoot, reservation.taskId).occupied === true, 'reservation should occupy the id');
  assert(releaseReservedTaskId(tempRoot, reservation.taskId, 'flow-agent') === true, 'release should remove own reservation');
  assert(inspectTaskId(tempRoot, reservation.taskId).occupied === false, 'released reservation should free the id');
}

async function testTaskCardOpenerOpenCardsDoNotLeaveFormalLocks() {
  const taskIds = ['ATM-FLOW-9001', 'ATM-FLOW-9002'];
  const sharedJsonPath = 'temp/task-id-flow-shared.json';
  taskIds.forEach(cleanupRealProjectArtifacts);
  const sharedJsonAbsPath = path.join(projectRoot, sharedJsonPath);
  if (fs.existsSync(sharedJsonAbsPath)) {
    fs.unlinkSync(sharedJsonAbsPath);
  }

  try {
    for (const taskId of taskIds) {
      await runTaskCardOpenerArgs([
        '--id',
        taskId,
        '--title',
        'Task id flow regression',
        '--owner',
        'task-id-flow-agent',
        '--md-out',
        `temp/${taskId}.md`,
        '--json-out',
        sharedJsonPath,
        '--json-kind',
        'task-aggregate',
        '--write',
      ]);

      assert(!fs.existsSync(path.join(projectRoot, '.task-locks', `${taskId}.lock.json`)), 'open task card should release reservation instead of leaving a formal lock');
      const aggregateSnapshot = readJson(sharedJsonAbsPath);
      const taskEntry = Array.isArray(aggregateSnapshot.tasks)
        ? aggregateSnapshot.tasks.find((entry) => entry && entry.id === taskId)
        : null;
      assert(taskEntry, 'shared aggregate should contain the newly opened task');
      assert(taskEntry.started_at === '', 'open task card aggregate entry should not include started_at value');
      assert(taskEntry.started_by_agent === '', 'open task card aggregate entry should not include started_by_agent value');
    }

    const aggregate = readJson(sharedJsonAbsPath);
    assert(Array.isArray(aggregate.tasks), 'task aggregate should keep tasks array');
    assert(aggregate.tasks.some((entry) => entry.id === taskIds[0]), 'shared aggregate should contain first open task');
    assert(aggregate.tasks.some((entry) => entry.id === taskIds[1]), 'shared aggregate should contain second open task');
  } finally {
    taskIds.forEach(cleanupRealProjectArtifacts);
    if (fs.existsSync(sharedJsonAbsPath)) {
      fs.unlinkSync(sharedJsonAbsPath);
    }
  }
}

async function testTaskCardOpenerInProgressPromotion() {
  const taskId = 'ATM-FLOW-9003';
  cleanupRealProjectArtifacts(taskId);
  try {
    await runTaskCardOpenerArgs([
      '--id',
      taskId,
      '--title',
      'Task id flow regression',
      '--owner',
      'task-id-flow-agent',
      '--status',
      'in-progress',
      '--md-out',
      `temp/${taskId}.md`,
      '--json-out',
      `temp/${taskId}.json`,
      '--write',
    ]);

    const lock = readJson(path.join(projectRoot, '.task-locks', `${taskId}.lock.json`));
    assert(lock.reservationOnly === undefined, 'in-progress task-card-opener should promote reservation to formal lock');
    assert(lock.files.includes(`temp/${taskId}.md`), 'promoted lock should include markdown output');
    assert(lock.files.includes(`temp/${taskId}.json`), 'promoted lock should include json output');
    const taskJson = readJson(path.join(projectRoot, 'temp', `${taskId}.json`));
    assert(Boolean(taskJson.started_at), 'in-progress task card json should include started_at value');
    assert(Boolean(taskJson.started_by_agent), 'in-progress task card json should include started_by_agent value');
  } finally {
    cleanupRealProjectArtifacts(taskId);
  }
}

async function main() {
  testGuardReservationAndPromotion();
  testReserveNextAndRelease();
  await testTaskCardOpenerOpenCardsDoNotLeaveFormalLocks();
  await testTaskCardOpenerInProgressPromotion();
  resetTempRoot();
  console.log('task-id guard flow tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
