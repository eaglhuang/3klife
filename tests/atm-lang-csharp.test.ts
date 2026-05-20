const assert = require('node:assert/strict');
const path = require('path');

process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || 'tsconfig.test.json';
require('ts-node/register/transpile-only');

const { csharpLanguageAdapterV2 } = require('../packages/language-csharp/src');

async function main() {
  const fixtureRoot = path.resolve('tests/fixtures/language-csharp/sample-project');
  const profile = csharpLanguageAdapterV2.detectProjectProfile(fixtureRoot);
  assert.equal(profile.languageId, 'csharp');

  const inventory = await csharpLanguageAdapterV2.scanSourceInventory({
    repositoryRoot: fixtureRoot,
    includeGlobs: ['**/*.cs'],
  });
  assert.ok((inventory.files ?? []).length >= 6);
  const runtime = await csharpLanguageAdapterV2.detectRuntimeCommands({
    repositoryRoot: fixtureRoot,
    includeRisky: false,
  });
  assert.ok((runtime.commands ?? []).length >= 3);

  const plan = await csharpLanguageAdapterV2.planAtomizeDryRun({
    repositoryRoot: fixtureRoot,
    operation: 'atomize',
    entrypoint: 'src/Program.cs',
  });
  assert.equal(plan.executionMode, 'dry-run');
  assert.deepEqual(plan.evidence.mutates, []);

  const mapReport = await csharpLanguageAdapterV2.buildAtomicMapDecomposition({
    mapId: 'ATM-MAP-LANG-CSHARP-0105',
    repositoryRoot: fixtureRoot,
    sourceInventory: inventory,
  });
  assert.ok((mapReport.members ?? []).length >= 3);
}

main().then(
  () => console.log('[atm-lang-csharp] PASS'),
  (error) => {
    console.error('[atm-lang-csharp] FAIL');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
);
