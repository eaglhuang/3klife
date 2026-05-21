#!/usr/bin/env node
'use strict';

const _fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const { ROOT } = require('./lib/project-config');
const {
  buildNodeEntrypointArgs,
  buildNodeInvocationCommand,
  resolveUpstreamPaths,
} = require('./lib/upstream-env');
const {
  DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT,
  DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT,
  DEFAULT_LIVE_ROLLOUT_RELEASE_BLOCKER,
  DEFAULT_LIVE_ROLLOUT_TARGET_FILE,
  buildRunId,
  ensureDir,
  parseJsonOutput,
  writeJson,
} = require('./lib/h2u-live-rollout');

function parseArgs(argv) {
  const parsed = {
    cwd: ROOT,
    goal: 'H2U live rollout leaf rehearsal',
    targetFile: DEFAULT_LIVE_ROLLOUT_TARGET_FILE,
    releaseBlockers: [DEFAULT_LIVE_ROLLOUT_RELEASE_BLOCKER],
    actor: 'H2U live rollout generator',
    runId: '',
    artifactsRoot: DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT,
    firstWinReport: DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT,
    upstreamRepoRoot: '',
    upstreamCliEntrypoint: '',
    report: '',
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[++index] || '';

    if (token === '--cwd') { parsed.cwd = String(next() || '').trim() || ROOT; continue; }
    if (token === '--goal') { parsed.goal = String(next() || '').trim() || parsed.goal; continue; }
    if (token === '--target-file') { parsed.targetFile = String(next() || '').trim() || parsed.targetFile; continue; }
    if (token === '--release-blocker') {
      const value = String(next() || '').trim();
      if (value) parsed.releaseBlockers.push(value);
      continue;
    }
    if (token === '--release-blockers') {
      const values = String(next() || '').split(',').map((value) => value.trim()).filter(Boolean);
      parsed.releaseBlockers.push(...values);
      continue;
    }
    if (token === '--actor') { parsed.actor = String(next() || '').trim() || parsed.actor; continue; }
    if (token === '--run-id') { parsed.runId = String(next() || '').trim(); continue; }
    if (token === '--artifacts-root') { parsed.artifactsRoot = String(next() || '').trim() || parsed.artifactsRoot; continue; }
    if (token === '--first-win-report') { parsed.firstWinReport = String(next() || '').trim() || parsed.firstWinReport; continue; }
    if (token === '--upstream-repo-root') { parsed.upstreamRepoRoot = String(next() || '').trim(); continue; }
    if (token === '--upstream-cli-entrypoint') { parsed.upstreamCliEntrypoint = String(next() || '').trim(); continue; }
    if (token === '--report') { parsed.report = String(next() || '').trim(); continue; }
    if (token === '--json') { parsed.json = true; continue; }
    if (token === '--help' || token === '-h') { parsed.help = true; continue; }
    throw new Error(`unknown arg: ${token}`);
  }

  parsed.releaseBlockers = Array.from(new Set(parsed.releaseBlockers.map((value) => String(value || '').trim()).filter(Boolean)));
  if (parsed.releaseBlockers.length === 0) {
    parsed.releaseBlockers = [DEFAULT_LIVE_ROLLOUT_RELEASE_BLOCKER];
  }
  return parsed;
}

function printHelp() {
  console.log('Usage: node tools_node/run-h2u-guided-leaf-rollout.js [--cwd <path>] [--goal <text>] [--target-file <path>] [--release-blocker <symbol>] [--actor <name>] [--report <json>]');
  console.log('');
  console.log('Runs ATM orient/start/next/upgrade and writes a replayable live rollout artifact bundle.');
}

function rel(filePath, baseDir = ROOT) {
  return path.relative(baseDir, path.resolve(filePath)).replace(/\\/g, '/');
}

function normalizeRelativePath(baseDir, inputPath) {
  const absolute = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(baseDir, inputPath);
  return rel(absolute, baseDir);
}

function tailLines(text, count = 12) {
  return String(text || '').split(/\r?\n/).filter(Boolean).slice(-count);
}

function trimCommandValue(value) {
  return String(value || '').trim();
}

function sanitizeIdSegment(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'leaf';
}

function makeCommandRecord(label, commandName, commandArgs, upstreamCliEntrypoint, upstreamRepoRoot, workspaceRoot) {
  const startedAt = Date.now();
  const invocationArgs = buildNodeEntrypointArgs(upstreamCliEntrypoint, [commandName, ...commandArgs]);
  const proc = cp.spawnSync(process.execPath, invocationArgs, {
    cwd: upstreamRepoRoot,
    encoding: 'utf8',
    shell: false,
  });
  const durationMs = Date.now() - startedAt;
  const stdout = String(proc && proc.stdout || '');
  const stderr = String(proc && proc.stderr || '');
  const status = typeof proc.status === 'number' ? proc.status : 1;
  const error = proc.error ? String(proc.error.message || proc.error) : '';
  const command = buildNodeInvocationCommand(upstreamCliEntrypoint, [commandName, ...commandArgs]);
  return {
    label,
    command,
    cwd: workspaceRoot,
    upstreamCwd: upstreamRepoRoot,
    status,
    passed: status === 0 && !error,
    durationMs,
    stdout,
    stderr,
    stdoutTail: tailLines(stdout),
    stderrTail: tailLines(stderr),
    error,
    parsed: parseJsonOutput(stdout),
  };
}

function selectLeafTarget(legacyRoutePlan, nextAction) {
  const selectedSegmentName = trimCommandValue(nextAction && nextAction.selectedSegment);
  const selectedTarget = trimCommandValue(nextAction && nextAction.legacyTarget);
  const targetFile = trimCommandValue(nextAction && nextAction.targetFile) || trimCommandValue(legacyRoutePlan && legacyRoutePlan.targetFile);
  const preferredSegment = selectedSegmentName
    ? legacyRoutePlan.segments.find((segment) => segment.symbolName === selectedSegmentName)
    : null;
  const targetLeafName = selectedTarget.includes('#')
    ? selectedTarget.split('#').pop()
    : selectedSegmentName;
  const targetLeafSegment = targetLeafName
    ? legacyRoutePlan.segments.find((segment) => segment.symbolName === targetLeafName)
    : null;
  const resolveLengthSegment = legacyRoutePlan.segments.find((segment) => segment.symbolName === 'resolveLength' && legacyRoutePlan.safeFirstAtoms.includes(segment.symbolName)) || null;
  const fallbackSafeSegment = legacyRoutePlan.segments.find((segment) => legacyRoutePlan.safeFirstAtoms.includes(segment.symbolName)) || null;
  const selectedSegment = preferredSegment || targetLeafSegment || resolveLengthSegment || fallbackSafeSegment || null;

  if (!selectedSegment) {
    return null;
  }

  const selectionSource = preferredSegment || targetLeafSegment
    ? 'next-action'
    : (resolveLengthSegment ? 'fallback-resolveLength' : 'fallback-safeFirstAtom');
  const legacyTarget = selectedTarget || `${targetFile}#${selectedSegment.symbolName}`;

  return {
    symbolName: selectedSegment.symbolName,
    behaviorName: selectedSegment.recommendedBehavior,
    legacyTarget,
    selectionSource,
    targetFile,
    selectedSegment: selectedSegment.symbolName,
  };
}

function buildSyntheticInputDocs(context) {
  const inputDir = path.join(context.runDir, 'inputs');
  ensureDir(inputDir);

  const atomId = `h2u-${sanitizeIdSegment(context.selection.symbolName)}`;
  const fromVersion = '0.0.0';
  const toVersion = '0.0.1';
  const proposalId = `legacy-h2u-live-rollout.${context.runId}`;
  const baseContext = {
    runId: context.runId,
    goal: context.goal,
    workspaceRoot: context.workspaceRoot,
    targetFile: context.targetFile,
    legacyTarget: context.selection.legacyTarget,
    selectedLeaf: context.selection.symbolName,
    selectedBehavior: context.selection.behaviorName,
    selectionSource: context.selection.selectionSource,
    sessionId: context.sessionId,
  };

  const docs = {
    hashDiff: {
      schemaId: 'atm.hashDiffReport',
      reportId: `hash-diff.${context.runId}`,
      atomId,
      fromVersion,
      toVersion,
      targetFile: context.targetFile,
      legacyTarget: context.selection.legacyTarget,
      summary: 'Synthetic hash-diff report for H2U live rollout replay.',
      ...baseContext,
    },
    nonRegression: {
      schemaId: 'atm.police.nonRegressionReport',
      reportId: `non-regression.${context.runId}`,
      passed: true,
      summary: 'Synthetic non-regression pass for H2U live rollout replay.',
      reportPath: '',
      ...baseContext,
    },
    qualityComparison: {
      schemaId: 'atm.police.qualityComparisonReport',
      reportId: `quality-comparison.${context.runId}`,
      passed: true,
      regressed: false,
      regressedMetrics: [],
      metrics: [
        {
          name: 'leafReplayCompleteness',
          baseline: 1,
          current: 1,
          delta: 0,
          direction: 'higher-is-better',
          tolerance: 0,
          passed: true,
        },
        {
          name: 'trunkMutationRisk',
          baseline: 0,
          current: 0,
          delta: 0,
          direction: 'lower-is-better',
          tolerance: 0,
          passed: true,
        },
      ],
      mapImpactScope: { affectedMapIds: [], propagationStatus: [] },
      dedupCandidates: [],
      dedupIgnoredAsPolymorph: [],
      summary: 'Synthetic quality-comparison pass for H2U live rollout replay.',
      reportPath: '',
      ...baseContext,
    },
    registryCandidate: {
      schemaId: 'atm.police.registryCandidateReport',
      reportId: `registry-candidate.${context.runId}`,
      passed: true,
      canPromote: true,
      summary: 'Synthetic registry-candidate pass for H2U live rollout replay.',
      reportPath: '',
      ...baseContext,
    },
  };

  const reportPaths = {
    hashDiff: path.join(inputDir, 'hash-diff.json'),
    nonRegression: path.join(inputDir, 'non-regression.json'),
    qualityComparison: path.join(inputDir, 'quality-comparison.json'),
    registryCandidate: path.join(inputDir, 'registry-candidate.json'),
  };

  docs.nonRegression.reportPath = rel(reportPaths.nonRegression, context.workspaceRoot);
  docs.qualityComparison.reportPath = rel(reportPaths.qualityComparison, context.workspaceRoot);
  docs.registryCandidate.reportPath = rel(reportPaths.registryCandidate, context.workspaceRoot);

  writeJson(reportPaths.hashDiff, docs.hashDiff);
  writeJson(reportPaths.nonRegression, docs.nonRegression);
  writeJson(reportPaths.qualityComparison, docs.qualityComparison);
  writeJson(reportPaths.registryCandidate, docs.registryCandidate);

  return {
    atomId,
    fromVersion,
    toVersion,
    proposalId,
    reportPaths,
    documents: docs,
  };
}

function buildResultLabel(result) {
  return result && result.label ? result.label : 'unknown';
}

function runGenerator(opts) {
  const workspaceRoot = path.resolve(opts.cwd || ROOT);
  const artifactsRoot = path.resolve(ROOT, opts.artifactsRoot || DEFAULT_LIVE_ROLLOUT_ARTIFACT_ROOT);
  const runId = opts.runId || buildRunId();
  const runDir = path.join(artifactsRoot, runId);
  const forcedSourceEntrypoint = path.resolve(ROOT, '..', 'AI-Atomic-Framework', 'packages', 'cli', 'src', 'atm.ts');
  const upstreamPaths = resolveUpstreamPaths({
    projectRoot: ROOT,
    upstreamRepoRoot: opts.upstreamRepoRoot || '',
    upstreamCliEntrypoint: opts.upstreamCliEntrypoint || forcedSourceEntrypoint,
  });

  ensureDir(runDir);

  const targetFile = normalizeRelativePath(workspaceRoot, opts.targetFile || DEFAULT_LIVE_ROLLOUT_TARGET_FILE);
  const releaseBlockers = Array.from(new Set((opts.releaseBlockers || [DEFAULT_LIVE_ROLLOUT_RELEASE_BLOCKER]).map((value) => String(value || '').trim()).filter(Boolean)));
  const goal = String(opts.goal || `H2U live rollout rehearsal for ${path.basename(targetFile)}`).trim();
  const actor = String(opts.actor || 'H2U live rollout generator').trim() || 'H2U live rollout generator';

  const artifactPaths = {
    orient: path.join(runDir, 'orient.json'),
    start: path.join(runDir, 'start.json'),
    next: path.join(runDir, 'next.json'),
    upgrade: path.join(runDir, 'upgrade.json'),
    sessionSnapshot: path.join(runDir, 'session-snapshot.json'),
    proposal: path.join(runDir, 'proposal.json'),
    reviewStub: path.join(runDir, 'review.stub.json'),
    rollbackProofStub: path.join(runDir, 'rollback-proof.stub.json'),
    manifest: path.join(runDir, 'run.manifest.json'),
  };

  const commandResults = [];
  const orientResult = makeCommandRecord('orient', 'orient', ['--cwd', workspaceRoot, '--json'], upstreamPaths.upstreamCliEntrypoint, upstreamPaths.upstreamRepoRoot, workspaceRoot);
  writeJson(artifactPaths.orient, orientResult);
  commandResults.push(orientResult);
  if (!orientResult.passed) {
    return finalizeFailure({ runId, runDir, artifactsRoot, workspaceRoot, targetFile, goal, actor, releaseBlockers, upstreamPaths, artifactPaths, commandResults, failureStage: 'orient', failureResult: orientResult });
  }

  const startResult = makeCommandRecord('start', 'start', [
    '--cwd', workspaceRoot,
    '--goal', goal,
    '--actor', actor,
    '--target-file', targetFile,
    '--release-blocker', releaseBlockers.join(','),
    '--legacy-flow',
    '--shadow',
    '--json',
  ], upstreamPaths.upstreamCliEntrypoint, upstreamPaths.upstreamRepoRoot, workspaceRoot);
  writeJson(artifactPaths.start, startResult);
  commandResults.push(startResult);
  if (!startResult.passed) {
    return finalizeFailure({ runId, runDir, artifactsRoot, workspaceRoot, targetFile, goal, actor, releaseBlockers, upstreamPaths, artifactPaths, commandResults, failureStage: 'start', failureResult: startResult });
  }

  const startEvidence = startResult.parsed && startResult.parsed.evidence ? startResult.parsed.evidence : null;
  if (!startEvidence || !startEvidence.sessionId || !startEvidence.legacyRoutePlan || !startEvidence.guidancePacket) {
    return finalizeFailure({
      runId,
      runDir,
      artifactsRoot,
      workspaceRoot,
      targetFile,
      goal,
      actor,
      releaseBlockers,
      upstreamPaths,
      artifactPaths,
      commandResults,
      failureStage: 'start-evidence',
      failureResult: {
        label: 'start',
        passed: false,
        error: 'missing session evidence or legacy route plan',
      },
    });
  }

  const nextResult = makeCommandRecord('next', 'next', ['--cwd', workspaceRoot, '--json'], upstreamPaths.upstreamCliEntrypoint, upstreamPaths.upstreamRepoRoot, workspaceRoot);
  writeJson(artifactPaths.next, nextResult);
  commandResults.push(nextResult);
  if (!nextResult.passed) {
    return finalizeFailure({ runId, runDir, artifactsRoot, workspaceRoot, targetFile, goal, actor, releaseBlockers, upstreamPaths, artifactPaths, commandResults, failureStage: 'next', failureResult: nextResult });
  }

  const nextAction = nextResult.parsed && nextResult.parsed.evidence ? nextResult.parsed.evidence.nextAction : null;
  if (!nextAction || nextAction.status !== 'action' || typeof nextAction.command !== 'string') {
    return finalizeFailure({
      runId,
      runDir,
      artifactsRoot,
      workspaceRoot,
      targetFile,
      goal,
      actor,
      releaseBlockers,
      upstreamPaths,
      artifactPaths,
      commandResults,
      failureStage: 'next-action',
      failureResult: {
        label: 'next',
        passed: false,
        error: 'next did not produce a single executable action',
      },
    });
  }

  const selection = selectLeafTarget(startEvidence.legacyRoutePlan, nextAction);
  if (!selection) {
    return finalizeFailure({
      runId,
      runDir,
      artifactsRoot,
      workspaceRoot,
      targetFile,
      goal,
      actor,
      releaseBlockers,
      upstreamPaths,
      artifactPaths,
      commandResults,
      failureStage: 'leaf-selection',
      failureResult: {
        label: 'next',
        passed: false,
        error: 'unable to resolve a safe leaf target',
      },
    });
  }

  const syntheticInputs = buildSyntheticInputDocs({
    runId,
    runDir,
    workspaceRoot,
    targetFile,
    goal,
    actor,
    sessionId: startEvidence.sessionId,
    selection,
  });

  const upgradeCommandArgs = [
    '--cwd', workspaceRoot,
    '--propose',
    '--behavior', `behavior.${selection.behaviorName}`,
    '--atom', syntheticInputs.atomId,
    '--from', syntheticInputs.fromVersion,
    '--to', syntheticInputs.toVersion,
    '--proposal-id', syntheticInputs.proposalId,
    '--proposed-by', actor,
    '--proposed-at', new Date().toISOString(),
    '--dry-run',
    '--input', rel(syntheticInputs.reportPaths.hashDiff, workspaceRoot),
    '--input', rel(syntheticInputs.reportPaths.nonRegression, workspaceRoot),
    '--input', rel(syntheticInputs.reportPaths.qualityComparison, workspaceRoot),
    '--input', rel(syntheticInputs.reportPaths.registryCandidate, workspaceRoot),
    '--json',
  ];
  const upgradeResult = makeCommandRecord('upgrade', 'upgrade', upgradeCommandArgs, upstreamPaths.upstreamCliEntrypoint, upstreamPaths.upstreamRepoRoot, workspaceRoot);
  writeJson(artifactPaths.upgrade, upgradeResult);
  commandResults.push(upgradeResult);
  if (!upgradeResult.passed) {
    return finalizeFailure({ runId, runDir, artifactsRoot, workspaceRoot, targetFile, goal, actor, releaseBlockers, upstreamPaths, artifactPaths, commandResults, failureStage: 'upgrade', failureResult: upgradeResult });
  }

  const upgradeEvidence = upgradeResult.parsed && upgradeResult.parsed.evidence ? upgradeResult.parsed.evidence : null;
  if (!upgradeEvidence || !upgradeEvidence.proposal || upgradeEvidence.dryRun !== true) {
    return finalizeFailure({
      runId,
      runDir,
      artifactsRoot,
      workspaceRoot,
      targetFile,
      goal,
      actor,
      releaseBlockers,
      upstreamPaths,
      artifactPaths,
      commandResults,
      failureStage: 'upgrade-evidence',
      failureResult: {
        label: 'upgrade',
        passed: false,
        error: 'upgrade did not return a dry-run proposal',
      },
    });
  }

  const sessionSnapshot = {
    schemaId: 'legacy-h2u-live-rollout.sessionSnapshot',
    specVersion: '0.1.0',
    runId,
    workspaceRoot,
    targetFile,
    goal,
    actor,
    releaseBlockers,
    upstreamRepoRoot: rel(upstreamPaths.upstreamRepoRoot, ROOT),
    upstreamCliEntrypoint: rel(upstreamPaths.upstreamCliEntrypoint, ROOT),
    sessionId: startEvidence.sessionId,
    orientation: startEvidence.session.orientation,
    routeDecision: startEvidence.session.routeDecision,
    guidancePacket: startEvidence.session.packet,
    legacyRoutePlan: startEvidence.legacyRoutePlan,
    nextAction: nextAction,
    leafSelection: selection,
    firstWinReportPath: rel(path.resolve(ROOT, opts.firstWinReport || DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT), ROOT),
    generatedAt: new Date().toISOString(),
  };

  const proposal = {
    schemaId: 'legacy-h2u-live-rollout.proposal',
    specVersion: '0.1.0',
    runId,
    proposalId: upgradeEvidence.proposalId || syntheticInputs.proposalId,
    dryRun: upgradeEvidence.dryRun === true,
    status: upgradeEvidence.status,
    behaviorId: upgradeEvidence.behaviorId,
    target: upgradeEvidence.target,
    atomId: upgradeEvidence.proposal && upgradeEvidence.proposal.atomId ? upgradeEvidence.proposal.atomId : syntheticInputs.atomId,
    fromVersion: syntheticInputs.fromVersion,
    toVersion: syntheticInputs.toVersion,
    selectedLeaf: selection.symbolName,
    selectedBehavior: selection.behaviorName,
    legacyTarget: selection.legacyTarget,
    recommendedNextCommand: nextAction.command,
    executedUpgradeCommand: upgradeResult.command,
    inputCount: upgradeEvidence.inputCount,
    inputKinds: Array.isArray(upgradeEvidence.inputKinds) ? upgradeEvidence.inputKinds : [],
    blockedGateNames: Array.isArray(upgradeEvidence.blockedGateNames) ? upgradeEvidence.blockedGateNames : [],
    proposal: upgradeEvidence.proposal,
    generatedAt: new Date().toISOString(),
  };

  const reviewStub = {
    schemaId: 'legacy-h2u-live-rollout.reviewStub',
    specVersion: '0.1.0',
    runId,
    proposalId: proposal.proposalId,
    sessionId: startEvidence.sessionId,
    targetFile,
    legacyTarget: selection.legacyTarget,
    selectedLeaf: selection.symbolName,
    selectedBehavior: selection.behaviorName,
    reviewState: 'pending-human-review',
    dryRun: true,
    checklist: [
      'guidance session exists',
      'leaf selection resolved',
      'dry-run proposal generated',
      'rollback proof stub generated',
    ],
    recordedNextCommand: nextAction.command,
    createdAt: new Date().toISOString(),
  };

  const rollbackProofStub = {
    schemaId: 'legacy-h2u-live-rollout.rollbackProofStub',
    specVersion: '0.1.0',
    runId,
    proposalId: proposal.proposalId,
    sessionId: startEvidence.sessionId,
    targetFile,
    legacyTarget: selection.legacyTarget,
    selectedLeaf: selection.symbolName,
    selectedBehavior: selection.behaviorName,
    dryRun: true,
    safeToReplay: true,
    replayCommands: [
      orientResult.command,
      startResult.command,
      nextResult.command,
      upgradeResult.command,
    ],
    rollbackSteps: [
      `Delete artifacts/legacy-h2u-live-rollout/${runId}`,
      'Restore the preflight baseline snapshot and rerun the validators.',
      'Reissue validate-legacy-h2u-first-win if the rollout must be replayed.',
    ],
    createdAt: new Date().toISOString(),
  };

  writeJson(artifactPaths.sessionSnapshot, sessionSnapshot);
  writeJson(artifactPaths.proposal, proposal);
  writeJson(artifactPaths.reviewStub, reviewStub);
  writeJson(artifactPaths.rollbackProofStub, rollbackProofStub);

  const manifest = {
    schemaId: 'legacy-h2u-live-rollout.runManifest',
    specVersion: '0.1.0',
    runId,
    workspaceRoot,
    targetFile,
    goal,
    actor,
    releaseBlockers,
    firstWinReportPath: rel(path.resolve(ROOT, opts.firstWinReport || DEFAULT_LIVE_ROLLOUT_FIRST_WIN_REPORT), ROOT),
    upstreamRepoRoot: rel(upstreamPaths.upstreamRepoRoot, ROOT),
    upstreamCliEntrypoint: rel(upstreamPaths.upstreamCliEntrypoint, ROOT),
    sessionId: startEvidence.sessionId,
    nextAction: {
      status: nextAction.status,
      command: nextAction.command,
      selectedSegment: nextAction.selectedSegment || null,
      selectedBehavior: nextAction.selectedBehavior || null,
      legacyTarget: nextAction.legacyTarget || null,
      allowedCommands: Array.isArray(nextAction.allowedCommands) ? nextAction.allowedCommands : [],
      blockedCommands: Array.isArray(nextAction.blockedCommands) ? nextAction.blockedCommands : [],
      missingEvidence: Array.isArray(nextAction.missingEvidence) ? nextAction.missingEvidence : [],
    },
    leafSelection: selection,
    commands: commandResults.map((result) => ({
      label: buildResultLabel(result),
      command: result.command,
      status: result.status,
      passed: result.passed,
      durationMs: result.durationMs,
      error: result.error,
    })),
    artifactPaths: Object.fromEntries(Object.entries(artifactPaths).map(([key, filePath]) => [key, rel(filePath, ROOT)])),
    syntheticInputPaths: Object.fromEntries(Object.entries(syntheticInputs.reportPaths).map(([key, filePath]) => [key, rel(filePath, ROOT)])),
    recommendedNextCommand: nextAction.command,
    executedUpgradeCommand: upgradeResult.command,
    dryRun: true,
    passed: true,
    generatedAt: new Date().toISOString(),
  };
  writeJson(artifactPaths.manifest, manifest);

  const finalReport = {
    passed: true,
    runId,
    runDir: rel(runDir, ROOT),
    targetFile,
    goal,
    actor,
    leafSelection: selection,
    sessionId: startEvidence.sessionId,
    recommendedNextCommand: nextAction.command,
    executedUpgradeCommand: upgradeResult.command,
    proposalId: proposal.proposalId,
    artifactPaths: manifest.artifactPaths,
    generatedAt: manifest.generatedAt,
  };

  return finalizeSuccess({
    report: finalReport,
    reportPath: opts.report ? path.resolve(ROOT, opts.report) : '',
  });
}

function finalizeFailure(context) {
  const report = {
    passed: false,
    runId: context.runId,
    runDir: rel(context.runDir, ROOT),
    targetFile: context.targetFile,
    goal: context.goal,
    actor: context.actor,
    releaseBlockers: context.releaseBlockers,
    failureStage: context.failureStage,
    failureCommand: context.failureResult && context.failureResult.command ? context.failureResult.command : '',
    failureStatus: context.failureResult && typeof context.failureResult.status === 'number' ? context.failureResult.status : 1,
    failureError: context.failureResult && context.failureResult.error ? context.failureResult.error : '',
    commands: context.commandResults.map((result) => ({
      label: buildResultLabel(result),
      command: result.command,
      status: result.status,
      passed: result.passed,
      durationMs: result.durationMs,
      error: result.error,
    })),
    artifactPaths: Object.fromEntries(Object.entries(context.artifactPaths).map(([key, filePath]) => [key, rel(filePath, ROOT)])),
    upstreamRepoRoot: rel(context.upstreamPaths.upstreamRepoRoot, ROOT),
    upstreamCliEntrypoint: rel(context.upstreamPaths.upstreamCliEntrypoint, ROOT),
    generatedAt: new Date().toISOString(),
  };
  const manifest = {
    schemaId: 'legacy-h2u-live-rollout.runManifest',
    specVersion: '0.1.0',
    runId: context.runId,
    workspaceRoot: context.workspaceRoot,
    targetFile: context.targetFile,
    goal: context.goal,
    actor: context.actor,
    releaseBlockers: context.releaseBlockers,
    upstreamRepoRoot: rel(context.upstreamPaths.upstreamRepoRoot, ROOT),
    upstreamCliEntrypoint: rel(context.upstreamPaths.upstreamCliEntrypoint, ROOT),
    failed: true,
    failureStage: context.failureStage,
    failureError: report.failureError,
    commands: report.commands,
    artifactPaths: report.artifactPaths,
    passed: false,
    generatedAt: report.generatedAt,
  };
  writeJson(context.artifactPaths.manifest, manifest);
  return finalizeSuccess({ report, reportPath: context.reportPath || '' });
}

function finalizeSuccess(context) {
  if (context.reportPath) {
    writeJson(context.reportPath, context.report);
  }
  return context.report;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const report = runGenerator(opts);
  if (opts.report && path.resolve(ROOT, opts.report) !== path.resolve(ROOT, opts.report)) {
    writeJson(path.resolve(ROOT, opts.report), report);
  } else if (opts.report) {
    writeJson(path.resolve(ROOT, opts.report), report);
  }

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(`run=${report.runId} passed=${report.passed ? 'yes' : 'no'} leaf=${report.leafSelection ? report.leafSelection.symbolName : ''}`);
  }

  if (!report.passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[run-h2u-guided-leaf-rollout] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runGenerator,
  selectLeafTarget,
  buildSyntheticInputDocs,
  main,
};