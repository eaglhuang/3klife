#!/usr/bin/env node
'use strict';

const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const atmFlow = require('../atm-flow');

const DEFAULT_H2U_STATUS_FILE = 'artifacts/legacy-h2u-first-win/worktree-status.txt';
const DEFAULT_H2U_ALLOW_DIRTY_PREFIXES = [
  'assets/resources/ui-spec/screens/legacy-h2u-dryrun.local-tokens.json',
  'assets/resources/ui-spec/screens/legacy-h2u-dryrun.readiness.json',
  'assets/resources/ui-spec/screens/legacy-h2u-dryrun.runtime-version.json',
];

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

function withMockAtomize(mockExports, fn) {
  const modulePath = require.resolve('../atm-atomize');
  const moduleExports = require(modulePath);
  const backup = {
    runScan: moduleExports.runScan,
    runScaffold: moduleExports.runScaffold,
    runValidate: moduleExports.runValidate,
    runDemandPolice: moduleExports.runDemandPolice,
  };
  Object.assign(moduleExports, mockExports || {});
  try {
    return fn();
  } finally {
    Object.assign(moduleExports, backup);
  }
}

function successRun() {
  return {
    status: 0,
    stdout: '',
    stderr: '',
    error: null,
  };
}

function testClassifyTouchedAreas() {
  const areas = atmFlow.classifyTouchedAreas([
    'docs/tasks/tasks-atm/tasks-atm-part-1.json',
    'docs/agent-briefs/tasks/ATM/ATM-9-0001.md',
    'tools_node/run-html-to-ucuf-workflow.js',
  ]);

  assert(areas.touchesTaskStore === true, 'task-store path should be detected');
  assert(areas.touchesDocsTask === true, 'docs path should be detected');
  assert(areas.touchesH2U === true, 'h2u workflow path should be detected');
}

function testBuildExecutionPlan() {
  const devPlan = atmFlow.buildExecutionPlan('dev', {
    touchesTaskStore: true,
    touchesDocsTask: false,
    touchesH2U: true,
  });
  const devIds = devPlan.filter((item) => item.condition).map((item) => item.id);
  assert(devIds.includes('compute-gate-quick'), 'dev must include quick gate');
  assert(devIds.includes('validate-h2u-rule-guard'), 'dev h2u branch should run rule guard');
  assert(devIds.includes('validate-atm-task-store'), 'dev should run task-store check when touched');
  assert(!devIds.includes('validate-legacy-h2u-first-win'), 'dev should not run first-win');

  const releasePlan = atmFlow.buildExecutionPlan('release', {
    touchesTaskStore: false,
    touchesDocsTask: false,
    touchesH2U: true,
  });
  const releaseIds = releasePlan.filter((item) => item.condition).map((item) => item.id);
  assert(releaseIds.includes('validate-legacy-h2u-launch'), 'release should include h2u launch strict');
  assert(releaseIds.includes('validate-legacy-h2u-first-win'), 'release should include h2u first-win strict');
}

function testRunFlowRoutesPrAndRelease() {
  const commands = [];
  withMockSpawn((cmd, args) => {
    const joined = [cmd, ...(args || [])].join(' ');
    commands.push(joined);
    return successRun();
  }, () => {
    const prReport = atmFlow.runFlow({
      mode: 'pr',
      fromMode: 'dev',
      files: ['tools_node/run-html-to-ucuf-workflow.js'],
      worktreeStatusFile: '',
      allowDirtyPrefixes: [],
      shadow: false,
      metricsFile: '',
      report: '',
      json: true,
      help: false,
    });
    assert(prReport.passed === true, 'pr report should pass with mocked success');
    const prStepIds = prReport.steps.filter((step) => !step.skipped).map((step) => step.id);
    assert(prStepIds.includes('validate-legacy-h2u-launch'), 'pr should run h2u launch strict');
    assert(!prStepIds.includes('validate-legacy-h2u-first-win'), 'pr should not run first-win');

    const releaseReport = atmFlow.runFlow({
      mode: 'release',
      fromMode: 'pr',
      files: ['tools_node/run-html-to-ucuf-workflow.js'],
      worktreeStatusFile: '',
      allowDirtyPrefixes: [],
      shadow: false,
      metricsFile: '',
      report: '',
      json: true,
      help: false,
    });
    assert(releaseReport.passed === true, 'release report should pass with mocked success');
    const releaseStepIds = releaseReport.steps.filter((step) => !step.skipped).map((step) => step.id);
    assert(releaseStepIds.includes('validate-legacy-h2u-launch'), 'release should run h2u launch strict');
    assert(releaseStepIds.includes('validate-legacy-h2u-first-win'), 'release should run h2u first-win strict');

    const releaseCloseoutCommand = commands.find((item) => item.includes('validate-atm-stability-closeout.js')) || '';
    assert(releaseCloseoutCommand.includes('--include-h2u-live-rollout'), 'release closeout should include h2u live-rollout gate');
    assert(releaseCloseoutCommand.includes(`--worktree-status-file ${DEFAULT_H2U_STATUS_FILE}`), 'release closeout should include default status-file');
    for (const prefix of DEFAULT_H2U_ALLOW_DIRTY_PREFIXES) {
      assert(releaseCloseoutCommand.includes(`--allow-dirty-prefix ${prefix}`), `release closeout should include default allow-dirty prefix: ${prefix}`);
    }
  });

  assert(commands.some((item) => item.includes('validate-legacy-h2u-launch.js')), 'mock should execute h2u launch command');
  assert(commands.some((item) => item.includes('validate-legacy-h2u-first-win.js')), 'mock should execute h2u first-win command');
}

function testRunFlowInjectsDefaultH2uWorktreeArgs() {
  const commands = [];
  const report = withMockSpawn((cmd, args) => {
    commands.push([cmd, ...(args || [])].join(' '));
    return successRun();
  }, () => atmFlow.runFlow({
    mode: 'pr',
    fromMode: 'dev',
    files: ['tools_node/run-html-to-ucuf-workflow.js'],
    worktreeStatusFile: '',
    allowDirtyPrefixes: [],
    shadow: false,
    metricsFile: '',
    report: '',
    json: true,
    help: false,
  }));

  assert(report.passed === true, 'pr report should pass with default h2u gate args');
  assert(report.h2uWorktreeGate && report.h2uWorktreeGate.enabled === true, 'h2u worktree gate should be enabled');
  assert(report.h2uWorktreeGate.worktreeStatusFile === DEFAULT_H2U_STATUS_FILE, 'should default status-file path for h2u gate');

  const launchCommand = commands.find((item) => item.includes('validate-legacy-h2u-launch.js')) || '';
  assert(launchCommand.includes(`--worktree-status-file ${DEFAULT_H2U_STATUS_FILE}`), 'launch command should include default status-file');
  for (const prefix of DEFAULT_H2U_ALLOW_DIRTY_PREFIXES) {
    assert(launchCommand.includes(`--allow-dirty-prefix ${prefix}`), `launch command should include default allow-dirty prefix: ${prefix}`);
  }

}

function testRunFlowDetectFailureForPrWhenGitUnavailable() {
  const report = withMockSpawn((cmd, args) => {
    const joined = [cmd, ...(args || [])].join(' ');
    if (joined.includes('git status --short')) {
      return {
        status: null,
        stdout: '',
        stderr: '',
        error: { message: 'spawnSync git EPERM' },
      };
    }
    return successRun();
  }, () => atmFlow.runFlow({
    mode: 'pr',
    fromMode: '',
    files: [],
    worktreeStatusFile: '',
    allowDirtyPrefixes: [],
    shadow: false,
    metricsFile: '',
    report: '',
    json: true,
    help: false,
  }));

  assert(report.passed === false, 'pr should fail when changed-file detection is unavailable');
  assert(report.precheck && report.precheck.id === 'changed-file-detection', 'should block on changed-file detection precheck');
}

function testShadowModeDoesNotBlockExitSemantic() {
  const report = withMockSpawn(() => ({
    status: 1,
    stdout: '',
    stderr: 'forced fail',
    error: null,
  }), () => atmFlow.runFlow({
    mode: 'dev',
    fromMode: '',
    files: ['tools_node/atm-flow.js'],
    worktreeStatusFile: '',
    allowDirtyPrefixes: [],
    shadow: true,
    metricsFile: '',
    report: '',
    json: true,
    help: false,
  }));

  assert(report.passed === false, 'shadow test should keep real failure state');
  assert(report.enforcedPassed === true, 'shadow mode should not hard-block process exit');
}

function testAtomizeAdvisorTriggersOnLargeFileWithConsent() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atm-flow-atomize-'));
  const tempFile = path.join(tempDir, 'oversize.js');
  const lines = ['function oversize() {'];
  for (let index = 0; index < 410; index += 1) {
    lines.push(`  const value${index} = ${index};`);
  }
  lines.push('  return 1;');
  lines.push('}');
  lines.push('module.exports = { oversize };');
  fs.writeFileSync(tempFile, `${lines.join('\n')}\n`, 'utf8');

  const report = withMockAtomize({
    runScan: () => ({
      thresholds: { functionLinesBlockRelease: 250 },
      candidateCount: 1,
      candidates: [
        {
          symbolName: 'oversize',
          file: 'tmp/oversize.js',
          lineCount: 410,
          sourceRange: { startLine: 1, endLine: 410 },
          severity: 'block-release',
          tier: 'local-capsule',
          recommendedTier: 'local-capsule',
        },
      ],
    }),
    runScaffold: () => ({
      created: [{ symbolName: 'oversize', capsuleDir: 'atomic_workbench/capsules/oversize' }],
      createdAnchors: [{ anchorId: 'H2U-ANCHOR-OVERSIZE' }],
    }),
    runValidate: () => ({ passed: true, failed: 0 }),
    runDemandPolice: () => ({ passed: true, findings: [] }),
  }, () => atmFlow.runFlow({
    mode: 'dev',
    fromMode: '',
    files: [tempFile],
    worktreeStatusFile: '',
    allowDirtyPrefixes: [],
    atomizeConsent: 'yes',
    shadow: true,
    metricsFile: '',
    report: '',
    json: true,
    help: false,
  }));

  assert(report.atomizationAdvisor && report.atomizationAdvisor.enabled === true, 'atomization advisor should run in dev mode');
  assert(report.atomizationAdvisor.status === 'triggered' || report.atomizationAdvisor.status === 'triggered-with-issues', 'advisor should trigger on oversize file');
  assert(report.atomizationAdvisor.probe && Array.isArray(report.atomizationAdvisor.probe.oversizedFiles), 'advisor should record oversized files');
  assert(report.atomizationAdvisor.probe.oversizedFiles.some((item) => Number(item.lineCount || 0) > 400), 'oversized file rule (>400 lines) should trigger');
  assert(report.atomizationAdvisor.pipeline && report.atomizationAdvisor.pipeline.summary, 'advisor pipeline summary should exist');
  assert(Number(report.atomizationAdvisor.pipeline.summary.createdCapsules || 0) >= 1, 'summary should include created capsule count');
  assert(Number(report.atomizationAdvisor.pipeline.summary.createdAnchors || 0) >= 1, 'summary should include created anchor count');
  assert(report.atomizationAdvisor.pipeline.summary.sourceSize && typeof report.atomizationAdvisor.pipeline.summary.sourceSize.totalDeltaLines === 'number', 'summary should include source-size delta');
}

function testAtomizeAdvisorNoPromptInJsonMode() {
  const report = atmFlow.runFlow({
    mode: 'dev',
    fromMode: '',
    files: ['tools_node/run-html-to-ucuf-workflow.js'],
    worktreeStatusFile: '',
    allowDirtyPrefixes: [],
    atomizeConsent: 'ask',
    shadow: true,
    metricsFile: '',
    report: '',
    json: true,
    help: false,
  });

  assert(report.atomizationAdvisor && report.atomizationAdvisor.enabled === false, 'json mode should disable interactive advisor');
  assert(report.atomizationAdvisor.status === 'disabled-non-interactive', 'json mode should not prompt');
}

function main() {
  testClassifyTouchedAreas();
  testBuildExecutionPlan();
  testRunFlowRoutesPrAndRelease();
  testRunFlowInjectsDefaultH2uWorktreeArgs();
  testRunFlowDetectFailureForPrWhenGitUnavailable();
  testShadowModeDoesNotBlockExitSemantic();
  testAtomizeAdvisorTriggersOnLargeFileWithConsent();
  testAtomizeAdvisorNoPromptInJsonMode();
  console.log('atm-flow tests passed');
}

main();
