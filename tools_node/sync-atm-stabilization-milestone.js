#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { readTasksAtmStore } = require('./lib/tasks-atm-shard-store');
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

function printHelp() {
  console.log('Usage: node tools_node/sync-atm-stabilization-milestone.js [--check] [--strict] [--report <json>]');
  console.log('');
  console.log('Synchronizes the ATM stabilization milestone from the thin task store.');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const state = readTasksAtmStore(ROOT);
  const snapshot = buildMilestoneSnapshot(ROOT, state);
  const absolutePath = path.join(ROOT, MILESTONE_PATH_REL);
  const existing = readExistingFile(absolutePath);
  let changed = existing !== snapshot.markdown;

  if (!opts.check) {
    const result = syncAtmStabilizationMilestone(ROOT, state, { dryRun: false });
    changed = result.changed;
  }

  const report = buildReport(snapshot, existing, changed, opts.check);

  if (opts.report) {
    const out = path.resolve(opts.report);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.error(`[sync-atm-stabilization-milestone] report=${rel(out)}`);
  }

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  console.error(`[sync-atm-stabilization-milestone] status=${report.passed ? 'pass' : 'fail'} changed=${changed}`);

  if (opts.strict && opts.check && existing !== snapshot.markdown) {
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
};
