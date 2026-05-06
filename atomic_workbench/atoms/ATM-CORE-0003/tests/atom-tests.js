'use strict';

const assert = require('assert');
const path = require('path');

const { enumerateScanTargets } = require('../src/scan-target-enumerator');
const { loadNeutralityLexicon } = require('../src/neutrality-lexicon-loader');
const { scanTextTerms } = require('../src/text-term-scanner');
const { scanPathPatterns, hasNonAsciiFilename } = require('../src/path-pattern-scanner');
const { aggregateNeutralityReport } = require('../src/neutrality-report-aggregator');

const atomRoot = path.resolve(__dirname, '..');
const fixtureRoot = (name) => path.join(atomRoot, 'fixtures', name);

function testScanTargetEnumerator() {
  const targets = enumerateScanTargets({ rootDir: fixtureRoot('clean'), includeGlobs: ['**/*.js'] });
  assert.deepStrictEqual(targets.map((target) => target.relativePath), ['src/neutral.js']);
}

function testNeutralityLexiconLoader() {
  const lexicon = loadNeutralityLexicon();
  assert(lexicon.forbiddenTerms.some((term) => term.normalized === 'html-to-ucuf'));
  assert(lexicon.forbiddenPathPatterns.some((pattern) => pattern.normalized === 'tools_node/'));
}

function testTextTermScanner() {
  const targets = enumerateScanTargets({ rootDir: fixtureRoot('term-violation'), includeGlobs: ['**/*.js'] });
  const violations = scanTextTerms({ targets, lexicon: loadNeutralityLexicon() });
  assert(violations.some((violation) => violation.matchedRule === 'html-to-ucuf'));
  assert(violations.some((violation) => violation.matchedRule === 'UCUF'));
}

function testPathPatternScanner() {
  const targets = enumerateScanTargets({ rootDir: fixtureRoot('path-violation'), includeGlobs: ['**/*.js'] });
  const violations = scanPathPatterns({ targets, lexicon: loadNeutralityLexicon() });
  assert(violations.some((violation) => violation.matchedRule === 'tools_node/'));
  assert.strictEqual(hasNonAsciiFilename('src/portable.js'), false);
  assert.strictEqual(hasNonAsciiFilename('src/non-ascii-name.js'), false);
  assert.strictEqual(hasNonAsciiFilename('src/zh-filename-測試.js'), true);
}

function testNeutralityReportAggregator() {
  const report = aggregateNeutralityReport({
    rootDir: fixtureRoot('mixed-violation'),
    targetCount: 1,
    ruleCount: 11,
    termViolations: [{ sourceAtom: 'ATM-CORE-0003-C', type: 'term', file: 'assets/scripts/leak.js', matchedRule: 'Cocos', line: 3 }],
    pathViolations: [{ sourceAtom: 'ATM-CORE-0003-D', type: 'path', file: 'assets/scripts/leak.js', matchedRule: 'assets/scripts/' }],
  });
  assert.strictEqual(report.status, 'fail');
  assert.strictEqual(report.exitCode, 1);
  assert.strictEqual(report.totals.violations, 2);
  assert(report.memberResults.some((member) => member.atomId === 'ATM-CORE-0003-E'));
}

function run() {
  testScanTargetEnumerator();
  testNeutralityLexiconLoader();
  testTextTermScanner();
  testPathPatternScanner();
  testNeutralityReportAggregator();
  process.stdout.write('[ATM-CORE-0003] atom tests passed\n');
}

run();