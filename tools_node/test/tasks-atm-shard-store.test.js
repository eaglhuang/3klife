#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  DEFAULT_MAX_PART_BYTES,
  readTasksAtmStore,
  upsertTaskInTasksAtmStore,
  writeTasksAtmStore,
} = require('../lib/tasks-atm-shard-store');
const {
  MILESTONE_PATH_REL,
} = require('../lib/atm-stabilization-milestone');

const projectRoot = path.resolve(__dirname, '..', '..');
const tempRoot = path.join(projectRoot, 'temp', 'tasks-atm-shard-store-test');
const indexPath = path.join(tempRoot, 'docs', 'tasks', 'tasks-atm.json');
const maxPartLines = 90;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resetTempRoot() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
}

function cleanupTempRoot() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function task(serial, extra = {}) {
  const id = `ATM-TEST-${String(serial).padStart(4, '0')}`;
  return {
    id,
    title: `Stable shard test ${serial}`,
    owner: 'test-agent',
    priority: 'P2',
    status: 'open',
    description: `Regression fixture for stable ATM shard assignment ${serial}.`,
    acceptance: [
      `Acceptance ${serial}.1`,
      `Acceptance ${serial}.2`,
      `Acceptance ${serial}.3`,
    ],
    deliverables: [
      `Deliverable ${serial}.1`,
      `Deliverable ${serial}.2`,
    ],
    notes: `2026-05-08 | 狀態: open | 驗證: fixture | 變更: stable shard baseline ${serial}`,
    ...extra,
  };
}

function writeAggregate(tasks) {
  fs.writeFileSync(indexPath, `${JSON.stringify({ tasks }, null, 2)}\n`, 'utf8');
}

function partChanges(result) {
  return result.changedFiles.filter((filePath) => /^docs\/tasks\/tasks-atm\/tasks-atm-part-\d+\.json$/.test(filePath));
}

function main() {
  resetTempRoot();

  const initialTasks = Array.from({ length: 9 }, (_, index) => task(index + 1));
  writeAggregate(initialTasks);

  const initial = writeTasksAtmStore(tempRoot, initialTasks, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines,
  });
  assert(initial.parts.length > 1, 'fixture should create more than one ATM part');
  assert(initial.parts.every((part) => part.metrics.lines <= maxPartLines), 'initial parts should stay within line threshold');

  const migration = writeTasksAtmStore(tempRoot, readTasksAtmStore(tempRoot).tasks, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines,
  });
  assert(
    migration.changedFiles.every((filePath) => filePath === 'docs/tasks/tasks-atm/.shardrc.json' || filePath === 'docs/tasks/tasks-atm.json'),
    `first stable migration should only refresh metadata, got ${migration.changedFiles.join(', ')}`,
  );

  const noOp = writeTasksAtmStore(tempRoot, readTasksAtmStore(tempRoot).tasks, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines,
  });
  assert(noOp.changedFiles.length === 0, `no-op rebuild should not rewrite files: ${noOp.changedFiles.join(', ')}`);

  const milestonePath = path.join(tempRoot, MILESTONE_PATH_REL);
  const milestoneSync = writeTasksAtmStore(tempRoot, readTasksAtmStore(tempRoot).tasks, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines,
    syncMilestone: true,
  });
  assert(fs.existsSync(milestonePath), 'syncMilestone should materialize the milestone file');
  assert(
    milestoneSync.changedFiles.includes(MILESTONE_PATH_REL),
    `syncMilestone should report milestone drift, got ${milestoneSync.changedFiles.join(', ')}`,
  );
  const milestoneNoOp = writeTasksAtmStore(tempRoot, readTasksAtmStore(tempRoot).tasks, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines,
    syncMilestone: true,
  });
  assert(milestoneNoOp.changedFiles.length === 0, `syncMilestone no-op should not rewrite files: ${milestoneNoOp.changedFiles.join(', ')}`);

  const addedTask = task(99);
  const added = upsertTaskInTasksAtmStore(tempRoot, addedTask, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines,
  });
  assert(partChanges(added).length === 1, `adding one task should change one part, got ${partChanges(added).join(', ')}`);
  assert(added.changedFiles.includes('docs/tasks/tasks-atm.json'), 'adding one task should refresh the thin index');
  assert(!added.changedFiles.includes('docs/tasks/tasks-atm/.shardrc.json'), 'adding into existing capacity should not rewrite .shardrc');
  assert(added.taskPartPaths[addedTask.id], 'new task should have a recorded part path');
  assert(added.upsertedTaskPartPath === added.taskPartPaths[addedTask.id], 'upsert should report the touched part path');
  assert(added.parts.every((part) => part.metrics.lines <= maxPartLines), 'added parts should stay within line threshold');

  const updated = upsertTaskInTasksAtmStore(tempRoot, {
    ...addedTask,
    notes: `${addedTask.notes}\n2026-05-08 | 狀態: open | 驗證: fixture | 變更: update one existing task`,
  }, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines,
  });
  assert(partChanges(updated).length === 1, `updating one task should change one part, got ${partChanges(updated).join(', ')}`);
  assert(!updated.changedFiles.includes('docs/tasks/tasks-atm/.shardrc.json'), 'updating one task should not rewrite .shardrc');

  cleanupTempRoot();
  console.log('tasks-atm shard store stable assignment tests passed');
}

main();
