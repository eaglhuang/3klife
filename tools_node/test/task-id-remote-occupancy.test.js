#!/usr/bin/env node
'use strict';

/**
 * Cross-worktree / cross-branch / cross-PR task id reservation (PROG-2-9990).
 * Builds a throwaway git repo with a second worktree so the shared ledger in
 * the git common dir, base-ref occupancy, unmerged-branch commit messages and
 * pull-request occupancy can be exercised without touching the real clone.
 */

const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.TASK_ID_SKIP_FETCH = '1';
process.env.TASK_ID_SKIP_GH = '1';
delete process.env.TASK_ID_REMOTE_CHECK;

const guard = require('../lib/task-id-guard');
const occupancy = require('../lib/task-id-remote-occupancy');

const PREFIX = 'PROG-9';

function git(root, ...args) {
  const result = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function writeCard(root, taskId) {
  const dir = path.join(root, 'docs', 'agent-briefs', 'tasks', 'PROG');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${taskId}.md`), `---\nid: ${taskId}\n---\n# ${taskId}\n`, 'utf8');
}

function setupRepo() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'task-id-occupancy-')));
  const root = path.join(base, 'main');
  fs.mkdirSync(root);
  git(root, 'init', '-q', '-b', 'master');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'config', 'user.name', 'task-id-test');
  fs.writeFileSync(path.join(root, '.gitignore'), '.task-locks/\n', 'utf8');
  writeCard(root, `${PREFIX}-0001`);
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'base');
  git(root, 'update-ref', 'refs/remotes/origin/master', 'HEAD');
  return { base, root };
}

function cleanup(base) {
  occupancy.invalidateOccupancyCache();
  fs.rmSync(base, { recursive: true, force: true });
}

function withRepo(fn) {
  const repo = setupRepo();
  occupancy.invalidateOccupancyCache();
  try {
    fn(repo);
  } finally {
    cleanup(repo.base);
  }
}

function testBaseRefCardsInvisibleLocallyAreOccupied() {
  withRepo(({ root }) => {
    // origin/master advanced with 0002 and 0003, local checkout is stale.
    git(root, 'checkout', '-q', '-b', 'stale');
    git(root, 'checkout', '-q', 'master');
    writeCard(root, `${PREFIX}-0002`);
    writeCard(root, `${PREFIX}-0003`);
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'other agents landed 0002 0003');
    git(root, 'update-ref', 'refs/remotes/origin/master', 'HEAD');
    git(root, 'checkout', '-q', 'stale');

    assert.equal(guard.previewNextTaskId(root, PREFIX), `${PREFIX}-0004`);
    const inspection = guard.inspectTaskId(root, `${PREFIX}-0002`);
    assert.equal(inspection.occupied, true);
    assert.ok(inspection.remoteSources.some((source) => source.kind === 'base-ref'));
  });
}

function testUnmergedBranchCommitMessageIsOccupied() {
  withRepo(({ root }) => {
    git(root, 'checkout', '-q', '-b', 'agent-b');
    fs.writeFileSync(path.join(root, 'note.txt'), 'wip\n', 'utf8');
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', `feat: open ${PREFIX}-0007 for battle work`);
    git(root, 'update-ref', 'refs/remotes/origin/agent-b', 'HEAD');
    git(root, 'checkout', '-q', 'master');
    git(root, 'branch', '-q', '-D', 'agent-b');

    assert.equal(guard.previewNextTaskId(root, PREFIX), `${PREFIX}-0008`);
    const inspection = guard.inspectTaskId(root, `${PREFIX}-0007`);
    assert.ok(inspection.remoteSources.some((source) => source.kind === 'unmerged-commit'), JSON.stringify(inspection));
  });
}

function testPullRequestOccupancy() {
  withRepo(({ root }) => {
    const ghRunner = (_root, args) => {
      assert.ok(args.includes('--search') && args.includes(PREFIX), args.join(' '));
      return JSON.stringify([{ number: 42, title: `[${PREFIX}-0011] draft`, headRefName: 'x', body: '', state: 'OPEN' }]);
    };
    const preview = guard.previewNextTaskId(root, PREFIX, { ghRunner, noCache: true });
    assert.equal(preview, `${PREFIX}-0012`);
    const inspection = guard.inspectTaskId(root, `${PREFIX}-0011`, { ghRunner, noCache: true });
    assert.ok(inspection.remoteSources.some((source) => source.detail.includes('PR #42')));

    const broken = () => { throw new Error('gh: not logged in'); };
    const degraded = guard.inspectTaskId(root, `${PREFIX}-0011`, { ghRunner: broken, noCache: true });
    assert.equal(degraded.occupied, false);
    assert.ok(degraded.warnings.some((warning) => warning.includes('pull-request occupancy skipped')));
  });
}

function testSharedLedgerAcrossWorktreesAndSameAgent() {
  withRepo(({ base, root }) => {
    const second = path.join(base, 'second');
    git(root, 'worktree', 'add', '-q', '-b', 'second', second);

    const first = guard.reserveNextTaskId(root, PREFIX, 'ClaudeCode');
    assert.equal(first.taskId, `${PREFIX}-0002`);

    // Same agent name in another worktree must not reuse the same id.
    const other = guard.reserveNextTaskId(second, PREFIX, 'ClaudeCode');
    assert.equal(other.taskId, `${PREFIX}-0003`);

    const inspection = guard.inspectTaskId(second, `${PREFIX}-0002`);
    assert.equal(inspection.occupied, true);
    assert.ok(inspection.locks.some((entry) => entry.shared), JSON.stringify(inspection.locks));

    // Open-status cards release the worktree lock but keep the shared claim.
    guard.releaseReservedTaskId(root, first.taskId, 'ClaudeCode');
    assert.equal(guard.previewNextTaskId(second, PREFIX), `${PREFIX}-0004`);

    // Failed creation drops the shared claim too.
    guard.releaseReservedTaskId(root, first.taskId, 'ClaudeCode', { dropShared: true });
    occupancy.invalidateOccupancyCache();
    assert.equal(guard.inspectTaskId(second, `${PREFIX}-0002`).occupied, false);
  });
}

function testExplicitCollisionReturnsNextFreeId() {
  withRepo(({ base, root }) => {
    const second = path.join(base, 'second');
    git(root, 'worktree', 'add', '-q', '-b', 'second', second);
    guard.reserveTaskId(root, `${PREFIX}-0005`, 'Antigravity');

    assert.throws(
      () => guard.reserveTaskId(second, `${PREFIX}-0005`, 'BattleExpert'),
      (error) => error.code === 'TASK_ID_COLLISION'
        && error.suggestedTaskId === `${PREFIX}-0006`
        && error.message.includes(`${PREFIX}-0006`),
    );

    const ticket = guard.reserveTaskIdOrNext(second, `${PREFIX}-0005`, 'BattleExpert');
    assert.equal(ticket.reassigned, true);
    assert.equal(ticket.requestedTaskId, `${PREFIX}-0005`);
    assert.equal(ticket.taskId, `${PREFIX}-0006`);

    const free = guard.reserveTaskIdOrNext(second, `${PREFIX}-0020`, 'BattleExpert');
    assert.equal(free.reassigned, false);
    assert.equal(free.taskId, `${PREFIX}-0020`);
  });
}

function testLedgerTtlAndLandedPrune() {
  withRepo(({ root }) => {
    const now = Date.parse('2026-11-25T00:00:00Z');
    occupancy.recordSharedReservation(root, { taskId: `${PREFIX}-0030`, agentName: 'A' }, undefined, { now });
    assert.equal(occupancy.listSharedReservations(root, undefined, { now }).length, 1);
    const later = now + (occupancy.DEFAULT_POLICY.reservationTtlHours + 1) * 3600 * 1000;
    assert.equal(occupancy.listSharedReservations(root, undefined, { now: later }).length, 0);

    occupancy.recordSharedReservation(root, { taskId: `${PREFIX}-0031`, agentName: 'A' }, undefined, { now });
    occupancy.recordSharedReservation(root, { taskId: `${PREFIX}-0032`, agentName: 'B' }, undefined, {
      now,
      landedIds: new Set([`${PREFIX}-0031`]),
    });
    const ids = occupancy.listSharedReservations(root, undefined, { now }).map((entry) => entry.taskId);
    assert.deepEqual(ids, [`${PREFIX}-0030`, `${PREFIX}-0032`], 'landed 0031 pruned; unexpired 0030 kept');
  });
}

function testNonToplevelRootSkipsRemoteChecks() {
  withRepo(({ root }) => {
    const nested = path.join(root, 'temp', 'nested');
    fs.mkdirSync(nested, { recursive: true });
    assert.equal(occupancy.remoteChecksEnabled(nested), false);
    assert.equal(guard.inspectTaskId(nested, `${PREFIX}-0001`).remoteChecked, false);
  });
}

testBaseRefCardsInvisibleLocallyAreOccupied();
testUnmergedBranchCommitMessageIsOccupied();
testPullRequestOccupancy();
testSharedLedgerAcrossWorktreesAndSameAgent();
testExplicitCollisionReturnsNextFreeId();
testLedgerTtlAndLandedPrune();
testNonToplevelRootSkipsRemoteChecks();
console.log('[task-id-remote-occupancy.test] ok');
