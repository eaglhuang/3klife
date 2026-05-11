#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const syncModule = require('./sync-atm-stabilization-milestone');
const retentionValidator = require('./validate-turn-artifact-retention');
const sidecarValidator = require('./validate-registry-sidecar-convergence');
const ruleGuardValidator = require('./validate-rule-guard-read-only');
const { loadRulePack, evaluateRulePack } = require('./adapters/atm-3klife/rule-guard-adapter');

const projectRoot = path.resolve(__dirname, '..');
const RULE_PACK_PATH = path.join(__dirname, 'adapters', 'atm-3klife', 'rule-pack.json');

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
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

function printHelp() {
  console.log('Usage: node tools_node/validate-atm-stability-closeout.js [--strict] [--report <json>]');
  console.log('');
  console.log('Runs ATM closeout validators as one machine-readable gate.');
}

function rel(filePath) {
  return path.relative(projectRoot, path.resolve(filePath)).replace(/\\/g, '/');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function toCheck(id, report, details = {}) {
  return {
    id,
    passed: Boolean(report && report.passed),
    details: {
      blockerCount: Number(report && report.blockerCount ? report.blockerCount : 0),
      warningCount: Number(report && report.warningCount ? report.warningCount : 0),
      ...details,
    },
  };
}

function buildFindings(checks) {
  const findings = [];
  for (const check of checks) {
    if (check.passed) {
      continue;
    }
    findings.push({
      findingVersion: 'atm-stability-closeout-finding/v1',
      kind: 'atm-stability-closeout-finding',
      ruleId: `atm-stability-closeout.${check.id}.failed`,
      trigger: `atm.stability.closeout.${check.id}.failed`,
      scope: 'ATM stability closeout aggregate gate',
      severity: 'block',
      action: 'fail',
      routeClass: 'blocker',
      routeHint: '先修復該子檢查，再重新執行 validate-atm-stability-closeout --strict。',
      message: `${check.id} failed`,
      file: '',
      line: 0,
      details: check.details || {},
    });
  }
  return findings;
}

function runSyncCheck() {
  const run = syncModule.runTaskStoreTruthPipeline(projectRoot, {
    check: true,
    verifyAfterSync: false,
  });
  return run.report;
}

function runRetentionCheck() {
  return retentionValidator.buildReport({
    strict: true,
    root: 'artifacts/turn-artifacts',
    rotationDays: 30,
  });
}

async function runSidecarCheck() {
  return sidecarValidator.buildReport();
}

function runRuleGuardCheck() {
  const rulePack = loadRulePack(RULE_PACK_PATH);
  const structure = ruleGuardValidator.validateRulePackStructure(rulePack);
  const runtime = evaluateRulePack({
    profile: 'atm',
    rulePackPath: RULE_PACK_PATH,
  });
  return ruleGuardValidator.buildReport(runtime, structure);
}

function buildBackfillCompatCheck(sidecarReport) {
  const summary = sidecarReport && sidecarReport.summary ? sidecarReport.summary : {};
  const blockers = Number(summary.missingHistoricalSf || 0)
    + Number(summary.pendingSfCalculation || 0)
    + Number(summary.catalogIndexMismatch || 0);
  return {
    passed: blockers === 0,
    blockerCount: blockers,
    warningCount: Number(summary.legacyNoSfAllowlist || 0),
    summary,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const startedAt = new Date().toISOString();
  const syncReport = runSyncCheck();
  const retentionReport = runRetentionCheck();
  const sidecarReport = await runSidecarCheck();
  const backfillCompat = buildBackfillCompatCheck(sidecarReport);
  const ruleGuardReport = runRuleGuardCheck();

  const checks = [
    toCheck('sync-atm-task-store', syncReport, {
      changedFiles: syncReport.changedFiles || [],
      summary: syncReport.summary || {},
    }),
    toCheck('validate-turn-artifact-retention', retentionReport, {
      root: retentionReport.root,
      summary: retentionReport.summary || {},
    }),
    toCheck('validate-registry-sidecar-convergence', sidecarReport, {
      summary: sidecarReport.summary || {},
    }),
    toCheck('validate-registry-backfill-sweep', backfillCompat, {
      source: 'derived-from-validate-registry-sidecar-convergence',
      summary: backfillCompat.summary || {},
    }),
    toCheck('validate-rule-guard-read-only', ruleGuardReport, {
      checks: ruleGuardReport.checks || [],
    }),
  ];

  const findings = buildFindings(checks);
  const blockerCount = findings.length;
  const report = {
    validator: 'validate-atm-stability-closeout',
    startedAt,
    finishedAt: new Date().toISOString(),
    checks,
    findings,
    blockerCount,
    warningCount: 0,
    passed: blockerCount === 0,
  };

  if (args.report) {
    const reportPath = path.resolve(args.report);
    writeJson(reportPath, report);
    console.error(`[validate-atm-stability-closeout] report=${rel(reportPath)}`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-atm-stability-closeout] status=${report.passed ? 'pass' : 'fail'} blockers=${blockerCount}`);

  if (args.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[validate-atm-stability-closeout] ${error.stack || error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  buildFindings,
  runSyncCheck,
  runRetentionCheck,
  runSidecarCheck,
  runRuleGuardCheck,
  buildBackfillCompatCheck,
};
