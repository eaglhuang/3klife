'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { runNeutralityMap } = require('../src/run-neutrality-map');

const atomRoot = path.resolve(__dirname, '..');
const reportPath = path.join(atomRoot, 'reports', 'neutrality-map-report.json');

function fixtureRoot(name) {
  return path.join(atomRoot, 'fixtures', name);
}

function runCase(name, expected) {
  const report = runNeutralityMap({ rootDir: fixtureRoot(name), includeGlobs: ['**/*.js'] });
  assert.strictEqual(report.exitCode, expected.exitCode, `${name} exitCode`);
  assert.strictEqual(report.status, expected.status, `${name} status`);
  for (const expectedType of expected.violationTypes || []) {
    assert(report.violations.some((violation) => violation.type === expectedType), `${name} has ${expectedType}`);
  }
  return { name, report };
}

function run() {
  const cases = [
    runCase('clean', { status: 'pass', exitCode: 0 }),
    runCase('term-violation', { status: 'fail', exitCode: 1, violationTypes: ['term'] }),
    runCase('path-violation', { status: 'fail', exitCode: 1, violationTypes: ['path'] }),
    runCase('mixed-violation', { status: 'fail', exitCode: 1, violationTypes: ['term', 'path'] }),
  ];
  const output = {
    schemaVersion: 'atm.neutrality-map-integration-report.v0',
    mapId: 'ATM-MAP-NEUTRALITY-0001',
    cases: cases.map((entry) => ({
      name: entry.name,
      status: entry.report.status,
      exitCode: entry.report.exitCode,
      totals: entry.report.totals,
      memberResults: entry.report.memberResults,
      violations: entry.report.violations,
    })),
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  process.stdout.write(`[ATM-MAP-NEUTRALITY-0001] integration tests passed -> ${reportPath}\n`);
}

run();