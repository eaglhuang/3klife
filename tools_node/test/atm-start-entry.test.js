#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const bootstrap = require('../atomic-framework/bootstrap');

function testStartTextOnlyBecomesGoal() {
  const args = bootstrap.buildKickoffArgsFromStart(['幫我寫一個小遊戲']);
  assert.deepEqual(args, ['--goal', '幫我寫一個小遊戲']);
}

function testStartKeepsKnownFlags() {
  const args = bootstrap.buildKickoffArgsFromStart(['幫我寫一個小遊戲', '--mode', 'dev', '--json']);
  assert.deepEqual(args, ['--goal', '幫我寫一個小遊戲', '--mode', 'dev', '--json']);
}

function testStartPassesThroughExplicitGoal() {
  const args = bootstrap.buildKickoffArgsFromStart(['--goal', '修正登入流程', '--mode', 'pr']);
  assert.deepEqual(args, ['--goal', '修正登入流程', '--mode', 'pr']);
}

function testStartWithoutGoalText() {
  const args = bootstrap.buildKickoffArgsFromStart(['--mode', 'dev']);
  assert.deepEqual(args, ['--mode', 'dev']);
}

function main() {
  testStartTextOnlyBecomesGoal();
  testStartKeepsKnownFlags();
  testStartPassesThroughExplicitGoal();
  testStartWithoutGoalText();
  console.log('atm start entry tests passed');
}

main();
