const fs = require('fs');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const POLICE_FILE = 'packages/core/src/police/guidance-police-integration.ts';
const TEST_FILE = 'tests/atm-lang-0300-0302.test.ts';

const REQUIRED_POLICE_SNIPPETS = [
  'buildPoliceGuidanceIntegrationReport',
  'routeMode',
  'records',
  'adapterId',
  'routeReport',
];

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-police-family] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];
  const policePath = repoPath(POLICE_FILE);
  const testPath = repoPath(TEST_FILE);

  ensure(fs.existsSync(policePath), `missing police integration file: ${POLICE_FILE}`, failures);
  ensure(fs.existsSync(testPath), `missing integration test file: ${TEST_FILE}`, failures);

  if (fs.existsSync(policePath)) {
    const policeSource = fs.readFileSync(policePath, 'utf8');
    for (const snippet of REQUIRED_POLICE_SNIPPETS) {
      ensure(
        policeSource.includes(snippet),
        `police integration source missing snippet: ${snippet}`,
        failures
      );
    }
  }

  if (fs.existsSync(testPath)) {
    const testSource = fs.readFileSync(testPath, 'utf8');
    ensure(
      testSource.includes('buildPoliceGuidanceIntegrationReport'),
      'tests must cover police integration report builder',
      failures
    );
    ensure(
      testSource.includes('adapter-delegated') && testSource.includes('generic-fallback'),
      'tests must cover delegated and fallback paths',
      failures
    );
  }

  const summary = {
    policeFile: POLICE_FILE,
    testFile: TEST_FILE,
    requiredPoliceSnippets: REQUIRED_POLICE_SNIPPETS.length,
  };

  if (failures.length > 0) {
    console.error('[validate-police-family] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('[validate-police-family] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();

