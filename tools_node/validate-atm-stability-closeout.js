#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const syncModule = require('./sync-atm-stabilization-milestone');
const atomizeValidator = require('./atm-atomize');
const taskStoreTruthValidator = require('./validate-atm-task-store-single-truth');
const retentionValidator = require('./validate-turn-artifact-retention');
const sidecarValidator = require('./validate-registry-sidecar-convergence');
const versionGovernanceValidator = require('./validate-registry-version-governance');
const anyBoundaryValidator = require('./validate-atm-any-boundaries');
const ruleGuardValidator = require('./validate-rule-guard-read-only');
const { resolveH2uGateConfig } = require('./lib/h2u-gate-defaults');
const { loadRulePack, evaluateRulePack } = require('./adapters/atm-3klife/rule-guard-adapter');

const projectRoot = path.resolve(__dirname, '..');
const RULE_PACK_PATH = path.join(__dirname, 'adapters', 'atm-3klife', 'rule-pack.json');
const DEFAULT_H2U_GUIDANCE_HOTSPOT_PATH = 'tools_node/lib/dom-to-ui/draft-builder-core.js';
const DEFAULT_H2U_RELEASE_BLOCKER = 'processElement';
const DEFAULT_H2U_GUIDANCE_MATCH_SYMBOL = 'parseFragmentList';
const DEFAULT_H2U_GUIDANCE_MATCH_ATOM = 'ATM-CORE-0007';
const DEFAULT_H2U_SPLIT_SYMBOL = 'resolveLength';

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: null,
    includeH2uLiveRollout: false,
    worktreeStatusFile: '',
    allowDirtyPrefixes: [],
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
    if (token === '--include-h2u-live-rollout') {
      parsed.includeH2uLiveRollout = true;
      continue;
    }
    if (token === '--worktree-status-file') {
      parsed.worktreeStatusFile = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--allow-dirty-prefix') {
      const value = String(argv[index + 1] || '').trim();
      index += 1;
      if (value) {
        parsed.allowDirtyPrefixes.push(value);
      }
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
  console.log('Usage: node tools_node/validate-atm-stability-closeout.js [--strict] [--report <json>] [--include-h2u-live-rollout] [--worktree-status-file <txt>] [--allow-dirty-prefix <path>]');
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

function findCheckById(checks, id) {
  return Array.isArray(checks) ? checks.find((check) => check && check.id === id) || null : null;
}

function toCheckSnapshot(check) {
  if (!check) {
    return null;
  }
  return {
    id: check.id,
    passed: Boolean(check.passed),
    blockerCount: Number(check.details && check.details.blockerCount ? check.details.blockerCount : 0),
    warningCount: Number(check.details && check.details.warningCount ? check.details.warningCount : 0),
  };
}

function buildAtm4Summary(checks, options = {}) {
  const includeH2uLiveRollout = Boolean(options.includeH2uLiveRollout);
  const versionGovernanceCheck = findCheckById(checks, 'validate-registry-version-governance');
  const atomizeCheck = findCheckById(checks, 'validate-h2u-atomize-validate');
  const demandPoliceCheck = findCheckById(checks, 'validate-h2u-demand-police');
  const guidanceCheck = findCheckById(checks, 'validate-h2u-host-local-guidance-config');

  const versionSummary = versionGovernanceCheck && versionGovernanceCheck.details && versionGovernanceCheck.details.summary
    ? versionGovernanceCheck.details.summary
    : {};
  const atomizeSummary = atomizeCheck && atomizeCheck.details && atomizeCheck.details.summary
    ? atomizeCheck.details.summary
    : {};
  const demandPoliceSummary = demandPoliceCheck && demandPoliceCheck.details && demandPoliceCheck.details.summary
    ? demandPoliceCheck.details.summary
    : {};
  const guidanceSummary = guidanceCheck && guidanceCheck.details && guidanceCheck.details.summary
    ? guidanceCheck.details.summary
    : {};

  const liveRolloutCheckSnapshots = [
    toCheckSnapshot(atomizeCheck),
    toCheckSnapshot(demandPoliceCheck),
    toCheckSnapshot(guidanceCheck),
  ].filter(Boolean);

  const liveRolloutPassed = includeH2uLiveRollout
    ? liveRolloutCheckSnapshots.length > 0 && liveRolloutCheckSnapshots.every((check) => check.passed)
    : null;
  const versionGovernancePassed = Boolean(versionGovernanceCheck && versionGovernanceCheck.passed);
  const overallPassed = includeH2uLiveRollout
    ? versionGovernancePassed && Boolean(liveRolloutPassed)
    : null;

  return {
    gate: 'ATM-4',
    section: 'atm4-live-rollout-summary',
    includeH2uLiveRollout,
    status: includeH2uLiveRollout
      ? (overallPassed ? 'pass' : 'fail')
      : 'disabled-live-rollout',
    passed: overallPassed,
    versionGovernance: {
      passed: versionGovernancePassed,
      check: toCheckSnapshot(versionGovernanceCheck),
      metrics: {
        entryCount: Number(versionSummary.entryCount || 0),
        atomEntryCount: Number(versionSummary.atomEntryCount || 0),
        mapEntryCount: Number(versionSummary.mapEntryCount || 0),
        backfillRequiredCount: Number(versionSummary.backfillRequiredCount || 0),
        currentPointerDriftCount: Number(versionSummary.currentPointerDriftCount || 0),
        unverifiableHistoryCount: Number(versionSummary.unverifiableHistoryCount || 0),
        alreadyAlignedCount: Number(versionSummary.alreadyAlignedCount || 0),
      },
    },
    h2uLiveRollout: {
      enabled: includeH2uLiveRollout,
      passed: liveRolloutPassed,
      worktreeGate: includeH2uLiveRollout ? (options.h2uGateConfig || null) : null,
      checks: liveRolloutCheckSnapshots,
      metrics: {
        atomizeFailed: Number(atomizeSummary.failed || 0),
        atomizeTotal: Number(atomizeSummary.total || 0),
        demandPoliceBlockingCount: Number(demandPoliceSummary.blockingCount || 0),
        capsules: Number(demandPoliceSummary.capsules || 0),
        anchors: Number(demandPoliceSummary.anchors || 0),
        sharedSuggestions: Number(demandPoliceSummary.sharedSuggestions || 0),
        guidanceIssueCount: Array.isArray(guidanceSummary.issues) ? guidanceSummary.issues.length : 0,
      },
      releaseBlockers: Array.isArray(atomizeSummary.releaseBlockers) ? atomizeSummary.releaseBlockers : [],
      guidance: {
        hotspotPath: String(guidanceSummary.hotspotPath || ''),
        releaseBlocker: String(guidanceSummary.releaseBlocker || ''),
        expectedAtomMatch: String(guidanceSummary.expectedAtomMatch || ''),
        splitDemandSymbol: String(guidanceSummary.splitDemandSymbol || ''),
        issues: Array.isArray(guidanceSummary.issues) ? guidanceSummary.issues : [],
      },
    },
    handoffHeadline: includeH2uLiveRollout
      ? (overallPassed
        ? 'ATM-4 live rollout gate passed (registry governance + H2U sub-gates all green).'
        : 'ATM-4 live rollout gate failed (check version governance or H2U sub-gates).')
      : 'ATM-4 live rollout gate not included (run with --include-h2u-live-rollout for full summary).',
  };
}

function buildAtomizeArgs() {
  return {
    command: 'validate',
    files: [],
    changed: false,
    report: path.join(projectRoot, 'artifacts', 'atm-atomize', 'validate.report.json'),
    candidateReport: path.join(projectRoot, 'artifacts', 'atm-atomize', 'candidates.json'),
    workbenchRoot: path.join(projectRoot, 'atomic_workbench'),
    strict: true,
    json: true,
    help: false,
    policy: null,
    policyHook: null,
    registryPath: null,
    usageRefFile: null,
    capsuleId: '',
    targetTier: '',
  };
}

function runH2uAtomizeValidateCheck() {
  const report = atomizeValidator.runValidate(buildAtomizeArgs());
  return {
    passed: Boolean(report && report.passed),
    blockerCount: Number(report && report.failed ? report.failed : 0),
    warningCount: 0,
    summary: {
      failed: Number(report && report.failed ? report.failed : 0),
      total: Number(report && report.total ? report.total : 0),
      releaseBlockers: report && report.summary && Array.isArray(report.summary.releaseBlockers)
        ? report.summary.releaseBlockers
        : [],
    },
  };
}

function runH2uDemandPoliceCheck() {
  const report = atomizeValidator.runDemandPolice(buildAtomizeArgs());
  return {
    passed: Boolean(report && report.passed),
    blockerCount: Number(report && report.blockingCount ? report.blockingCount : 0),
    warningCount: 0,
    summary: {
      blockingCount: Number(report && report.blockingCount ? report.blockingCount : 0),
      capsules: Number(report && report.summary && report.summary.capsules ? report.summary.capsules : 0),
      anchors: Number(report && report.summary && report.summary.anchors ? report.summary.anchors : 0),
      sharedSuggestions: Number(report && report.summary && report.summary.sharedSuggestions ? report.summary.sharedSuggestions : 0),
    },
  };
}

function runH2uHostLocalGuidanceConfigCheck() {
  const issues = [];
  const configPath = path.join(projectRoot, '.atm', 'config.json');
  if (!fs.existsSync(configPath)) {
    return {
      passed: false,
      blockerCount: 1,
      warningCount: 0,
      summary: {
        hasHostConfig: false,
        issues: ['missing .atm/config.json'],
      },
    };
  }

  let config = null;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    return {
      passed: false,
      blockerCount: 1,
      warningCount: 0,
      summary: {
        hasHostConfig: true,
        issues: [`invalid .atm/config.json: ${String(error && (error.message || error) || 'unknown')}`],
      },
    };
  }

  const guidance = config && typeof config.guidance === 'object' && config.guidance !== null
    ? config.guidance
    : null;
  if (!guidance) {
    issues.push('guidance section missing in .atm/config.json');
  }

  const hotspots = guidance && Array.isArray(guidance.legacyHotspots) ? guidance.legacyHotspots : [];
  const hotspot = hotspots.find((entry) => entry && entry.path === DEFAULT_H2U_GUIDANCE_HOTSPOT_PATH) || null;
  if (!hotspot) {
    issues.push(`guidance.legacyHotspots missing hotspot path: ${DEFAULT_H2U_GUIDANCE_HOTSPOT_PATH}`);
  }

  const hotspotBlockers = hotspot && Array.isArray(hotspot.releaseBlockers)
    ? hotspot.releaseBlockers.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (!hotspotBlockers.includes(DEFAULT_H2U_RELEASE_BLOCKER)) {
    issues.push(`guidance hotspot must include release blocker: ${DEFAULT_H2U_RELEASE_BLOCKER}`);
  }

  const noTouchZones = guidance && Array.isArray(guidance.noTouchZones) ? guidance.noTouchZones : [];
  const noTouchPath = `${DEFAULT_H2U_GUIDANCE_HOTSPOT_PATH}#${DEFAULT_H2U_RELEASE_BLOCKER}`;
  if (!noTouchZones.some((entry) => entry && entry.path === noTouchPath)) {
    issues.push(`guidance.noTouchZones must include: ${noTouchPath}`);
  }

  if (!guidance || guidance.defaultLegacyFlow !== 'shadow') {
    issues.push('guidance.defaultLegacyFlow must be shadow');
  }

  const atomIndexPath = hotspot && typeof hotspot.existingAtomIndexPath === 'string'
    ? path.resolve(projectRoot, hotspot.existingAtomIndexPath)
    : null;
  const demandReportPath = hotspot && typeof hotspot.demandReportPath === 'string'
    ? path.resolve(projectRoot, hotspot.demandReportPath)
    : null;

  if (!atomIndexPath || !fs.existsSync(atomIndexPath)) {
    issues.push('existingAtomIndexPath missing or not found');
  }
  if (!demandReportPath || !fs.existsSync(demandReportPath)) {
    issues.push('demandReportPath missing or not found');
  }

  if (atomIndexPath && fs.existsSync(atomIndexPath)) {
    try {
      const atomIndex = JSON.parse(fs.readFileSync(atomIndexPath, 'utf8').replace(/^\uFEFF/, ''));
      const matches = Array.isArray(atomIndex && atomIndex.matches) ? atomIndex.matches : [];
      const hasExpectedMatch = matches.some((entry) => entry
        && entry.symbolName === DEFAULT_H2U_GUIDANCE_MATCH_SYMBOL
        && entry.atomId === DEFAULT_H2U_GUIDANCE_MATCH_ATOM);
      if (!hasExpectedMatch) {
        issues.push(`existing atom index must map ${DEFAULT_H2U_GUIDANCE_MATCH_SYMBOL} -> ${DEFAULT_H2U_GUIDANCE_MATCH_ATOM}`);
      }
    } catch (error) {
      issues.push(`existing atom index JSON invalid: ${String(error && (error.message || error) || 'unknown')}`);
    }
  }

  if (demandReportPath && fs.existsSync(demandReportPath)) {
    try {
      const demandReport = JSON.parse(fs.readFileSync(demandReportPath, 'utf8').replace(/^\uFEFF/, ''));
      const threshold = Number(demandReport && demandReport.demandThreshold ? demandReport.demandThreshold : 0);
      const callerDistribution = demandReport && typeof demandReport.callerDistribution === 'object' && demandReport.callerDistribution !== null
        ? demandReport.callerDistribution
        : {};
      const splitDemand = Number(callerDistribution[DEFAULT_H2U_SPLIT_SYMBOL] || 0);
      if (!Number.isFinite(threshold) || threshold <= 0) {
        issues.push('demandReport.demandThreshold must be a positive number');
      }
      if (splitDemand < threshold) {
        issues.push(`${DEFAULT_H2U_SPLIT_SYMBOL} demand must be >= demandThreshold`);
      }
    } catch (error) {
      issues.push(`demand report JSON invalid: ${String(error && (error.message || error) || 'unknown')}`);
    }
  }

  const draftBuilderPath = path.join(projectRoot, DEFAULT_H2U_GUIDANCE_HOTSPOT_PATH);
  if (!fs.existsSync(draftBuilderPath)) {
    issues.push(`missing hotspot file: ${DEFAULT_H2U_GUIDANCE_HOTSPOT_PATH}`);
  } else {
    const source = fs.readFileSync(draftBuilderPath, 'utf8').replace(/^\uFEFF/, '');
    if (!/function\s+processElement\s*\(/.test(source)) {
      issues.push('processElement function missing in draft-builder-core.js');
    }
    if (!/function\s+parseFragmentList\s*\(/.test(source)) {
      issues.push('parseFragmentList function missing in draft-builder-core.js');
    }
    if (!/function\s+resolveLength\s*\(/.test(source)) {
      issues.push('resolveLength function missing in draft-builder-core.js');
    }
  }

  return {
    passed: issues.length === 0,
    blockerCount: issues.length,
    warningCount: 0,
    summary: {
      hasHostConfig: true,
      hotspotPath: DEFAULT_H2U_GUIDANCE_HOTSPOT_PATH,
      releaseBlocker: DEFAULT_H2U_RELEASE_BLOCKER,
      expectedAtomMatch: `${DEFAULT_H2U_GUIDANCE_MATCH_SYMBOL}:${DEFAULT_H2U_GUIDANCE_MATCH_ATOM}`,
      splitDemandSymbol: DEFAULT_H2U_SPLIT_SYMBOL,
      issues,
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

function runTaskStoreSingleTruthCheck() {
  return taskStoreTruthValidator.buildReport({
    strict: true,
    staged: false,
    skipSyncCheck: true,
  });
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

function runVersionGovernanceCheck() {
  return versionGovernanceValidator.buildReport(JSON.parse(fs.readFileSync(path.join(projectRoot, 'atomic-registry.json'), 'utf8').replace(/^\uFEFF/, '')));
}

function runAnyBoundaryCheck() {
  return anyBoundaryValidator.buildReport();
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
  const taskStoreSingleTruthReport = runTaskStoreSingleTruthCheck();
  const retentionReport = runRetentionCheck();
  const sidecarReport = await runSidecarCheck();
  const versionGovernanceReport = runVersionGovernanceCheck();
  const backfillCompat = buildBackfillCompatCheck(sidecarReport);
  const anyBoundaryReport = runAnyBoundaryCheck();
  const ruleGuardReport = runRuleGuardCheck();
  const h2uGateConfig = args.includeH2uLiveRollout
    ? resolveH2uGateConfig({
      worktreeStatusFile: args.worktreeStatusFile,
      allowDirtyPrefixes: args.allowDirtyPrefixes,
    })
    : null;

  const checks = [
    toCheck('sync-atm-task-store', syncReport, {
      changedFiles: syncReport.changedFiles || [],
      summary: syncReport.summary || {},
    }),
    toCheck('validate-atm-task-store-single-truth', taskStoreSingleTruthReport, {
      summary: taskStoreSingleTruthReport.summary || {},
      derivedPaths: taskStoreSingleTruthReport.derivedPaths || [],
      sourcePaths: taskStoreSingleTruthReport.sourcePaths || [],
    }),
    toCheck('validate-turn-artifact-retention', retentionReport, {
      root: retentionReport.root,
      summary: retentionReport.summary || {},
    }),
    toCheck('validate-registry-sidecar-convergence', sidecarReport, {
      summary: sidecarReport.summary || {},
    }),
    toCheck('validate-registry-version-governance', versionGovernanceReport, {
      summary: versionGovernanceReport.summary || {},
      plan: versionGovernanceReport.plan || [],
    }),
    toCheck('validate-registry-backfill-sweep', backfillCompat, {
      source: 'derived-from-validate-registry-sidecar-convergence',
      summary: backfillCompat.summary || {},
    }),
    toCheck('validate-atm-any-boundaries', anyBoundaryReport, {
      summary: anyBoundaryReport.summary || {},
      findings: anyBoundaryReport.findings || [],
    }),
    toCheck('validate-rule-guard-read-only', ruleGuardReport, {
      checks: ruleGuardReport.checks || [],
    }),
  ];

  if (args.includeH2uLiveRollout) {
    const h2uAtomizeValidateReport = runH2uAtomizeValidateCheck();
    const h2uDemandPoliceReport = runH2uDemandPoliceCheck();
    const h2uGuidanceConfigReport = runH2uHostLocalGuidanceConfigCheck();

    checks.push(
      toCheck('validate-h2u-atomize-validate', h2uAtomizeValidateReport, {
        summary: h2uAtomizeValidateReport.summary || {},
        h2uGateConfig,
      }),
      toCheck('validate-h2u-demand-police', h2uDemandPoliceReport, {
        summary: h2uDemandPoliceReport.summary || {},
        h2uGateConfig,
      }),
      toCheck('validate-h2u-host-local-guidance-config', h2uGuidanceConfigReport, {
        summary: h2uGuidanceConfigReport.summary || {},
        h2uGateConfig,
      }),
    );
  }

  const findings = buildFindings(checks);
  const blockerCount = findings.length;
  const atm4Summary = buildAtm4Summary(checks, {
    includeH2uLiveRollout: args.includeH2uLiveRollout,
    h2uGateConfig,
  });
  const report = {
    validator: 'validate-atm-stability-closeout',
    startedAt,
    finishedAt: new Date().toISOString(),
    checks,
    atm4Summary,
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
  buildAtm4Summary,
  buildAtomizeArgs,
  runSyncCheck,
  runH2uAtomizeValidateCheck,
  runH2uDemandPoliceCheck,
  runH2uHostLocalGuidanceConfigCheck,
  runTaskStoreSingleTruthCheck,
  runRetentionCheck,
  runSidecarCheck,
  runVersionGovernanceCheck,
  runAnyBoundaryCheck,
  runRuleGuardCheck,
  buildBackfillCompatCheck,
};
