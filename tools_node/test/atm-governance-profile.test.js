#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const kickoff = require('../atomic-framework/kickoff');
const doctor = require('../atomic-framework/doctor');
const { runGovernanceCheck, runGovernanceMigrate, runGovernanceRender } = require('../atomic-framework/governance/index');

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
  assert.match(workflowTarget.content, /Agent identity consistency \(advisory\)/, 'workflow should include identity advisory step');
  assert.match(workflowTarget.content, /check-agent-identity-consistency\.js --mode advisory --json/, 'workflow should run identity consistency checker in advisory mode');
  assert.match(workflowTarget.content, /ATM flow \(release-shadow\)/, 'workflow should include release-shadow gate step');
  assert.match(workflowTarget.content, /if: \$\{\{ github\.event_name == 'pull_request' \}\}/, 'release-shadow gate should run only on pull_request events');
  assert.match(workflowTarget.content, /--shadow/, 'release-shadow gate should run in shadow mode');
  assert.match(workflowTarget.content, /atm-release-shadow-report\.json/, 'release-shadow gate should emit report artifact');
  assert.match(workflowTarget.content, /atm-release-shadow-metrics\.json/, 'release-shadow gate should emit metrics artifact');
  assert.match(workflowTarget.content, /ATM flow \(release-shadow summary\)/, 'workflow should include release-shadow summary step');
  assert.match(workflowTarget.content, /github\.event_name == 'pull_request' && always\(\)/, 'release-shadow summary should run with always() on pull_request');
  assert.match(workflowTarget.content, /render-atm-release-shadow-summary\.js/, 'release-shadow summary should render markdown summary');
  assert.match(workflowTarget.content, /GITHUB_STEP_SUMMARY/, 'release-shadow summary should target GITHUB_STEP_SUMMARY');
  assert.match(workflowTarget.content, /ATM flow \(release\)/, 'workflow should include release gate step');
  assert.match(workflowTarget.content, /if: \$\{\{ github\.event_name == 'push' \}\}/, 'release gate should run only on push events');
}

function testMigrateV2ToV3DryRun() {
  fs.mkdirSync(path.join(projectRoot, 'artifacts'), { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(projectRoot, 'artifacts', 'tmp-governance-migrate-'));
  const tempProfilePath = path.join(tempDir, 'governance-profile.v2.json');
  const current = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tools_node', 'adapters', 'atm-3klife', 'governance-profile.json'), 'utf8'));
  const legacy = JSON.parse(JSON.stringify(current));
  legacy.version = 2;
  legacy.profileId = '3klife.shared-governance-surfaces.v2';
  delete legacy.doctor.identityConsistency;
  delete legacy.gateEntrypoints.ciIdentityAdvisory;
  delete legacy.gateEntrypoints.ciIdentityBlocking;
  legacy.ci.workflows[0].steps = legacy.ci.workflows[0].steps.filter((step) => step.entrypointKey !== 'ciIdentityAdvisory');
  fs.writeFileSync(tempProfilePath, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');

  const migrated = runGovernanceMigrate({
    profilePath: tempProfilePath,
    fromVersion: 'v2',
    toVersion: 'v3',
    dryRun: true,
  });

  assert.equal(migrated.ok, true, 'v2 -> v3 dry-run migrate should succeed');
  assert.equal(migrated.schema.ok, true, 'migrated v3 profile should be schema valid');
  assert.equal(migrated.migration.profile.version, 3, 'migrated profile should become v3');
  assert.ok(migrated.migration.profile.gateEntrypoints.ciIdentityAdvisory, 'migrated profile should include ciIdentityAdvisory');
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

function testDoctorIdentityConsistencyStatus() {
  const result = doctor.runIdentityConsistencyDoctor({
    identityMode: 'advisory',
  });
  assert.equal(result.enabled, true, 'doctor identity consistency should be enabled via governance profile');
  assert.ok(['pass', 'advisory', 'blocking'].includes(result.status), 'identity status should be reported');
  assert.equal(typeof result.command, 'string', 'identity command should be exposed');
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
  testMigrateV2ToV3DryRun();
  testInjectedDriftIsDetected();
  testDoctorGovernanceStatus();
  testDoctorIdentityConsistencyStatus();
  testKickoffIncludesGovernanceCheck();
  console.log('atm governance profile tests passed');
}

main();
