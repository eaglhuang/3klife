#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  DEFAULT_MAX_PART_BYTES,
  DEFAULT_MAX_PART_LINES,
  readTasksAtmStore,
  writeTasksAtmStore,
} = require('./lib/tasks-atm-shard-store');
const {
  MILESTONE_PATH_REL,
  buildMilestoneSnapshot,
  syncAtmStabilizationMilestone,
} = require('./lib/atm-stabilization-milestone');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const parsed = {
    check: false,
    strict: false,
    milestoneOnly: false,
    report: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--check') {
      parsed.check = true;
      continue;
    }
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--milestone-only') {
      parsed.milestoneOnly = true;
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

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function readExistingFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function buildReport(snapshot, existing, changed, checkMode) {
  return {
    validator: 'sync-atm-stabilization-milestone',
    mode: 'milestone-only',
    milestonePath: snapshot.path,
    sourceOfTruth: 'docs/tasks/tasks-atm.json',
    checkMode,
    passed: checkMode ? existing === snapshot.markdown : true,
    changed,
    summary: snapshot.summary,
    checks: [
      {
        id: 'milestone-file-match',
        passed: checkMode ? existing === snapshot.markdown : changed === false || changed === true,
        status: checkMode ? (existing === snapshot.markdown ? 0 : 1) : 0,
        stderr: checkMode ? (existing === snapshot.markdown ? '' : 'milestone file drifted from current task store') : '',
      },
    ],
    fileSize: Buffer.byteLength(snapshot.markdown, 'utf8'),
  };
}

function isPartPath(filePath) {
  return /^docs\/tasks\/tasks-atm\/tasks-atm-part-\d+\.json$/.test(filePath);
}

function buildStoreDrift(result) {
  const changed = result && Array.isArray(result.changedFiles) ? result.changedFiles : [];
  const indexPath = result && result.paths ? result.paths.indexPath : 'docs/tasks/tasks-atm.json';
  const milestonePath = result && result.paths ? result.paths.milestonePath : MILESTONE_PATH_REL;
  const shardRcPath = result && result.paths ? result.paths.shardRcPath : 'docs/tasks/tasks-atm/.shardrc.json';
  const partDriftFiles = changed.filter((filePath) => isPartPath(filePath));

  return {
    indexPath,
    milestonePath,
    shardRcPath,
    indexDrift: changed.includes(indexPath),
    milestoneDrift: changed.includes(milestonePath),
    shardRcDrift: changed.includes(shardRcPath),
    partDriftFiles,
  };
}

function buildPipelineReport(result, options = {}, postCheckResult = null) {
  const changed = result && Array.isArray(result.changedFiles) ? result.changedFiles : [];
  const drift = buildStoreDrift(result);
  const postCheckChanged = postCheckResult && Array.isArray(postCheckResult.changedFiles)
    ? postCheckResult.changedFiles
    : [];
  const postCheckPassed = postCheckResult ? postCheckChanged.length === 0 : true;
  const isCheckMode = Boolean(options.check);
  const passed = isCheckMode ? changed.length === 0 : postCheckPassed;

  const checks = [
    {
      id: 'tasks-atm-index-match',
      passed: isCheckMode ? drift.indexDrift === false : true,
      status: isCheckMode && drift.indexDrift ? 1 : 0,
      stderr: isCheckMode && drift.indexDrift ? 'tasks-atm index summary drifted from shard truth' : '',
    },
    {
      id: 'milestone-file-match',
      passed: isCheckMode ? drift.milestoneDrift === false : true,
      status: isCheckMode && drift.milestoneDrift ? 1 : 0,
      stderr: isCheckMode && drift.milestoneDrift ? 'milestone file drifted from current task store' : '',
    },
    {
      id: 'tasks-atm-shard-layout-stable',
      passed: isCheckMode ? (drift.shardRcDrift === false && drift.partDriftFiles.length === 0) : true,
      status: isCheckMode && (drift.shardRcDrift || drift.partDriftFiles.length > 0) ? 1 : 0,
      stderr: isCheckMode && (drift.shardRcDrift || drift.partDriftFiles.length > 0)
        ? 'tasks-atm shard layout drifted from current task store'
        : '',
    },
  ];

  return {
    validator: 'sync-atm-stabilization-milestone',
    mode: 'task-store-truth',
    sourceOfTruth: 'docs/tasks/tasks-atm/tasks-atm-part-*.json',
    checkMode: isCheckMode,
    passed,
    changedFiles: changed,
    changed: changed.length > 0,
    summary: result && result.summary ? result.summary : { done: 0, in_progress: 0, open: 0, total: 0 },
    paths: result && result.paths ? result.paths : {
      indexPath: 'docs/tasks/tasks-atm.json',
      milestonePath: MILESTONE_PATH_REL,
      partsDir: 'docs/tasks/tasks-atm',
      shardRcPath: 'docs/tasks/tasks-atm/.shardrc.json',
    },
    drift,
    postSyncCheck: postCheckResult
      ? {
        passed: postCheckPassed,
        changedFiles: postCheckChanged,
      }
      : null,
    checks,
  };
}

function runTaskStoreTruthPipeline(projectRoot, options = {}) {
  const checkMode = Boolean(options.check);
  const verifyAfterSync = options.verifyAfterSync !== false;
  const state = readTasksAtmStore(projectRoot);
  const applyOrCheck = writeTasksAtmStore(projectRoot, state.tasks, {
    maxPartBytes: DEFAULT_MAX_PART_BYTES,
    maxPartLines: DEFAULT_MAX_PART_LINES,
    syncMilestone: true,
    dryRun: checkMode,
  });

  let postCheck = null;
  if (!checkMode && verifyAfterSync) {
    const postState = readTasksAtmStore(projectRoot);
    postCheck = writeTasksAtmStore(projectRoot, postState.tasks, {
      maxPartBytes: DEFAULT_MAX_PART_BYTES,
      maxPartLines: DEFAULT_MAX_PART_LINES,
      syncMilestone: true,
      dryRun: true,
    });
  }

  return {
    state,
    result: applyOrCheck,
    postCheck,
    report: buildPipelineReport(applyOrCheck, options, postCheck),
  };
}

function printHelp() {
  console.log('Usage: node tools_node/sync-atm-stabilization-milestone.js [--check] [--strict] [--report <json>] [--milestone-only]');
  console.log('');
  console.log('Default mode: enforce task-store truth pipeline (tasks-atm shard -> tasks-atm.json summary -> milestone).');
  console.log('Use --milestone-only to run legacy milestone-only sync/check behavior.');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  let report;

  if (opts.milestoneOnly) {
    const state = readTasksAtmStore(ROOT);
    const snapshot = buildMilestoneSnapshot(ROOT, state);
    const absolutePath = path.join(ROOT, MILESTONE_PATH_REL);
    const existing = readExistingFile(absolutePath);
    let changed = existing !== snapshot.markdown;

    if (!opts.check) {
      const result = syncAtmStabilizationMilestone(ROOT, state, { dryRun: false });
      changed = result.changed;
    }

    report = buildReport(snapshot, existing, changed, opts.check);
  } else {
    const run = runTaskStoreTruthPipeline(ROOT, {
      check: opts.check,
      verifyAfterSync: true,
    });
    report = run.report;
  }

  if (opts.report) {
    const out = path.resolve(opts.report);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.error(`[sync-atm-stabilization-milestone] report=${rel(out)}`);
  }

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  console.error(`[sync-atm-stabilization-milestone] status=${report.passed ? 'pass' : 'fail'} changed=${report.changed ? 'yes' : 'no'}`);

  if (opts.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[sync-atm-stabilization-milestone] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  buildReport,
  buildStoreDrift,
  buildPipelineReport,
  runTaskStoreTruthPipeline,
};
