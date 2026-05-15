#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const kickoff = require('../atomic-framework/kickoff');
const doctor = require('../atomic-framework/doctor');
const atmFlow = require('../atm-flow');

const projectRoot = path.resolve(__dirname, '..', '..');
const DEFAULT_H2U_STATUS_FILE = 'artifacts/legacy-h2u-first-win/worktree-status.txt';
const DEFAULT_H2U_ALLOW_DIRTY_PREFIX = 'assets/resources/ui-spec/screens/legacy-h2u-dryrun.local-tokens.json';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildWorktreeStatusFixture() {
  const artifactsDir = path.join(projectRoot, 'artifacts', 'legacy-h2u-first-win');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const fixturePath = path.join(artifactsDir, 'worktree-status.integration.txt');
  const fixtureLines = [
    ' M tools_node/lib/html-to-ucuf/draft-builder.js',
    ' M tools_node/validate-legacy-h2u-launch.js',
    ' M tools_node/validate-legacy-h2u-first-win.js',
  ];
  fs.writeFileSync(fixturePath, `${fixtureLines.join('\n')}\n`, 'utf8');
  return path.relative(projectRoot, fixturePath).replace(/\\/g, '/');
}

function testKickoffDoctorFlowIntegration() {
  const goal = 'fix h2u launch flow';
  const worktreeStatusFile = buildWorktreeStatusFixture();

  const kickoffPlan = kickoff.buildPlan({
    goal,
    task: '',
    mode: 'dev',
  });
  assert(kickoffPlan.routeProfile === 'h2u-fix', 'kickoff should classify as h2u-fix');
  assert(kickoffPlan.steps.some((step) => step.id === 'governance-check'), 'kickoff should include governance check');
  assert(kickoffPlan.nextCommand.includes('--intent fix-h2u'), 'kickoff should route to fix-h2u intent');
  assert(kickoffPlan.steps.some((step) => step.id === 'doctor-h2u'), 'kickoff should include doctor-h2u step');
  assert(kickoffPlan.steps.some((step) => step.id === 'flow-dev'), 'kickoff should include flow-dev step');
  const doctorStep = kickoffPlan.steps.find((step) => step.id === 'doctor-h2u');
  assert(doctorStep && doctorStep.command.includes(`--worktree-status-file ${DEFAULT_H2U_STATUS_FILE}`), 'kickoff doctor-h2u command should include default status-file');
  assert(doctorStep && doctorStep.command.includes(`--allow-dirty-prefix ${DEFAULT_H2U_ALLOW_DIRTY_PREFIX}`), 'kickoff doctor-h2u command should include default allow-dirty prefix');
  const launchGateStep = kickoffPlan.steps.find((step) => step.id === 'h2u-launch-gate');
  assert(launchGateStep && launchGateStep.command.includes('--require-worktree-check'), 'kickoff launch gate command should require worktree check');
  assert(launchGateStep && launchGateStep.command.includes(`--worktree-status-file ${DEFAULT_H2U_STATUS_FILE}`), 'kickoff launch gate command should include default status-file');

  const changed = doctor.detectChangedFiles({
    worktreeStatusFile,
  });
  assert(
    String(changed.source || '').includes('worktree-status-file'),
    'doctor should read changed files from worktree snapshot'
  );
  const areas = doctor.classifyAreas(changed.files);
  assert(areas.touchesH2U === true, 'doctor should detect h2u touched area');
  const routeProfile = doctor.classifyGoal(goal, areas);
  assert(routeProfile === 'h2u-fix', 'doctor should classify as h2u-fix');

  const flowProbe = doctor.runAtmFlowDoctor({
    mode: 'dev',
    fromMode: '',
    worktreeStatusFile,
    allowDirtyPrefixes: [],
  });
  assert(typeof flowProbe.command === 'string' && flowProbe.command.includes('tools_node/atm-flow.js'), 'doctor should probe atm-flow');

  const governanceProbe = doctor.runGovernanceDoctor({
    checkGovernanceDrift: true,
  });
  assert(governanceProbe && governanceProbe.drift.status === 'pass', 'doctor governance drift should pass on synced targets');

  const flowReport = atmFlow.runFlow({
    mode: 'dev',
    fromMode: '',
    files: [],
    worktreeStatusFile,
    allowDirtyPrefixes: [],
    shadow: true,
    metricsFile: '',
    report: '',
    json: true,
    help: false,
  });
  assert(flowReport.tool === 'atm-flow', 'atm-flow output should include tool id');
  assert(flowReport.mode === 'dev', 'atm-flow should run in dev mode');
  assert(flowReport.areas && flowReport.areas.touchesH2U === true, 'atm-flow should detect h2u touched area');
  assert(flowReport.shadow && flowReport.shadow.enabled === true, 'atm-flow integration should run in shadow mode');
  assert(flowReport.enforcedPassed === true, 'shadow mode should avoid hard-blocking release gating smoke');
}

function main() {
  testKickoffDoctorFlowIntegration();
  console.log('atm kickoff -> doctor -> atm-flow integration test passed');
}

main();
