const assert = require('node:assert/strict');
const path = require('path');

process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || 'tsconfig.test.json';
require('ts-node/register/transpile-only');

const { csharpLanguageAdapterV2, createCSharpAdapterCatalogEntry } = require('../packages/language-csharp/src');
const { resolveLanguageAdapter } = require('../packages/core/src/guidance/language-adapter-resolver');
const { planLegacyRouteWithAdapter } = require('../packages/core/src/guidance/legacy-route-delegation');

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

  const catalogEntry = createCSharpAdapterCatalogEntry();
  const resolution = resolveLanguageAdapter({
    languageId: 'csharp',
    requiredCapabilities: ['sourceInventory', 'legacyRoutePlanning'],
    allowPartialCapability: true,
    discoveryInput: {
      bundledAdapters: [catalogEntry],
    },
  });
  assert.equal(resolution.selected?.adapterId, 'csharp-future');
  assert.equal(resolution.ok, true);

  const routeResult = await planLegacyRouteWithAdapter({
    intent: 'plan atomize route',
    repositoryRoot: fixtureRoot,
    languageId: 'csharp',
    adapterResolution: resolution,
    adapterDelegate: (request) => csharpLanguageAdapterV2.buildLegacyRoutePlan(request),
  });
  assert.equal(routeResult.mode, 'adapter-delegated');
}

main().then(
  () => console.log('[atm-lang-csharp] PASS'),
  (error) => {
    console.error('[atm-lang-csharp] FAIL');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
);
