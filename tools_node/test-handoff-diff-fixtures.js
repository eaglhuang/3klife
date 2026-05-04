#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE_DIR = path.join(ROOT, 'tests', 'fixtures', 'handoff-diff');
const VALIDATOR = path.join(ROOT, 'tools_node', 'validate-handoff-diff.js');

function listFixtureFiles() {
  return fs.readdirSync(FIXTURE_DIR)
    .filter((entry) => entry.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(FIXTURE_DIR, entry));
}

function loadFixture(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const fixtureFiles = listFixtureFiles();
  if (fixtureFiles.length === 0) {
    console.error('[handoff-diff-fixtures] no fixture files found');
    process.exit(1);
  }

  fixtureFiles.forEach((filePath) => {
    const fixture = loadFixture(filePath);
    const smokeArgs = Array.isArray(fixture.smokeArgs) ? fixture.smokeArgs : [];
    console.log(`\n[handoff-diff-fixtures] ${path.basename(filePath)}`);
    const result = spawnSync(process.execPath, [VALIDATOR, '--fixture', filePath, ...smokeArgs], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
    });
    if ((result.status ?? 1) !== 0) {
      process.exit(result.status ?? 1);
    }
  });

  console.log(`\n✔ handoff-diff fixture smoke passed (${fixtureFiles.length} fixtures)`);
}

main();