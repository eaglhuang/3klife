#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const tempRoot = path.join(projectRoot, 'temp', 'task-id-guard-flow');
const taskCardDir = path.join(tempRoot, 'docs', 'agent-briefs', 'tasks');
const lockDir = path.join(tempRoot, '.task-locks');
const taskCardOpenerCli = path.join(projectRoot, 'tools_node', 'task-card-opener.js');
const taskLockCli = path.join(projectRoot, 'tools_node', 'task-lock.js');

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

function runNode(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    shell: false,
    env: {
      ...process.env,
      AGENT_IDENTITY: 'task-id-flow-agent',
    },
  });
  if (result.status !== expectedStatus) {
    throw new Error([
      `node ${args.join(' ')} exited ${result.status}, expected ${expectedStatus}`,
      result.stdout.trim(),
      result.stderr.trim(),
    ].filter(Boolean).join('\n'));
  }
  return result;
}

function cleanupRealProjectArtifacts(taskId) {
  runNode([taskLockCli, 'unlock', taskId, 'task-id-flow-agent'], 0);
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

function testTaskCardOpenerPromotion() {
  const taskId = 'ATM-FLOW-9001';
  cleanupRealProjectArtifacts(taskId);
  try {
    runNode([
      taskCardOpenerCli,
      '--id',
      taskId,
      '--title',
      'Task id flow regression',
      '--owner',
      'task-id-flow-agent',
      '--md-out',
      `temp/${taskId}.md`,
      '--json-out',
      `temp/${taskId}.json`,
      '--write',
    ]);

    const lock = readJson(path.join(projectRoot, '.task-locks', `${taskId}.lock.json`));
    assert(lock.reservationOnly === undefined, 'task-card-opener should promote reservation to formal lock');
    assert(lock.files.includes(`temp/${taskId}.md`), 'promoted lock should include markdown output');
    assert(lock.files.includes(`temp/${taskId}.json`), 'promoted lock should include json output');
  } finally {
    cleanupRealProjectArtifacts(taskId);
  }
}

function main() {
  testGuardReservationAndPromotion();
  testReserveNextAndRelease();
  testTaskCardOpenerPromotion();
  resetTempRoot();
  console.log('task-id guard flow tests passed');
}

main();
