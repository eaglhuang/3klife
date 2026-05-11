#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const firstWin = require('../validate-legacy-h2u-first-win');

const ROOT = path.resolve(__dirname, '..', '..');
const TEMP_ROOT = path.join(ROOT, 'temp', 'legacy-h2u-first-win-regression');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resetTempRoot() {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
}

function cleanupTempRoot() {
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildDefaultOpts(baseOut) {
  return {
    strict: true,
    report: null,
    baseOut,
    screenId: 'legacy-h2u-dryrun',
    sourceDir: 'Design System 3',
    mainHtml: 'ui_kits/gacha/index.html',
    bundle: 'lobby_ui',
    allowDirtyPrefixes: [],
    requireWorktreeCheck: false,
    help: false,
  };
}

async function testRoundRejectsStaleArtifactsOnCommandFailure() {
  resetTempRoot();

  const opts = buildDefaultOpts(path.join(TEMP_ROOT, 'out'));
  const staleRoundDir = path.join(opts.baseOut, 'round-a');
  const staleWorkflowDir = path.join(staleRoundDir, 'workflow');
  const staleLaunchReport = path.join(staleRoundDir, 'launch.report.json');
  const staleWorkflowSummary = path.join(staleWorkflowDir, `${opts.screenId}.workflow-summary.json`);
  const staleRuleGuardReport = path.join(staleRoundDir, 'rule-guard.summary.report.json');
  const staleMarker = path.join(staleRoundDir, 'STALE.txt');

  writeJson(staleLaunchReport, { passed: true, checks: [] });
  writeJson(staleWorkflowSummary, {
    interactionRuntime: {
      required: true,
      status: 'pass',
      actionsDeclared: 4,
      actionsBound: 4,
    },
    nextFixes: [{ ruleId: 'H2U-P0-001' }],
  });
  writeJson(staleRuleGuardReport, { blockerCount: 0 });
  fs.writeFileSync(staleMarker, 'stale', 'utf8');

  const originalSpawnSync = cp.spawnSync;
  cp.spawnSync = () => ({
    status: 1,
    stdout: '',
    stderr: 'forced-failure',
    error: { message: 'forced-failure' },
  });

  try {
    const round = await firstWin.runRound('round-a', opts);
    assert(round.passed === false, 'round should fail when child commands fail');
    assert(round.commandFailureCount === 3, 'all three commands should be counted as failures');
    assert(round.launchPassed === false, 'launch should be treated as failed');
    assert(round.summaryRuleGuardPassed === false, 'summary rule-guard should be treated as failed');
    assert(round.workflowArtifactsReady === false, 'workflow artifacts should require successful command exit');
    assert(round.key && round.key.atmSummary === null, 'stale launch report must not be reused');
    assert(fs.existsSync(staleMarker) === false, 'round directory should be reset before each run');

    const manifestPath = path.join(opts.baseOut, 'round-a', 'evidence.manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
    assert(manifest.commandFailureCount === 3, 'manifest should include commandFailureCount');
    assert(Array.isArray(manifest.commandSummary), 'manifest should include command summary rows');
  } finally {
    cp.spawnSync = originalSpawnSync;
    cleanupTempRoot();
  }
}

async function main() {
  await testRoundRejectsStaleArtifactsOnCommandFailure();
  console.log('legacy h2u first-win regression tests passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
