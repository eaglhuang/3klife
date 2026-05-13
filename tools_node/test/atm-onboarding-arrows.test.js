#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const kickoff = require('../atomic-framework/kickoff');
const doctor = require('../atomic-framework/doctor');

function testKickoffRouteProfiles() {
  assert.equal(kickoff.classifyGoal('fix h2u launch flow'), 'h2u-fix');
  assert.equal(kickoff.classifyGoal('create new atom for parser'), 'atom-birth');
  assert.equal(kickoff.classifyGoal('create-map for release flow'), 'map-birth');
  assert.equal(kickoff.classifyGoal('write a release checklist'), 'generic');
}

function testKickoffPlanHasNextCommand() {
  const plan = kickoff.buildPlan({
    goal: 'fix h2u launch flow',
    task: '',
    mode: 'dev',
  });
  assert.equal(plan.routeProfile, 'h2u-fix');
  assert.ok(plan.nextCommand.includes('--intent fix-h2u'));
  assert.ok(plan.steps.some((item) => item.id === 'identity-gate'));
  assert.ok(plan.steps.some((item) => item.id === 'governance-check'));
  assert.ok(plan.steps.some((item) => item.id === 'route-intent-fix-h2u'));
  assert.ok(plan.steps.some((item) => item.id === 'doctor-h2u'));
  assert.ok(plan.steps.some((item) => item.id === 'h2u-launch-gate'));
}

function testKickoffTaskFirst() {
  const plan = kickoff.buildPlan({
    goal: 'take ATM-4-0003',
    task: 'ATM-4-0003',
    mode: 'dev',
  });
  assert.ok(plan.nextCommand.includes('--task ATM-4-0003'));
  assert.ok(plan.steps.some((item) => item.id === 'route-task'));
}

function testDoctorProfileClassifier() {
  const areasH2u = { touchesH2U: true, touchesTaskStore: false, touchesDocs: false };
  const areasGeneric = { touchesH2U: false, touchesTaskStore: false, touchesDocs: false };
  assert.equal(doctor.classifyGoal('repair parser', areasH2u), 'h2u-fix');
  assert.equal(doctor.classifyGoal('fix html-to-ucuf flow', areasGeneric), 'h2u-fix');
  assert.equal(doctor.classifyGoal('write a release checklist', areasGeneric), 'generic');
}

function main() {
  testKickoffRouteProfiles();
  testKickoffPlanHasNextCommand();
  testKickoffTaskFirst();
  testDoctorProfileClassifier();
  console.log('atm onboarding arrows tests passed');
}

main();
