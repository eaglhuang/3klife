const fs = require('fs');
const childProcess = require('child_process');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const REQUIRED_FILES = [
  'packages/core/src/guidance/atomic-map-decomposition.ts',
  'schemas/language-atomic-map-decomposition-request.schema.json',
  'schemas/language-atomic-map-decomposition-report.schema.json',
  'tests/fixtures/language-map-decomposition/decomposition-fixtures.json',
  'tests/atm-lang-0600-0602.test.ts',
];

const REQUIRED_SNIPPETS = [
  {
    path: 'packages/core/src/guidance/atomic-map-decomposition.ts',
    snippets: [
      'buildGraphToMapDecompositionProposal',
      'buildAtomicMapDecompositionEvidenceGate',
      'entrypoints<',
    ],
  },
  {
    path: 'packages/plugin-sdk/src/language-adapter.ts',
    snippets: ['AtomicMapDecompositionEvidenceGate', 'AtomicMapEntrypoint'],
  },
];

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function runFixtureTest() {
  const args = ['-r', 'ts-node/register/transpile-only', 'tests/atm-lang-0600-0602.test.ts'];
  const result = childProcess.spawnSync(process.execPath, args, {
    cwd: repoPath(),
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_PROJECT: process.env.TS_NODE_PROJECT || 'tsconfig.test.json',
    },
  });
  return result.status === 0;
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-map-curator] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];

  for (const relativePath of REQUIRED_FILES) {
    ensure(fs.existsSync(repoPath(relativePath)), `missing required file: ${relativePath}`, failures);
  }

  for (const item of REQUIRED_SNIPPETS) {
    const fullPath = repoPath(item.path);
    if (!fs.existsSync(fullPath)) {
      failures.push(`cannot check snippets; file missing: ${item.path}`);
      continue;
    }
    const text = fs.readFileSync(fullPath, 'utf8');
    for (const snippet of item.snippets) {
      ensure(text.includes(snippet), `missing snippet in ${item.path}: ${snippet}`, failures);
    }
  }

  if (failures.length > 0) {
    console.error('[validate-map-curator] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  const fixtureTestOk = runFixtureTest();
  if (!fixtureTestOk) {
    console.error('[validate-map-curator] FAIL');
    console.error('  - decomposition fixture test failed');
    process.exit(1);
  }

  console.log('[validate-map-curator] PASS');
  console.log(
    JSON.stringify(
      {
        requiredFileCount: REQUIRED_FILES.length,
        requiredSnippetCount: REQUIRED_SNIPPETS.reduce((acc, item) => acc + item.snippets.length, 0),
      },
      null,
      2
    )
  );
}

main();

