#!/usr/bin/env node
'use strict';

/**
 * file-ownership-checker.js — TASK-DGB-0007
 *
 * 白話：掃描所有 .task-locks/*.lock.json，
 * 找出有哪些檔案被「兩個以上任務同時宣告所有權」（衝突）。
 * 多個 Agent 並行工作時，這種衝突代表可能會互蓋對方的修改。
 *
 * Usage:
 *   node tools_node/file-ownership-checker.js
 *   node tools_node/file-ownership-checker.js --strict
 *   node tools_node/file-ownership-checker.js --json
 *   node tools_node/file-ownership-checker.js --help
 *
 * Exit codes:
 *   0  no conflicts (or warn without --strict)
 *   1  conflicts found, or warn with --strict
 */

const { LockAdapter } = require('./adapters/atm-3klife/lock-adapter');
const { createLockAdapterConfig } = require('./adapters/atm-3klife/lock-adapter-config');

// ─── arg parsing ─────────────────────────────────────────────────────────────

function printHelp() {
  console.log('Usage: node tools_node/file-ownership-checker.js [options]');
  console.log('');
  console.log('Scans all active task locks and reports files claimed by more than one task.');
  console.log('');
  console.log('Options:');
  console.log('  --strict    Exit 1 on any conflict (default: exit 1 anyway, but shows details)');
  console.log('  --json      Print JSON result to stdout');
  console.log('  --help, -h  Show this help');
}

function parseArgs(argv) {
  const parsed = { strict: false, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === '--strict') { parsed.strict = true; }
    else if (tok === '--json') { parsed.json = true; }
    else if (tok === '--help' || tok === '-h') { parsed.help = true; }
  }
  return parsed;
}

// ─── core logic ──────────────────────────────────────────────────────────────

function checkOwnership() {
  const adapter = new LockAdapter(createLockAdapterConfig());
  const allLocks = adapter.readAllLocks().filter((l) => !l.reservationOnly);

  // file → [{taskId, agentName, lockedAt}]
  const fileOwners = new Map();

  for (const lock of allLocks) {
    for (const f of lock.files) {
      if (!fileOwners.has(f)) fileOwners.set(f, []);
      fileOwners.get(f).push({
        taskId: lock.taskId,
        agentName: lock.agentName,
        lockedAt: lock.lockedAt,
      });
    }
  }

  const conflicts = [];
  for (const [file, owners] of fileOwners.entries()) {
    if (owners.length > 1) {
      conflicts.push({ file, owners });
    }
  }

  // Locks that have declared files (constrainted)
  const constrainedLocks = allLocks.filter((l) => l.files.length > 0);
  const unconstrainedLocks = allLocks.filter((l) => l.files.length === 0 && !l.reservationOnly);

  return {
    checkedLocks: allLocks.length,
    constrainedLocks: constrainedLocks.length,
    unconstrainedLocks: unconstrainedLocks.map((l) => l.taskId),
    totalFiles: fileOwners.size,
    conflictCount: conflicts.length,
    conflicts,
  };
}

function run(argv) {
  const args = parseArgs(argv);

  if (args.help) { printHelp(); return 0; }

  const report = checkOwnership();
  const hasConflicts = report.conflictCount > 0;
  const status = hasConflicts ? 'fail' : 'pass';

  if (args.json) {
    console.log(JSON.stringify({ status, ...report }, null, 2));
  } else {
    if (!hasConflicts) {
      console.log(`✅ PASS: No file ownership conflicts across ${report.checkedLocks} lock(s), ${report.totalFiles} declared file(s).`);
    } else {
      console.log(`❌ FAIL: ${report.conflictCount} file(s) claimed by multiple task locks:`);
      console.log('');
      for (const { file, owners } of report.conflicts) {
        console.log(`  📄 ${file}`);
        for (const o of owners) {
          console.log(`       ↳ ${o.taskId} (${o.agentName}, locked ${o.lockedAt})`);
        }
      }
      console.log('');
      console.log('Resolution: unlock one of the competing tasks, or remove the file from its --files list.');
    }

    if (report.unconstrainedLocks.length > 0) {
      console.log('');
      console.log(`⚠️  ${report.unconstrainedLocks.length} lock(s) have no declared files (unconstrained — cannot check for overlap):`);
      report.unconstrainedLocks.forEach((id) => console.log(`  - ${id}`));
    }
  }

  return hasConflicts ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = { run, checkOwnership };
