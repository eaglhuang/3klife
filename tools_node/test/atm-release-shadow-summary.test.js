#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const summary = require('../render-atm-release-shadow-summary');

function testSeverityBadge() {
  assert.equal(summary.severityBadge('GREEN'), 'GREEN [G]');
  assert.equal(summary.severityBadge('YELLOW'), 'YELLOW [Y]');
  assert.equal(summary.severityBadge('RED'), 'RED [R]');
}

function testMarkdownContainsTopFailedRows() {
  const markdown = summary.buildMarkdown({
    mode: 'release',
    precheck: { passed: true },
    summary: {
      totalDurationMs: 1320,
      failedStepCount: 2,
    },
    steps: [
      { id: 'compute-gate-quick', passed: true, skipped: false, durationMs: 100 },
      { id: 'validate-h2u-rule-guard', passed: false, skipped: false, reason: 'strict mismatch', status: 1, durationMs: 210 },
      { id: 'validate-doc-shard-health', passed: false, skipped: false, reason: 'shard index drift', status: 1, durationMs: 180 },
    ],
    userFacing: {
      blockedAt: 'validate-h2u-rule-guard',
      nextCommand: 'node tools_node/validate-html-to-ucuf-rule-guard.js --strict',
    },
  }, {
    aggregate: {
      topFailedSteps: [
        { id: 'validate-h2u-rule-guard', count: 3 },
        { id: 'validate-doc-shard-health', count: 2 },
      ],
    },
  }, { top: 2 });

  assert.match(markdown, /YELLOW \[Y\]/);
  assert.match(markdown, /Current run failed steps \(Top 2\)/);
  assert.match(markdown, /\| validate-h2u-rule-guard \| strict mismatch \| 1 \| 210 \|/);
  assert.match(markdown, /Historical failed steps \(Top 2\)/);
  assert.match(markdown, /\| validate-h2u-rule-guard \| 3 \|/);
}

function main() {
  testSeverityBadge();
  testMarkdownContainsTopFailedRows();
  console.log('atm release-shadow summary tests passed');
}

main();
