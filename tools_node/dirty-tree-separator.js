#!/usr/bin/env node
'use strict';

/**
 * dirty-tree-separator.js — TASK-DGB-0007
 *
 * 白話：現在 working tree 有一堆髒檔，
 * 這個工具幫你把它們分三桶：
 *   1. owned-by-task   — 屬於 --task 指定任務的檔案（可以安心 git add）
 *   2. owned-by-other  — 屬於其他任務的檔案（不要亂動）
 *   3. unowned         — 沒有任何任務宣告所有權（需要人工判斷）
 *
 * 不加 --task 時，只按「有沒有鎖」分兩桶：owned / unowned。
 *
 * Usage:
 *   node tools_node/dirty-tree-separator.js
 *   node tools_node/dirty-tree-separator.js --task <task-id>
 *   node tools_node/dirty-tree-separator.js --task <task-id> --json
 *   node tools_node/dirty-tree-separator.js --help
 *
 * Exit codes:
 *   0  always (this is a reporting tool)
 */

const cp = require('child_process');
const config = require('./lib/project-config');
const { LockAdapter } = require('./adapters/atm-3klife/lock-adapter');
const { createLockAdapterConfig } = require('./adapters/atm-3klife/lock-adapter-config');

const ROOT = config.ROOT;

// ─── helpers ─────────────────────────────────────────────────────────────────

function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

function getDirtyFiles() {
  try {
    const out = cp.execSync('git status --short', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const xy = line.slice(0, 2);
        const filePath = toPosix(line.slice(3).trim().replace(/^"(.*)"$/, '$1'));
        return { status: xy.trim(), path: filePath };
      });
  } catch {
    return [];
  }
}

// ─── arg parsing ─────────────────────────────────────────────────────────────

function printHelp() {
  console.log('Usage: node tools_node/dirty-tree-separator.js [options]');
  console.log('');
  console.log('Separates working tree dirty files into ownership buckets.');
  console.log('');
  console.log('Options:');
  console.log('  --task <id>   Current task ID (to label its files as "owned-by-task")');
  console.log('  --json        Print JSON result to stdout');
  console.log('  --help, -h    Show this help');
}

function parseArgs(argv) {
  const parsed = { task: '', json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === '--task') { parsed.task = argv[i + 1] || ''; i += 1; }
    else if (tok === '--json') { parsed.json = true; }
    else if (tok === '--help' || tok === '-h') { parsed.help = true; }
  }
  return parsed;
}

// ─── core logic ──────────────────────────────────────────────────────────────

function separate(taskId) {
  const adapter = new LockAdapter(createLockAdapterConfig());
  const allLocks = adapter.readAllLocks().filter((l) => !l.reservationOnly);

  // file → [taskId]
  const fileToTasks = new Map();
  for (const lock of allLocks) {
    for (const f of lock.files) {
      if (!fileToTasks.has(f)) fileToTasks.set(f, []);
      fileToTasks.get(f).push(lock.taskId);
    }
  }

  const dirty = getDirtyFiles();
  const ownedByTask = [];
  const ownedByOther = [];
  const unowned = [];

  for (const entry of dirty) {
    const owners = fileToTasks.get(entry.path) || [];
    if (owners.length === 0) {
      unowned.push(entry);
    } else if (taskId && owners.includes(taskId)) {
      ownedByTask.push({ ...entry, owners });
    } else {
      ownedByOther.push({ ...entry, owners });
    }
  }

  return { taskId: taskId || null, ownedByTask, ownedByOther, unowned };
}

function run(argv) {
  const args = parseArgs(argv);

  if (args.help) { printHelp(); return 0; }

  const result = separate(args.task);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  // Human-readable output
  if (args.task) {
    console.log(`📦 Dirty tree separation for task: ${args.task}`);
  } else {
    console.log('📦 Dirty tree separation (no --task specified)');
  }
  console.log('');

  if (result.ownedByTask.length > 0) {
    console.log(`✅ Owned by ${args.task} (${result.ownedByTask.length} file(s)) — safe to git add:`);
    result.ownedByTask.forEach((f) => console.log(`   ${f.status}  ${f.path}`));
    console.log('');
  }

  if (result.ownedByOther.length > 0) {
    console.log(`⚠️  Owned by OTHER task(s) (${result.ownedByOther.length} file(s)) — do NOT git add without coordination:`);
    result.ownedByOther.forEach((f) => console.log(`   ${f.status}  ${f.path}  ← ${f.owners.join(', ')}`));
    console.log('');
  }

  if (result.unowned.length > 0) {
    console.log(`❓ Unowned (${result.unowned.length} file(s)) — no task lock declared these:`);
    result.unowned.forEach((f) => console.log(`   ${f.status}  ${f.path}`));
    console.log('');
  }

  const total = result.ownedByTask.length + result.ownedByOther.length + result.unowned.length;
  if (total === 0) {
    console.log('✅ Working tree is clean — nothing to separate.');
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = { run, separate };
