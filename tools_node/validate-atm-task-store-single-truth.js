#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const {
  TASKS_ATM_INDEX_REL,
  TASKS_ATM_PARTS_DIR_REL,
} = require('./lib/tasks-atm-shard-store');
const {
  MILESTONE_PATH_REL,
} = require('./lib/atm-stabilization-milestone');
const {
  runTaskStoreTruthPipeline,
} = require('./sync-atm-stabilization-milestone');

const ROOT = path.resolve(__dirname, '..');
const PART_PATH_RE = /^docs\/tasks\/tasks-atm\/tasks-atm-part-\d+\.json$/;
const SHARD_RC_REL = `${TASKS_ATM_PARTS_DIR_REL}/.shardrc.json`;

function parseArgs(argv) {
  const parsed = {
    strict: false,
    staged: false,
    skipSyncCheck: false,
    report: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--staged') {
      parsed.staged = true;
      continue;
    }
    if (token === '--skip-sync-check') {
      parsed.skipSyncCheck = true;
      continue;
    }
    if (token === '--report') {
      parsed.report = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/validate-atm-task-store-single-truth.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --strict             Exit non-zero when blockers are found');
  console.log('  --staged             Check staged changes only');
  console.log('  --skip-sync-check    Skip sync-atm-stabilization-milestone dry-run check');
  console.log('  --report <json>      Write machine-readable report');
  console.log('  --help, -h           Show this help');
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function normalizeRelPath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^[./]+/, '');
}

function uniqueSorted(values) {
  return Array.from(new Set(values.map((item) => normalizeRelPath(item)).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, 'en', { sensitivity: 'base', numeric: true }),
  );
}

function runGitNameOnly(args) {
  try {
    const raw = execSync(`git ${args.join(' ')}`, {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return {
      files: String(raw || '')
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => normalizeRelPath(line)),
      error: null,
    };
  } catch (error) {
    const stderr = String(error && error.stderr ? error.stderr : '');
    return {
      files: [],
      error: `git ${args.join(' ')} failed: ${stderr.trim() || error.message || String(error)}`,
    };
  }
}

function listChangedPaths(options = {}) {
  const diagnostics = [];
  const staged = runGitNameOnly(['diff', '--name-only', '--cached']);
  if (staged.error) {
    diagnostics.push(staged.error);
  }
  if (options.staged) {
    return {
      paths: uniqueSorted(staged.files),
      diagnostics,
    };
  }
  const unstaged = runGitNameOnly(['diff', '--name-only']);
  if (unstaged.error) {
    diagnostics.push(unstaged.error);
  }
  const untracked = runGitNameOnly(['ls-files', '--others', '--exclude-standard']);
  if (untracked.error) {
    diagnostics.push(untracked.error);
  }
  return {
    paths: uniqueSorted([...staged.files, ...unstaged.files, ...untracked.files]),
    diagnostics,
  };
}

function buildFinding({
  ruleId,
  trigger,
  scope,
  severity,
  action,
  routeClass,
  routeHint,
  message,
  details,
}) {
  return {
    findingVersion: 'atm-task-store-single-truth-finding/v1',
    kind: 'atm-task-store-single-truth-finding',
    ruleId,
    trigger,
    scope,
    severity,
    action,
    routeClass,
    routeHint,
    message,
    file: '',
    line: 0,
    details: details || {},
  };
}

function classifyChangedPaths(changedPaths) {
  const partPaths = changedPaths.filter((filePath) => PART_PATH_RE.test(filePath));
  const indexChanged = changedPaths.includes(TASKS_ATM_INDEX_REL);
  const milestoneChanged = changedPaths.includes(MILESTONE_PATH_REL);
  const shardRcChanged = changedPaths.includes(SHARD_RC_REL);
  const derivedPaths = [];
  if (indexChanged) {
    derivedPaths.push(TASKS_ATM_INDEX_REL);
  }
  if (milestoneChanged) {
    derivedPaths.push(MILESTONE_PATH_REL);
  }

  return {
    partPaths,
    indexChanged,
    milestoneChanged,
    shardRcChanged,
    derivedPaths,
  };
}

function analyzeState(changedPaths, options = {}) {
  const classified = classifyChangedPaths(changedPaths);
  const findings = [];
  const gitScanDiagnostics = Array.isArray(options.gitScanDiagnostics) ? options.gitScanDiagnostics : [];

  if (gitScanDiagnostics.length > 0) {
    findings.push(buildFinding({
      ruleId: 'atm-task-store-single-truth.git-scan-unavailable',
      trigger: 'taskStoreSingleTruth.gitScanUnavailable',
      scope: 'git changed-files discovery',
      severity: 'warn',
      action: 'warn',
      routeClass: 'advisory',
      routeHint: '目前環境無法由 Node 子行程呼叫 git；可改用 shell 先收集 changed files 再餵入檢查流程。',
      message: 'git changed-files scan was unavailable in current runtime',
      details: { diagnostics: gitScanDiagnostics },
    }));
  }

  const derivedOnlyBypassDetected = classified.derivedPaths.length > 0 && classified.partPaths.length === 0;
  if (derivedOnlyBypassDetected) {
    findings.push(buildFinding({
      ruleId: 'atm-task-store-single-truth.derived-without-shard-source',
      trigger: 'taskStoreSingleTruth.derivedWithoutShardSource',
      scope: 'tasks-atm shards -> tasks-atm.json summary -> milestone pipeline',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: `禁止直接修改 ${TASKS_ATM_INDEX_REL} / ${MILESTONE_PATH_REL}；請改動 shard part 後執行 node tools_node/sync-atm-stabilization-milestone.js`,
      message: 'derived ATM tracking files changed without shard source changes',
      details: {
        derivedPaths: classified.derivedPaths,
        partPaths: classified.partPaths,
      },
    }));
  }

  const syncCheck = options.syncCheck && typeof options.syncCheck === 'object'
    ? options.syncCheck
    : null;
  if (!options.skipSyncCheck && syncCheck && !syncCheck.passed) {
      findings.push(buildFinding({
        ruleId: 'atm-task-store-single-truth.pipeline-drift',
        trigger: 'taskStoreSingleTruth.pipelineDrift',
        scope: 'sync-atm-stabilization-milestone --check --strict',
        severity: 'block',
        action: 'fail',
        routeClass: 'blocker',
        routeHint: '請先執行 node tools_node/sync-atm-stabilization-milestone.js 修正漂移，再重新驗證。',
        message: 'task-store truth pipeline is currently drifted',
        details: {
          changedFiles: Array.isArray(syncCheck.changedFiles) ? syncCheck.changedFiles : [],
          drift: syncCheck.drift || null,
        },
      }));
  }

  const blockerCount = findings.filter((item) => item.severity === 'block' || item.action === 'fail').length;
  const warningCount = findings.filter((item) => item.severity === 'warn').length;
  const passed = blockerCount === 0;

  return {
    mode: options.staged ? 'staged' : 'working-tree',
    passed,
    blockerCount,
    warningCount,
    checks: [
      {
        id: 'derived-files-must-have-shard-source',
        passed: !derivedOnlyBypassDetected,
        status: derivedOnlyBypassDetected ? 1 : 0,
        stderr: derivedOnlyBypassDetected ? 'derived files changed without shard part source' : '',
      },
      {
        id: 'sync-task-store-truth-pipeline',
        passed: options.skipSyncCheck ? true : Boolean(syncCheck && syncCheck.passed),
        status: options.skipSyncCheck ? 0 : (syncCheck && syncCheck.passed ? 0 : 1),
        stderr: options.skipSyncCheck ? '' : (syncCheck && syncCheck.passed ? '' : 'sync-atm-stabilization-milestone reported drift'),
      },
    ],
    summary: {
      changedFilesCount: changedPaths.length,
      partFileChangeCount: classified.partPaths.length,
      indexChanged: classified.indexChanged,
      milestoneChanged: classified.milestoneChanged,
      shardRcChanged: classified.shardRcChanged,
      derivedOnlyBypassDetected,
      gitScanErrorCount: gitScanDiagnostics.length,
      syncDriftDetected: options.skipSyncCheck ? false : !Boolean(syncCheck && syncCheck.passed),
    },
    changedPaths: Array.isArray(changedPaths) ? changedPaths : [],
    sourcePaths: classified.partPaths,
    derivedPaths: classified.derivedPaths,
    syncCheck: options.skipSyncCheck ? null : syncCheck,
    findings,
  };
}

function buildReport(options = {}) {
  const changedScan = listChangedPaths({ staged: options.staged });
  const changedPaths = changedScan.paths;
  let syncCheck = null;
  if (!options.skipSyncCheck) {
    const run = runTaskStoreTruthPipeline(ROOT, {
      check: true,
      verifyAfterSync: false,
    });
    syncCheck = run.report;
  }

  return {
    validator: 'validate-atm-task-store-single-truth',
    ...analyzeState(changedPaths, {
      ...options,
      syncCheck,
      gitScanDiagnostics: changedScan.diagnostics,
    }),
    gitScanDiagnostics: changedScan.diagnostics,
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const report = buildReport(opts);
  if (opts.report) {
    const out = path.resolve(opts.report);
    writeJson(out, report);
    console.error(`[validate-atm-task-store-single-truth] report=${rel(out)}`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-atm-task-store-single-truth] status=${report.passed ? 'pass' : 'fail'} blockers=${report.blockerCount} warnings=${report.warningCount}`);

  if (opts.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-atm-task-store-single-truth] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  listChangedPaths,
  classifyChangedPaths,
  analyzeState,
  buildReport,
};
