#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { ROOT } = require('./lib/project-config');
const {
  DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT,
  DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT,
  findLatestRunDir,
  readJson,
  readJsonIfExists,
  writeJson,
} = require('./lib/h2u-live-rollout');

function parseArgs(argv) {
  const parsed = {
    strict: false,
    report: '',
    runDir: '',
    artifactsRoot: DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT,
    firstWinReport: DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[++index] || '';
    if (token === '--strict') { parsed.strict = true; continue; }
    if (token === '--report') { parsed.report = String(next() || '').trim(); continue; }
    if (token === '--run-dir') { parsed.runDir = String(next() || '').trim(); continue; }
    if (token === '--artifacts-root') { parsed.artifactsRoot = String(next() || '').trim() || parsed.artifactsRoot; continue; }
    if (token === '--first-win-report') { parsed.firstWinReport = String(next() || '').trim() || parsed.firstWinReport; continue; }
    if (token === '--help' || token === '-h') { parsed.help = true; continue; }
    if (token === '--json') { continue; }
    throw new Error(`unknown arg: ${token}`);
  }

  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/validate-legacy-h2u-live-rollout.js [--strict] [--run-dir <path>] [--artifacts-root <path>] [--first-win-report <json>] [--report <json>]');
  console.log('');
  console.log('Validates a guided H2U live rollout artifact bundle.');
}

function rel(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replace(/\\/g, '/');
}

function ensureAbsolute(filePath) {
  return path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(ROOT, filePath);
}

function tailText(value, count = 12) {
  return String(value || '').split(/\r?\n/).filter(Boolean).slice(-count);
}

function buildCheck(id, passed, details = {}) {
  return {
    id,
    passed: Boolean(passed),
    details,
  };
}

function readRequiredJson(filePath, label) {
  const absolute = ensureAbsolute(filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`${label} not found: ${rel(absolute)}`);
  }
  return readJson(absolute);
}

function normalizePathList(paths) {
  return Array.from(new Set((paths || []).map((value) => String(value || '').trim()).filter(Boolean)));
}

function runValidation(opts) {
  const artifactsRoot = ensureAbsolute(opts.artifactsRoot || DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT);
  const runDir = opts.runDir
    ? ensureAbsolute(opts.runDir)
    : findLatestRunDir(artifactsRoot);

  if (!runDir) {
    return buildFailureReport(opts, {
      runDir: artifactsRoot,
      failure: 'no live rollout run directory found',
      checks: [buildCheck('run-directory', false, { message: 'no live rollout run directory found' })],
    });
  }

  const manifestPath = path.join(runDir, 'run.manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return buildFailureReport(opts, {
      runDir,
      failure: 'run manifest not found',
      checks: [buildCheck('run-manifest', false, { message: `missing manifest: ${rel(manifestPath)}` })],
    });
  }

  const manifest = readJson(manifestPath);
  const artifactPaths = manifest && manifest.artifactPaths ? manifest.artifactPaths : {};
  const commands = Array.isArray(manifest && manifest.commands) ? manifest.commands : [];
  const checks = [];

  const orientPath = ensureAbsolute(artifactPaths.orient || path.join(runDir, 'orient.json'));
  const startPath = ensureAbsolute(artifactPaths.start || path.join(runDir, 'start.json'));
  const nextPath = ensureAbsolute(artifactPaths.next || path.join(runDir, 'next.json'));
  const upgradePath = ensureAbsolute(artifactPaths.upgrade || path.join(runDir, 'upgrade.json'));
  const sessionSnapshotPath = ensureAbsolute(artifactPaths.sessionSnapshot || path.join(runDir, 'session-snapshot.json'));
  const proposalPath = ensureAbsolute(artifactPaths.proposal || path.join(runDir, 'proposal.json'));
  const reviewStubPath = ensureAbsolute(artifactPaths.reviewStub || path.join(runDir, 'review.stub.json'));
  const rollbackProofStubPath = ensureAbsolute(artifactPaths.rollbackProofStub || path.join(runDir, 'rollback-proof.stub.json'));
  const firstWinPath = ensureAbsolute(manifest.firstWinReportPath || opts.firstWinReport || DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT);

  const orient = readRequiredJson(orientPath, 'orient artifact');
  const start = readRequiredJson(startPath, 'start artifact');
  const next = readRequiredJson(nextPath, 'next artifact');
  const upgrade = readRequiredJson(upgradePath, 'upgrade artifact');
  const sessionSnapshot = readRequiredJson(sessionSnapshotPath, 'session snapshot');
  const proposal = readRequiredJson(proposalPath, 'proposal artifact');
  const reviewStub = readRequiredJson(reviewStubPath, 'review stub');
  const rollbackProofStub = readRequiredJson(rollbackProofStubPath, 'rollback proof stub');
  const firstWin = readRequiredJson(firstWinPath, 'first-win report');

  checks.push(buildCheck('run-manifest', Boolean(manifest && manifest.passed === true && manifest.schemaId === 'legacy-h2u-live-rollout.runManifest'), {
    runId: String(manifest && manifest.runId || ''),
    targetFile: String(manifest && manifest.targetFile || ''),
  }));

  checks.push(buildCheck('command-results', commands.length >= 4 && commands.every((entry) => entry && entry.passed === true && Number(entry.status) === 0), {
    commandCount: commands.length,
    commands: commands.map((entry) => ({ label: entry.label, status: entry.status, passed: entry.passed })),
  }));

  const startEvidence = start && start.parsed && start.parsed.evidence ? start.parsed.evidence : null;
  const nextEvidence = next && next.parsed && next.parsed.evidence ? next.parsed.evidence : null;
  const upgradeEvidence = upgrade && upgrade.parsed && upgrade.parsed.evidence ? upgrade.parsed.evidence : null;
  const orientationEvidence = startEvidence && startEvidence.session && startEvidence.session.orientation ? startEvidence.session.orientation : null;

  checks.push(buildCheck('orient-start-next-upgrade', Boolean(
    orient && orient.passed === true &&
    start && start.passed === true &&
    next && next.passed === true &&
    upgrade && upgrade.passed === true
  ), {
    orientTail: tailText(orient.stdout),
    startTail: tailText(start.stdout),
    nextTail: tailText(next.stdout),
    upgradeTail: tailText(upgrade.stdout),
  }));

  checks.push(buildCheck('guidance-session', Boolean(startEvidence && startEvidence.sessionId && startEvidence.legacyRoutePlan && startEvidence.guidancePacket), {
    sessionId: startEvidence ? String(startEvidence.sessionId || '') : '',
    legacyRoutePlanSchema: startEvidence && startEvidence.legacyRoutePlan ? String(startEvidence.legacyRoutePlan.schemaId || '') : '',
  }));

  const leafSelection = manifest && manifest.leafSelection ? manifest.leafSelection : null;
  const selectedLeaf = leafSelection && leafSelection.symbolName ? String(leafSelection.symbolName) : '';
  const selectedBehavior = leafSelection && leafSelection.behaviorName ? String(leafSelection.behaviorName) : '';
  const selectedTarget = leafSelection && leafSelection.legacyTarget ? String(leafSelection.legacyTarget) : '';

  checks.push(buildCheck('leaf-selection', Boolean(selectedLeaf && selectedBehavior && selectedTarget), {
    selectionSource: leafSelection && leafSelection.selectionSource ? String(leafSelection.selectionSource) : '',
    selectedLeaf,
    selectedBehavior,
    selectedTarget,
  }));

  checks.push(buildCheck('next-single-action', Boolean(
    nextEvidence && nextEvidence.nextAction && nextEvidence.nextAction.status === 'action' &&
    typeof nextEvidence.nextAction.command === 'string' &&
    nextEvidence.nextAction.command.includes('--legacy-target') &&
    nextEvidence.nextAction.command.includes('--guidance-session') &&
    nextEvidence.nextAction.command.includes('--dry-run')
  ), {
    command: nextEvidence && nextEvidence.nextAction ? String(nextEvidence.nextAction.command || '') : '',
    selectedSegment: nextEvidence && nextEvidence.nextAction ? String(nextEvidence.nextAction.selectedSegment || '') : '',
    selectedBehavior: nextEvidence && nextEvidence.nextAction ? String(nextEvidence.nextAction.selectedBehavior || '') : '',
    legacyTarget: nextEvidence && nextEvidence.nextAction ? String(nextEvidence.nextAction.legacyTarget || '') : '',
  }));

  checks.push(buildCheck('session-snapshot', Boolean(sessionSnapshot && sessionSnapshot.schemaId === 'legacy-h2u-live-rollout.sessionSnapshot' && sessionSnapshot.sessionId === (startEvidence && startEvidence.sessionId) && sessionSnapshot.nextAction), {
    sessionId: String(sessionSnapshot && sessionSnapshot.sessionId || ''),
    nextCommand: String(sessionSnapshot && sessionSnapshot.nextAction && sessionSnapshot.nextAction.command || ''),
    selectedLeaf: String(sessionSnapshot && sessionSnapshot.leafSelection && sessionSnapshot.leafSelection.symbolName || ''),
  }));

  const legacyRoutePlan = sessionSnapshot && sessionSnapshot.legacyRoutePlan ? sessionSnapshot.legacyRoutePlan : null;
  const noTouchZones = Array.isArray(legacyRoutePlan && legacyRoutePlan.noTouchZones) ? legacyRoutePlan.noTouchZones : [];
  const releaseBlockerPath = `${manifest.targetFile}#processElement`;
  checks.push(buildCheck('no-touch-zone', noTouchZones.includes(releaseBlockerPath), {
    releaseBlockerPath,
    noTouchZones,
  }));

  checks.push(buildCheck('proposal-artifact', Boolean(
    proposal && proposal.schemaId === 'legacy-h2u-live-rollout.proposal' &&
    proposal.dryRun === true &&
    proposal.status === 'pending' &&
    proposal.proposal &&
    proposal.proposal.schemaId === 'atm.upgradeProposal' &&
    proposal.proposal.automatedGates && proposal.proposal.automatedGates.allPassed === true
  ), {
    proposalId: String(proposal && proposal.proposalId || ''),
    status: String(proposal && proposal.status || ''),
    dryRun: Boolean(proposal && proposal.dryRun),
    behaviorId: String(proposal && proposal.behaviorId || ''),
    inputKinds: Array.isArray(proposal && proposal.inputKinds) ? proposal.inputKinds : [],
  }));

  checks.push(buildCheck('review-stub', Boolean(reviewStub && reviewStub.schemaId === 'legacy-h2u-live-rollout.reviewStub' && reviewStub.dryRun === true && reviewStub.reviewState === 'pending-human-review' && reviewStub.proposalId === (proposal && proposal.proposalId)), {
    proposalId: String(reviewStub && reviewStub.proposalId || ''),
    reviewState: String(reviewStub && reviewStub.reviewState || ''),
    checklist: Array.isArray(reviewStub && reviewStub.checklist) ? reviewStub.checklist : [],
  }));

  checks.push(buildCheck('rollback-proof-stub', Boolean(rollbackProofStub && rollbackProofStub.schemaId === 'legacy-h2u-live-rollout.rollbackProofStub' && rollbackProofStub.dryRun === true && rollbackProofStub.safeToReplay === true && Array.isArray(rollbackProofStub.replayCommands) && rollbackProofStub.replayCommands.length === 4), {
    proposalId: String(rollbackProofStub && rollbackProofStub.proposalId || ''),
    safeToReplay: Boolean(rollbackProofStub && rollbackProofStub.safeToReplay),
    replayCommandCount: Array.isArray(rollbackProofStub && rollbackProofStub.replayCommands) ? rollbackProofStub.replayCommands.length : 0,
  }));

  checks.push(buildCheck('first-win-go', Boolean(firstWin && firstWin.passed === true && firstWin.finalDecision === 'GO'), {
    runId: String(firstWin && firstWin.runId || ''),
    finalDecision: String(firstWin && firstWin.finalDecision || ''),
    failedRounds: Array.isArray(firstWin && firstWin.summary && firstWin.summary.failedRounds) ? firstWin.summary.failedRounds : [],
  }));

  const failedChecks = checks.filter((check) => !check.passed);
  const passed = failedChecks.length === 0;
  const report = {
    validator: 'validate-legacy-h2u-live-rollout',
    passed,
    finalDecision: passed ? 'GO' : 'NO-GO',
    runId: String(manifest && manifest.runId || ''),
    runDir: rel(runDir),
    manifestPath: rel(manifestPath),
    firstWinReportPath: rel(firstWinPath),
    targetFile: String(manifest && manifest.targetFile || ''),
    selectedLeaf,
    selectedBehavior,
    selectedTarget,
    commands: commands.map((entry) => ({
      label: entry.label,
      status: entry.status,
      passed: entry.passed,
      command: entry.command,
    })),
    checks,
    summary: {
      totalChecks: checks.length,
      failedChecks: failedChecks.map((check) => check.id),
      blockerCount: failedChecks.length,
      artifactCount: normalizePathList(Object.values(artifactPaths)).length,
      recommendation: passed ? 'Leaf rollout bundle is replayable and first-win is GO.' : 'Fix the failed checks before releasing.',
      firstWinDecision: String(firstWin && firstWin.finalDecision || ''),
      orientationStatus: String(orientationEvidence && orientationEvidence.status || ''),
    },
    generatedAt: new Date().toISOString(),
  };

  return report;
}

function buildFailureReport(opts, context) {
  return {
    validator: 'validate-legacy-h2u-live-rollout',
    passed: false,
    finalDecision: 'NO-GO',
    runDir: rel(context.runDir),
    checks: context.checks || [],
    summary: {
      totalChecks: (context.checks || []).length,
      failedChecks: (context.checks || []).map((check) => check.id),
      blockerCount: (context.checks || []).length,
      recommendation: context.failure || 'live rollout validation failed',
    },
    generatedAt: new Date().toISOString(),
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const report = runValidation(opts);
  const reportPath = opts.report ? ensureAbsolute(opts.report) : path.join(findLatestRunDir(ensureAbsolute(opts.artifactsRoot || DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT)) || ensureAbsolute(opts.artifactsRoot || DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT), 'live-rollout.report.json');
  writeJson(reportPath, report);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  console.error(`[validate-legacy-h2u-live-rollout] status=${report.passed ? 'pass' : 'fail'} failedChecks=${report.summary.failedChecks.length} blockers=${report.summary.blockerCount}`);

  if (opts.strict && !report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[validate-legacy-h2u-live-rollout] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runValidation,
  main,
};