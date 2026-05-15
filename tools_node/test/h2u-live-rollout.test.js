#!/usr/bin/env node
'use strict';

const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const generator = require('../run-h2u-guided-leaf-rollout');
const validator = require('../validate-legacy-h2u-live-rollout');

const ROOT = path.resolve(__dirname, '..', '..');
const TARGET_FILE = 'tools_node/lib/dom-to-ui/draft-builder-core.js';
const LEAF_TARGET = `${TARGET_FILE}#resolveLength`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function withMockSpawn(mockImpl, fn) {
  const original = cp.spawnSync;
  cp.spawnSync = mockImpl;
  try {
    return fn();
  } finally {
    cp.spawnSync = original;
  }
}

function successRun(stdout) {
  return {
    status: 0,
    stdout,
    stderr: '',
    error: null,
  };
}

function buildJsonOutput(command, cwd, evidence) {
  return JSON.stringify({
    ok: true,
    command,
    cwd,
    messages: [],
    evidence,
  });
}

function createOrientationEvidence() {
  return {
    schemaId: 'atm.projectOrientationReport',
    specVersion: '0.1.0',
    repositoryRoot: ROOT,
    detectedLanguages: ['TypeScript'],
    packageManager: 'npm',
    testEntrypoints: ['tools_node/test/h2u-live-rollout.test.js'],
    governanceFiles: [],
    adapterStatus: { status: 'available', reason: 'fixture' },
    availableAdapters: ['fixture'],
    registryState: { status: 'present', paths: [] },
    mapState: { status: 'present', paths: [] },
    atomState: { status: 'present', paths: [] },
    legacyUriSupport: { supported: true, scheme: 'legacy', resolver: 'fixture' },
    hostGates: [],
    noTouchZones: [{ path: `${TARGET_FILE}#processElement`, reason: 'release blocker', scope: 'file' }],
    mutationPolicy: {
      requireSession: true,
      requireDryRunProposal: true,
      requireReviewBeforeApply: true,
      allowUnguidedInDev: true,
      allowUnguidedInCI: false,
    },
    legacyHotspots: [],
    configLegacyHotspots: [],
    releaseBlockers: ['processElement'],
    unknowns: [],
  };
}

function createLegacyRoutePlan() {
  return {
    schemaId: 'atm.legacyRoutePlan',
    specVersion: '0.1.0',
    targetFile: TARGET_FILE,
    segments: [
      {
        symbolName: 'processElement',
        role: 'trunk',
        riskLevel: 'high',
        fanOut: 6,
        callerDemand: 0,
        existingAtomMatch: null,
        recommendedBehavior: 'leave-in-place',
      },
      {
        symbolName: 'resolveLength',
        role: 'leaf',
        riskLevel: 'low',
        fanOut: 1,
        callerDemand: 0,
        existingAtomMatch: null,
        recommendedBehavior: 'atomize',
      },
      {
        symbolName: 'parseFragmentList',
        role: 'leaf',
        riskLevel: 'low',
        fanOut: 1,
        callerDemand: 0,
        existingAtomMatch: null,
        recommendedBehavior: 'split',
      },
    ],
    trunkFunctions: ['processElement'],
    leafFunctions: ['resolveLength', 'parseFragmentList'],
    adapterBoundaries: [],
    existingAtomMatches: [],
    releaseBlockers: ['processElement'],
    safeFirstAtoms: ['resolveLength', 'parseFragmentList'],
    noTouchZones: [`${TARGET_FILE}#processElement`],
    requiredDryRunProposal: true,
  };
}

function createStartEvidence(sessionId, goal) {
  const orientation = createOrientationEvidence();
  const legacyRoutePlan = createLegacyRoutePlan();
  const routeDecision = {
    schemaId: 'atm.guidanceRouteDecision',
    specVersion: '0.1.0',
    recommendedRoute: 'atomize',
    confidence: 0.92,
    reasons: ['fixture guidance'],
    routeChoices: [],
    requiredEvidence: [],
    blockedBy: [],
    nextCommand: 'node atm.mjs next --cwd . --json',
  };
  const packet = {
    schemaId: 'atm.guidancePacket',
    specVersion: '0.1.0',
    sessionId,
    readFirst: ['README.md'],
    doNotTouch: [`${TARGET_FILE}#processElement`],
    nextCommand: 'node atm.mjs next --cwd . --json',
    allowedCommands: ['node atm.mjs next --cwd . --json'],
    blockedCommands: ['host mutation without active guidance session'],
    requiredGates: [],
    missingEvidence: [],
    rollbackHint: 'fixture rollback',
    whyThisRoute: ['fixture guidance'],
  };

  return {
    sessionId,
    routeDecision,
    guidancePacket: packet,
    legacyRoutePlan,
    shadowMode: true,
    effectiveLegacyFlow: 'shadow',
    session: {
      schemaId: 'atm.guidanceSession',
      specVersion: '0.1.0',
      sessionId,
      repositoryRoot: ROOT,
      goal,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      actor: 'H2U live rollout generator',
      orientation,
      routeDecision,
      packet,
      legacyRoutePlan,
      shadowMode: true,
    },
  };
}

function createNextEvidence(sessionId) {
  const legacyTarget = LEAF_TARGET;
  return {
    nextAction: {
      status: 'action',
      command: `node atm.mjs upgrade --propose --behavior behavior.atomize --legacy-target "${legacyTarget}" --guidance-session "${sessionId}" --dry-run --json`,
      reason: 'fixture next action',
      allowedCommands: [
        'node atm.mjs next --cwd . --json',
        `node atm.mjs upgrade --propose --behavior behavior.atomize --legacy-target "${legacyTarget}" --guidance-session "${sessionId}" --dry-run --json`,
      ],
      blockedCommands: ['host mutation without active guidance session'],
      missingEvidence: [],
      selectedSegment: 'resolveLength',
      blockedSegments: ['processElement'],
      legacyTarget,
      targetFile: TARGET_FILE,
      selectedBehavior: 'atomize',
    },
    guidanceSession: {
      sessionId,
      goal: 'H2U live rollout leaf rehearsal',
      recommendedRoute: 'atomize',
      confidence: 0.92,
    },
  };
}

function createUpgradeEvidence(sessionId, proposalId) {
  return {
    proposal: {
      schemaId: 'atm.upgradeProposal',
      specVersion: '0.1.0',
      migration: {
        strategy: 'additive',
        fromVersion: '0.0.0',
        notes: 'fixture proposal',
      },
      proposalId,
      atomId: 'h2u-resolvelength',
      fromVersion: '0.0.0',
      toVersion: '0.0.1',
      lifecycleMode: 'evolution',
      behaviorId: 'behavior.atomize',
      target: { kind: 'atom' },
      decompositionDecision: 'atomize',
      reviewTemplate: 'review.template.atomize',
      automatedGates: {
        nonRegression: { passed: true, reportId: 'non-regression.fixture', reportPath: 'fixture', summary: 'pass (baseline fixtures passed)' },
        qualityComparison: { passed: true, reportId: 'quality-comparison.fixture', reportPath: 'fixture', summary: 'pass (quality metrics improved; map propagation passed)' },
        registryCandidate: { passed: true, reportId: 'registry-candidate.fixture', reportPath: 'fixture', summary: 'pass (candidate can promote)' },
        allPassed: true,
        blockedGateNames: [],
      },
      humanReview: 'pending',
      status: 'pending',
      inputs: [
        { kind: 'hash-diff', path: 'fixture/hash-diff.json', schemaId: 'atm.hashDiffReport', reportId: 'hash-diff.fixture', summary: 'hash-diff input' },
        { kind: 'non-regression', path: 'fixture/non-regression.json', schemaId: 'atm.police.nonRegressionReport', reportId: 'non-regression.fixture', summary: 'non-regression input' },
        { kind: 'quality-comparison', path: 'fixture/quality-comparison.json', schemaId: 'atm.police.qualityComparisonReport', reportId: 'quality-comparison.fixture', summary: 'quality-comparison input' },
        { kind: 'registry-candidate', path: 'fixture/registry-candidate.json', schemaId: 'atm.police.registryCandidateReport', reportId: 'registry-candidate.fixture', summary: 'registry-candidate input' },
      ],
      proposedBy: 'H2U live rollout generator',
      proposedAt: '2026-01-01T00:00:00.000Z',
    },
    proposalId,
    status: 'pending',
    blockedGateNames: [],
    contextBudget: {
      gate: null,
      decision: 'pass',
      estimatedTokens: 0,
      reportPath: null,
      summaryPath: null,
      continuationReportPath: null,
      contextSummaryPath: null,
      contextSummaryMarkdownPath: null,
      evidencePath: null,
    },
    dryRun: true,
    target: { kind: 'atom' },
    behaviorId: 'behavior.atomize',
    inputCount: 4,
    inputKinds: ['hash-diff', 'non-regression', 'quality-comparison', 'registry-candidate'],
  };
}

function testGeneratorAndValidator() {
  const tempRoot = fs.mkdtempSync(path.join(fs.realpathSync(path.join(ROOT, 'scratch')), 'h2u-live-rollout-test-'));
  const artifactsRoot = path.join(tempRoot, 'artifacts', 'legacy-h2u-live-rollout');
  const firstWinReport = path.join(tempRoot, 'artifacts', 'legacy-h2u-first-win', 'final-decision.json');
  fs.mkdirSync(path.dirname(firstWinReport), { recursive: true });
  fs.writeFileSync(firstWinReport, JSON.stringify({
    passed: true,
    finalDecision: 'GO',
    runId: 'first-win-fixture',
    summary: {
      failedRounds: [],
      hardFailRounds: [],
      gateFailRounds: [],
      blockers: [],
    },
  }, null, 2), 'utf8');

  const sessionId = 'session-fixture-1';
  const goal = 'H2U live rollout leaf rehearsal';
  const runId = 'fixture-run';
  const proposalId = `legacy-h2u-live-rollout.${runId}`;
  const commandLog = [];

  const report = withMockSpawn((cmd, args) => {
    const joined = [cmd, ...(args || [])].join(' ');
    commandLog.push(joined);
    const commandIndex = Array.isArray(args)
      ? args.findIndex((value) => ['orient', 'start', 'next', 'upgrade'].includes(value))
      : -1;
    const command = commandIndex >= 0 ? args[commandIndex] : '';
    const cwdIndex = Array.isArray(args) ? args.indexOf('--cwd') : -1;
    const cwd = cwdIndex >= 0 ? String(args[cwdIndex + 1] || ROOT) : ROOT;

    if (command === 'orient') {
      return successRun(buildJsonOutput('orient', cwd, {
        orientation: createOrientationEvidence(),
      }));
    }
    if (command === 'start') {
      return successRun(buildJsonOutput('start', cwd, createStartEvidence(sessionId, goal)));
    }
    if (command === 'next') {
      return successRun(buildJsonOutput('next', cwd, createNextEvidence(sessionId)));
    }
    if (command === 'upgrade') {
      return successRun(buildJsonOutput('upgrade', cwd, createUpgradeEvidence(sessionId, proposalId)));
    }

    return successRun(buildJsonOutput(command || 'unknown', cwd, {}));
  }, () => generator.runGenerator({
    cwd: ROOT,
    goal,
    targetFile: TARGET_FILE,
    releaseBlockers: ['processElement'],
    actor: 'H2U live rollout generator',
    runId,
    artifactsRoot,
    firstWinReport,
    json: true,
  }));

  assert(report.passed === true, 'generator report should pass');
  assert(report.runId === runId, 'generator should preserve requested run id');
  assert(report.leafSelection && report.leafSelection.symbolName === 'resolveLength', 'generator should choose resolveLength leaf');
  assert(report.recommendedNextCommand.includes('--legacy-target'), 'generator should preserve the recommended next command');
  assert(report.executedUpgradeCommand.includes('--dry-run'), 'generator should run upgrade as dry-run');

  const runDir = path.join(artifactsRoot, runId);
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, 'run.manifest.json'), 'utf8'));
  assert(manifest.passed === true, 'manifest should record a passing run');
  assert(manifest.leafSelection.symbolName === 'resolveLength', 'manifest should record selected leaf');
  assert(manifest.nextAction.command.includes('--guidance-session'), 'manifest should record the guidance next command');
  assert(fs.existsSync(path.join(runDir, 'proposal.json')), 'proposal artifact should exist');
  assert(fs.existsSync(path.join(runDir, 'review.stub.json')), 'review stub should exist');
  assert(fs.existsSync(path.join(runDir, 'rollback-proof.stub.json')), 'rollback proof stub should exist');
  assert(fs.existsSync(path.join(runDir, 'session-snapshot.json')), 'session snapshot should exist');

  const validation = validator.runValidation({
    artifactsRoot,
    runDir,
    firstWinReport,
  });

  assert(validation.passed === true, 'live rollout validator should pass');
  assert(validation.finalDecision === 'GO', 'live rollout validator should produce GO');
  assert(validation.summary.failedChecks.length === 0, 'live rollout validator should have no failed checks');
  assert(commandLog.some((line) => line.includes('orient')), 'orient command should be invoked');
  assert(commandLog.some((line) => line.includes('start')), 'start command should be invoked');
  assert(commandLog.some((line) => line.includes('next')), 'next command should be invoked');
  assert(commandLog.some((line) => line.includes('upgrade')), 'upgrade command should be invoked');

  fs.rmSync(tempRoot, { recursive: true, force: true });
}

testGeneratorAndValidator();

console.log('h2u live rollout tests passed');