#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const guard = require('../lib/doc-id-allocation-guard');

const policy = { ...guard.DEFAULT_POLICY, fetchRemote: null, fetchBranch: null };

function git(root, ...args) {
  const result = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function writeDoc(root, rel, id) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), `<!-- doc_id: ${id} -->\n# ${rel}\n`, 'utf8');
}

function writeRegistry(root, entries) {
  const dir = path.join(root, policy.shardDir);
  fs.mkdirSync(dir, { recursive: true });
  const shard = entries.map(([id, p]) => ({ id, path: p, title: p, category: 'task' }));
  fs.writeFileSync(path.join(dir, 'registry-task.json'), `${JSON.stringify(shard, null, 2)}\n`, 'utf8');
}

function commitAll(root, message) {
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', message);
}

function setupRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-id-guard-'));
  git(root, 'init', '-q', '-b', 'master');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'config', 'user.name', 'doc-id-test');
  // Legacy duplicate already on master: must not be reported.
  writeDoc(root, 'docs/a.md', 'doc_task_0001');
  writeDoc(root, 'docs/a-copy.md', 'doc_task_0001');
  writeRegistry(root, [['doc_task_0001', 'docs/a.md']]);
  commitAll(root, 'base');
  git(root, 'update-ref', 'refs/remotes/origin/master', 'HEAD');
  return root;
}

function testBranchCollisionAgainstAdvancedMaster() {
  const root = setupRepo();
  try {
    git(root, 'checkout', '-q', '-b', 'agent-a');
    writeDoc(root, 'docs/b.md', 'doc_task_0002');
    writeRegistry(root, [['doc_task_0001', 'docs/a.md'], ['doc_task_0002', 'docs/b.md']]);
    commitAll(root, 'agent a takes 0002');

    git(root, 'checkout', '-q', 'master');
    writeDoc(root, 'docs/c.md', 'doc_task_0002');
    writeRegistry(root, [['doc_task_0001', 'docs/a.md'], ['doc_task_0002', 'docs/c.md']]);
    commitAll(root, 'agent b lands 0002 first');
    git(root, 'update-ref', 'refs/remotes/origin/master', 'HEAD');

    git(root, 'checkout', '-q', 'agent-a');
    const report = guard.checkCollisions(root, 'origin/master', policy);
    assert.equal(report.ok, false, 'stale branch reusing a landed id must fail');
    assert.ok(report.errors.some((message) => message.includes('doc_task_0002')), report.errors.join('\n'));
    assert.deepEqual(report.suggestions, ['doc_task_0003']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testMergedTreeKeepsBothEntries() {
  const root = setupRepo();
  try {
    writeDoc(root, 'docs/c.md', 'doc_task_0002');
    writeRegistry(root, [['doc_task_0001', 'docs/a.md'], ['doc_task_0002', 'docs/c.md']]);
    commitAll(root, 'master has 0002');
    git(root, 'update-ref', 'refs/remotes/origin/master', 'HEAD');

    // Conflict resolved by keeping both blocks: duplicate id in the raw shard.
    writeDoc(root, 'docs/b.md', 'doc_task_0002');
    writeRegistry(root, [['doc_task_0001', 'docs/a.md'], ['doc_task_0002', 'docs/c.md'], ['doc_task_0002', 'docs/b.md']]);
    const report = guard.checkCollisions(root, 'origin/master', policy);
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((message) => message.includes('appears twice')), report.errors.join('\n'));
    assert.ok(report.errors.some((message) => message.includes('docs/b.md')), report.errors.join('\n'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testCleanChangeAndLegacyDuplicatesPass() {
  const root = setupRepo();
  try {
    writeDoc(root, 'docs/d.md', 'doc_task_0002');
    writeRegistry(root, [['doc_task_0001', 'docs/a.md'], ['doc_task_0002', 'docs/d.md']]);
    const report = guard.checkCollisions(root, 'origin/master', policy);
    assert.equal(report.ok, true, report.errors.join('\n'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testMirrorCopiesAreNotCollisions() {
  const root = setupRepo();
  try {
    writeDoc(root, '.agents/skills/demo/SKILL.md', 'doc_agentskill_0001');
    writeDoc(root, '.claude/skills/demo/SKILL.md', 'doc_agentskill_0001');
    const report = guard.checkCollisions(root, 'origin/master', policy);
    assert.equal(report.ok, true, report.errors.join('\n'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testAllocationFloorUsesBaseAndReservations() {
  const root = setupRepo();
  try {
    git(root, 'checkout', '-q', '-b', 'agent-a');
    git(root, 'checkout', '-q', 'master');
    writeDoc(root, 'docs/c.md', 'doc_task_0002');
    writeRegistry(root, [['doc_task_0001', 'docs/a.md'], ['doc_task_0002', 'docs/c.md']]);
    commitAll(root, 'master moves ahead');
    git(root, 'update-ref', 'refs/remotes/origin/master', 'HEAD');
    git(root, 'checkout', '-q', 'agent-a');

    const now = Date.parse('2026-11-22T00:00:00Z');
    let floor = guard.computeAllocationFloor(root, policy, { skipFetch: true, now });
    assert.equal(floor.baseRef, 'origin/master');
    assert.ok(floor.ids.has('doc_task_0002'), 'stale branch must see the id landed on origin/master');

    guard.reserveDocId(root, { id: 'doc_task_0003', path: 'docs/e.md', actor: 'agent-a' }, policy, { now });
    floor = guard.computeAllocationFloor(root, policy, { skipFetch: true, now });
    assert.ok(floor.ids.has('doc_task_0003'), 'reservation from another worktree must be honored');

    const later = now + (policy.reservationTtlHours + 1) * 3600 * 1000;
    floor = guard.computeAllocationFloor(root, policy, { skipFetch: true, now: later });
    assert.ok(!floor.ids.has('doc_task_0003'), 'expired reservation must be pruned');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// PROG-2-10001: a task card that writes its own doc_id (e.g. copying the task
// number) instead of taking one from the registry must fail; a registered id
// passes, and the suggestion ignores hand-written outliers.
function testHandWrittenTaskCardDocIdFails() {
  const root = setupRepo();
  try {
    const card = 'docs/agent-briefs/tasks/PROG/PROG-2-9998.md';
    writeDoc(root, card, 'doc_task_9998');
    let report = guard.checkCollisions(root, 'origin/master', policy);
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((message) => message.includes('registry does not assign it')), report.errors.join('\n'));
    assert.deepEqual(report.suggestions, ['doc_task_0002'], 'outlier must not drive the suggestion');

    // Five-digit ids copied from task numbers >= 10000 must be reported in full.
    const wide = 'docs/agent-briefs/tasks/PROG/PROG-2-10005.md';
    writeDoc(root, wide, 'doc_task_10005');
    report = guard.checkCollisions(root, 'origin/master', policy);
    assert.ok(report.errors.some((message) => message.startsWith('doc_task_10005 is written in')), report.errors.join('\n'));
    assert.ok(!report.errors.some((message) => message.startsWith('doc_task_1000 ')), report.errors.join('\n'));
    fs.rmSync(path.join(root, wide));

    writeDoc(root, card, 'doc_task_0002');
    writeRegistry(root, [['doc_task_0001', 'docs/a.md'], ['doc_task_0002', card]]);
    report = guard.checkCollisions(root, 'origin/master', policy);
    assert.equal(report.ok, true, report.errors.join('\n'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

testBranchCollisionAgainstAdvancedMaster();
testMergedTreeKeepsBothEntries();
testCleanChangeAndLegacyDuplicatesPass();
testMirrorCopiesAreNotCollisions();
testAllocationFloorUsesBaseAndReservations();
testHandWrittenTaskCardDocIdFails();
console.log('[doc-id-allocation-guard.test] ok');
