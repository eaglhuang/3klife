#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const kickoff = require('../atomic-framework/kickoff');
const doctor = require('../atomic-framework/doctor');
const { runGovernanceCheck, runGovernanceRender } = require('../atomic-framework/governance/index');

const projectRoot = path.resolve(__dirname, '..', '..');

function testRenderDeterminism() {
  const first = runGovernanceRender({ dryRun: true });
  const second = runGovernanceRender({ dryRun: true });

  assert.equal(first.ok, true, 'first dry-run render should succeed');
  assert.equal(second.ok, true, 'second dry-run render should succeed');
  assert.deepEqual(first.writes, second.writes, 'dry-run render should be deterministic');
}

function testTrackedTargetsAreInSync() {
  const report = runGovernanceCheck();
  assert.equal(report.schema.ok, true, 'governance profile schema should be valid');
  assert.equal(report.drift.status, 'pass', 'tracked governance targets should be in sync');
}

function testReleaseSurfaceIsRendered() {
  const report = runGovernanceCheck();
  const workflowTarget = report.renderedTargets.find((target) => target && target.targetPath === '.github/workflows/atm-governance.yml');
  assert.ok(workflowTarget, 'governance workflow target should exist');
  assert.match(workflowTarget.content, /ATM flow \(release\)/, 'workflow should include release gate step');
  assert.match(workflowTarget.content, /if: \$\{\{ github\.event_name == 'push' \}\}/, 'release gate should run only on push events');
}

function testInjectedDriftIsDetected() {
  const report = runGovernanceCheck({
    readFile(absolutePath) {
      if (absolutePath === path.join(projectRoot, '.github', 'hooks', 'token-guard.json')) {
        return '{\n  "hooks": {}\n}\n';
      }
      return fs.readFileSync(absolutePath, 'utf8');
    },
  });

  assert.equal(report.drift.status, 'drift', 'overridden token-guard manifest should be detected as drift');
  assert.ok(
    report.drift.mismatches.some((item) => item.targetPath === '.github/hooks/token-guard.json'),
    'token-guard manifest should be listed as drifted'
  );
}

function testDoctorGovernanceStatus() {
  const report = doctor.runGovernanceDoctor({
    checkGovernanceDrift: true,
  });

  assert.ok(report, 'doctor governance report should exist when enabled');
  assert.equal(report.drift.status, 'pass', 'doctor governance drift should pass on synced targets');
  assert.equal(report.portability.status, 'pass', 'release portability should pass when no blockers are active');
}

function testKickoffIncludesGovernanceCheck() {
  const plan = kickoff.buildPlan({
    goal: 'stabilize shared governance surfaces',
    task: '',
    mode: 'dev',
  });

  assert.ok(plan.steps.some((step) => step.id === 'governance-check'), 'kickoff should include a governance-check step');
}

function main() {
  testRenderDeterminism();
  testTrackedTargetsAreInSync();
  testReleaseSurfaceIsRendered();
  testInjectedDriftIsDetected();
  testDoctorGovernanceStatus();
  testKickoffIncludesGovernanceCheck();
  console.log('atm governance profile tests passed');
}

main();
