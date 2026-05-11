#!/usr/bin/env node
'use strict';

const cp = require('node:child_process');
const path = require('node:path');

const atmFlow = require('../atm-flow');

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
  });

  assert(commands.some((item) => item.includes('validate-legacy-h2u-launch.js')), 'mock should execute h2u launch command');
  assert(commands.some((item) => item.includes('validate-legacy-h2u-first-win.js')), 'mock should execute h2u first-win command');
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

function main() {
  testClassifyTouchedAreas();
  testBuildExecutionPlan();
  testRunFlowRoutesPrAndRelease();
  testRunFlowDetectFailureForPrWhenGitUnavailable();
  testShadowModeDoesNotBlockExitSemantic();
  console.log('atm-flow tests passed');
}

main();
