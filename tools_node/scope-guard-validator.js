#!/usr/bin/env node
'use strict';

/**
 * scope-guard-validator.js — TASK-DGB-0007
 *
 * 白話：你上鎖的任務卡有宣告「我這次會改哪些檔」。
 * 這個工具用 git status 抓出現在 working tree 的髒檔，
 * 然後比對——如果有髒檔不在宣告清單裡，就警告或報錯。
 *
 * Usage:
 *   node tools_node/scope-guard-validator.js --task <task-id>
 *   node tools_node/scope-guard-validator.js --task <task-id> --strict
 *   node tools_node/scope-guard-validator.js --task <task-id> --json
 *   node tools_node/scope-guard-validator.js --help
 *
 * Exit codes:
 *   0  pass / warn (unless --strict)
 *   1  fail, or warn when --strict
 */

const _fs = require('fs');
const _path = require('path');
const cp = require('child_process');

const config = require('./lib/project-config');
const { LockAdapter } = require('./adapters/atm-3klife/lock-adapter');
const { createLockAdapterConfig } = require('./adapters/atm-3klife/lock-adapter-config');

const ROOT = config.ROOT;

// ─── helpers ─────────────────────────────────────────────────────────────────

function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

/** Get dirty working tree files from git status --short */
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
      .map((line) => toPosix(line.slice(3).trim().replace(/^"(.*)"$/, '$1')));
  } catch {
    return [];
  }
}

// ─── arg parsing ─────────────────────────────────────────────────────────────

function printHelp() {
  console.log('Usage: node tools_node/scope-guard-validator.js --task <task-id> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --task <id>    Task ID whose lock scope to validate against (required)');
  console.log('  --strict       Exit 1 on warn as well as fail');
  console.log('  --json         Print JSON result to stdout');
  console.log('  --help, -h     Show this help');
}

function parseArgs(argv) {
  const parsed = { task: '', strict: false, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === '--task') { parsed.task = argv[i + 1] || ''; i += 1; }
    else if (tok === '--strict') { parsed.strict = true; }
    else if (tok === '--json') { parsed.json = true; }
    else if (tok === '--help' || tok === '-h') { parsed.help = true; }
  }
  return parsed;
}

// ─── core logic ──────────────────────────────────────────────────────────────

function run(argv) {
  const args = parseArgs(argv);

  if (args.help) { printHelp(); return 0; }

  if (!args.task) {
    console.error('Error: --task <task-id> is required');
    printHelp();
    return 1;
  }

  const adapter = new LockAdapter(createLockAdapterConfig());
  const allLocks = adapter.readAllLocks();
  const lock = allLocks.find((l) => l.taskId === args.task);

  if (!lock) {
    const result = {
      status: 'fail',
      task: args.task,
      reason: `No active lock found for task '${args.task}'. Run: node tools_node/task-lock.js lock ${args.task} <agent>`,
      outOfScope: [],
      inScope: [],
      unconstrained: false,
    };
    if (args.json) { console.log(JSON.stringify(result, null, 2)); }
    else { console.error(`❌ FAIL: ${result.reason}`); }
    return 1;
  }

  const dirtyFiles = getDirtyFiles();
  const scopeSet = new Set(lock.files.map(toPosix));
  const unconstrained = lock.files.length === 0;

  const inScope = [];
  const outOfScope = [];

  for (const f of dirtyFiles) {
    if (unconstrained || scopeSet.has(f)) {
      inScope.push(f);
    } else {
      outOfScope.push(f);
    }
  }

  let status;
  if (unconstrained) {
    status = 'warn'; // 鎖沒有宣告 files → 無法驗證，警告
  } else if (outOfScope.length > 0) {
    status = 'fail';
  } else {
    status = 'pass';
  }

  const result = {
    status,
    task: args.task,
    agentName: lock.agentName,
    lockedAt: lock.lockedAt,
    scopeFiles: lock.files,
    dirtyFiles,
    inScope,
    outOfScope,
    unconstrained,
    reason: unconstrained
      ? `Lock for '${args.task}' has no declared files (unconstrained scope). Add --files when locking to enable strict scope checks.`
      : outOfScope.length > 0
        ? `${outOfScope.length} dirty file(s) outside declared scope`
        : `All ${inScope.length} dirty file(s) are within declared scope`,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️ ' : '❌';
    console.log(`${icon} ${status.toUpperCase()}: ${result.reason}`);
    if (outOfScope.length > 0) {
      console.log('');
      console.log('Out-of-scope dirty files:');
      outOfScope.forEach((f) => console.log(`  - ${f}`));
      console.log('');
      console.log('Add these to the lock with:');
      console.log(`  node tools_node/task-lock.js lock ${args.task} <agent> --files ${outOfScope.join(' ')}`);
    }
  }

  if (status === 'fail') return 1;
  if (status === 'warn' && args.strict) return 1;
  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = { run, getDirtyFiles };
