#!/usr/bin/env node
'use strict';

/**
 * turn-report-generator.js — TASK-DGB-0008
 *
 * 白話：每次 Agent 做完一段工作要交班時，
 * 執行這個工具，它會自動：
 *   1. 從 git status 取得本輪改了哪些檔
 *   2. 從 task lock 取得 agentName 和宣告範圍
 *   3. 把你提供的 summary / risks / evidence 組合成一份 JSON
 *   4. 這份 JSON 符合 handoff-schema.json 的格式，可存檔或傳給接手 Agent
 *
 * Usage:
 *   node tools_node/turn-report-generator.js \
 *     --task TASK-DGB-0007 \
 *     --summary "實作 scope-guard-validator, file-ownership-checker, dirty-tree-separator" \
 *     --risks "部分 lock 無 files 宣告，scope 驗證會回 warn" \
 *     --evidence "node-syntax-check:pass" \
 *     --evidence "encoding-check:pass" \
 *     [--out artifacts/handoff-TASK-DGB-0007.json]
 *
 * evidence 格式: "<type>:<outcome>[:<detail>]"
 *   例如: "unit-test:pass:47 tests" / "compute-gate:fail:2 errors"
 *
 * Exit codes: 0 = success, 1 = error
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const config = require('./lib/project-config');
const { LockAdapter } = require('./adapters/atm-3klife/lock-adapter');
const { createLockAdapterConfig } = require('./adapters/atm-3klife/lock-adapter-config');

const ROOT = config.ROOT;
const SCHEMA_VERSION = 'handoff-record/v1';
const KIND = 'handoff-record';

// ─── helpers ─────────────────────────────────────────────────────────────────

function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

function getChangedFiles() {
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

function getDefaultAgentName() {
  try {
    const { deriveAgentIdentity } = require('./lib/agent-identity');
    const identity = deriveAgentIdentity({ write: false });
    return identity.agentName || 'unknown-agent';
  } catch {
    return process.env.AGENT_NAME || 'unknown-agent';
  }
}

/**
 * Parse "--evidence type:outcome[:detail]" string into an evidence object.
 */
function parseEvidence(raw) {
  const parts = String(raw || '').split(':');
  const type = parts[0] || 'unknown';
  const outcomeRaw = (parts[1] || 'skip').toLowerCase();
  const validOutcomes = ['pass', 'warn', 'fail', 'skip'];
  const outcome = validOutcomes.includes(outcomeRaw) ? outcomeRaw : 'skip';
  const detail = parts.slice(2).join(':') || '';
  return detail ? { type, outcome, detail } : { type, outcome };
}

// ─── arg parsing ─────────────────────────────────────────────────────────────

function printHelp() {
  console.log('Usage: node tools_node/turn-report-generator.js [options]');
  console.log('');
  console.log('Generates a handoff-record/v1 JSON for cross-agent handoff.');
  console.log('');
  console.log('Options:');
  console.log('  --task <id>          Work item ID (required)');
  console.log('  --summary <text>     Human-readable summary of this turn (required)');
  console.log('  --risks <text>       Remaining risk description (repeatable)');
  console.log('  --evidence <spec>    Validation evidence: type:outcome[:detail] (repeatable)');
  console.log('                       Outcomes: pass | warn | fail | skip');
  console.log('  --hint <text>        Continuation hint for the next agent (repeatable)');
  console.log('  --files <path...>    Explicit files to report (default: git status --short)');
  console.log('  --agent <name>       Override agent name (default: from identity)');
  console.log('  --out <path>         Write JSON to file (default: print to stdout)');
  console.log('  --help, -h           Show this help');
  console.log('');
  console.log('Examples:');
  console.log('  node tools_node/turn-report-generator.js \\');
  console.log('    --task TASK-DGB-0007 \\');
  console.log('    --summary "Implemented scope-guard tools" \\');
  console.log('    --evidence "node-syntax-check:pass" \\');
  console.log('    --risks "Locks without --files cannot be scope-checked" \\');
  console.log('    --out artifacts/handoff-TASK-DGB-0007.json');
}

function parseArgs(argv) {
  const parsed = {
    task: '',
    summary: '',
    risks: [],
    evidence: [],
    hints: [],
    files: [],
    agent: '',
    out: '',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok === '--task') { parsed.task = argv[i + 1] || ''; i += 1; }
    else if (tok === '--summary') { parsed.summary = argv[i + 1] || ''; i += 1; }
    else if (tok === '--risks' || tok === '--risk') { parsed.risks.push(argv[i + 1] || ''); i += 1; }
    else if (tok === '--evidence') { parsed.evidence.push(argv[i + 1] || ''); i += 1; }
    else if (tok === '--hint') { parsed.hints.push(argv[i + 1] || ''); i += 1; }
    else if (tok === '--agent') { parsed.agent = argv[i + 1] || ''; i += 1; }
    else if (tok === '--out') { parsed.out = argv[i + 1] || ''; i += 1; }
    else if (tok === '--files') {
      // collect all following non-flag tokens as files
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        i += 1;
        parsed.files.push(argv[i]);
      }
    }
    else if (tok === '--help' || tok === '-h') { parsed.help = true; }
  }

  return parsed;
}

// ─── core logic ──────────────────────────────────────────────────────────────

function generate(args) {
  const agentName = args.agent || getDefaultAgentName();
  const changedFiles = args.files.length > 0
    ? args.files.map(toPosix)
    : getChangedFiles();

  // Try to get task lock snapshot
  let taskLockSnapshot = null;
  if (args.task) {
    try {
      const adapter = new LockAdapter(createLockAdapterConfig());
      const allLocks = adapter.readAllLocks();
      const lock = allLocks.find((l) => l.taskId === args.task);
      if (lock) {
        taskLockSnapshot = {
          taskId: lock.taskId,
          agentName: lock.agentName,
          lockedAt: lock.lockedAt,
          files: lock.files,
        };
      }
    } catch {
      // lock read failure is non-fatal
    }
  }

  const validationEvidence = args.evidence.map(parseEvidence);
  const remainingRisks = args.risks.filter((r) => r.trim().length > 0);
  const continuationHints = args.hints.filter((h) => h.trim().length > 0);

  /** @type {import('./schemas/handoff-schema.json')} */
  const record = {
    schemaVersion: SCHEMA_VERSION,
    kind: KIND,
    generatedAt: new Date().toISOString(),
    workItemId: args.task || 'unknown',
    agentName,
    summary: args.summary || '(no summary provided)',
    changedFiles,
    validationEvidence,
    remainingRisks,
  };

  if (continuationHints.length > 0) {
    record.continuationHints = continuationHints;
  }
  if (taskLockSnapshot) {
    record.taskLockSnapshot = taskLockSnapshot;
  }

  return record;
}

function run(argv) {
  const args = parseArgs(argv);

  if (args.help) { printHelp(); return 0; }

  if (!args.task) {
    console.error('Error: --task <task-id> is required');
    printHelp();
    return 1;
  }

  if (!args.summary) {
    console.error('Error: --summary <text> is required');
    printHelp();
    return 1;
  }

  const record = generate(args);
  const json = JSON.stringify(record, null, 2);

  if (args.out) {
    const outAbs = path.isAbsolute(args.out) ? args.out : path.join(ROOT, args.out);
    const dir = path.dirname(outAbs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outAbs, json + '\n', 'utf8');
    const rel = toPosix(path.relative(ROOT, outAbs));
    console.log(`✅ Handoff record written: ${rel}`);
    console.log(`   workItemId:  ${record.workItemId}`);
    console.log(`   agentName:   ${record.agentName}`);
    console.log(`   changedFiles: ${record.changedFiles.length}`);
    console.log(`   evidence:    ${record.validationEvidence.length} item(s)`);
    console.log(`   risks:       ${record.remainingRisks.length}`);
  } else {
    console.log(json);
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}

module.exports = { run, generate, parseEvidence };
