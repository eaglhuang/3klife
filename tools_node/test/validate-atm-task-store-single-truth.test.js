#!/usr/bin/env node
'use strict';

const {
  analyzeState,
} = require('../validate-atm-task-store-single-truth');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasRule(report, ruleId) {
  return Array.isArray(report.findings) && report.findings.some((item) => item.ruleId === ruleId);
}

function main() {
  const derivedOnly = analyzeState([
    'docs/tasks/tasks-atm.json',
    'docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md',
  ], {
    staged: false,
    skipSyncCheck: true,
  });
  assert(derivedOnly.passed === false, 'derived-only change should fail');
  assert(
    hasRule(derivedOnly, 'atm-task-store-single-truth.derived-without-shard-source'),
    'derived-only change should emit derived-without-shard-source finding',
  );

  const withSourcePart = analyzeState([
    'docs/tasks/tasks-atm/tasks-atm-part-5.json',
    'docs/tasks/tasks-atm.json',
    'docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md',
  ], {
    staged: false,
    skipSyncCheck: true,
  });
  assert(withSourcePart.passed === true, 'derived files with shard part source should pass');

  const syncDrift = analyzeState([
    'docs/tasks/tasks-atm/tasks-atm-part-5.json',
  ], {
    staged: false,
    skipSyncCheck: false,
    syncCheck: {
      passed: false,
      changedFiles: ['docs/tasks/tasks-atm.json'],
      drift: { indexDrift: true },
    },
  });
  assert(syncDrift.passed === false, 'sync drift should fail');
  assert(
    hasRule(syncDrift, 'atm-task-store-single-truth.pipeline-drift'),
    'sync drift should emit pipeline-drift finding',
  );

  console.log('validate-atm-task-store-single-truth tests passed');
}

main();

