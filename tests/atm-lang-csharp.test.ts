const assert = require('node:assert/strict');
const path = require('path');

process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || 'tsconfig.test.json';
require('ts-node/register/transpile-only');

const {
  csharpLanguageAdapterV2,
  createCSharpAdapterCatalogEntry,
  collectCSharpProjectEvidence,
  buildCSharpInventory,
  buildCSharpSymbolReferenceIndex,
  buildCSharpSolutionProjectGraph,
  buildCSharpCsprojRiskModel,
  evaluateCSharpReadinessGate,
} = require('../packages/language-csharp/src');
const { resolveLanguageAdapter } = require('../packages/core/src/guidance/language-adapter-resolver');
const { planLegacyRouteWithAdapter } = require('../packages/core/src/guidance/legacy-route-delegation');

async function main() {
  const fixtureRoot = path.resolve('tests/fixtures/language-csharp/sample-project');
  const profile = csharpLanguageAdapterV2.detectProjectProfile(fixtureRoot);
  assert.equal(profile.languageId, 'csharp');
  assert.ok(
    (profile.evidence ?? []).some((entry) => entry.toLowerCase().includes('directory.packages.props')),
    'profile should include Directory.Packages.props evidence'
  );
  assert.ok(
    (profile.evidence ?? []).some((entry) => entry.toLowerCase().includes('global.json#sdk=')),
    'profile should include global.json sdk evidence'
  );
  assert.ok(
    (profile.evidence ?? []).some((entry) => entry.toLowerCase().includes('nuget.config#sources=')),
    'profile should include NuGet.Config evidence'
  );

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

  const analysis = buildCSharpInventory({
    repositoryRoot: fixtureRoot,
    includeGlobs: ['**/*.cs'],
  });
  const sampleEvidence = collectCSharpProjectEvidence(fixtureRoot);
  const symbolIndex = buildCSharpSymbolReferenceIndex(analysis);
  assert.ok(symbolIndex.references.length >= 5);
  assert.ok(
    symbolIndex.references.some(
      (reference) =>
        reference.callee.toLowerCase().startsWith('corealias.tag') &&
        reference.resolution === 'resolved'
    ),
    'symbol index should resolve alias using call'
  );

  const enterpriseRoot = path.resolve('tests/fixtures/language-csharp/enterprise-solution');
  const enterpriseGraph = buildCSharpSolutionProjectGraph(enterpriseRoot);
  assert.ok(enterpriseGraph.summary.projectCount >= 4);
  const enterpriseRisk = buildCSharpCsprojRiskModel(enterpriseRoot, undefined, enterpriseGraph);
  assert.ok(enterpriseRisk.findings.length >= 2);
  assert.ok(
    enterpriseRisk.findings.some((finding) => finding.kind === 'multi-target-framework'),
    'enterprise risk should include multi-target framework finding'
  );
  const sampleRisk = buildCSharpCsprojRiskModel(fixtureRoot);
  assert.ok(
    sampleRisk.findings.some((finding) => finding.kind === 'central-package-management-detected'),
    'sample risk should include central package management signal'
  );

  const readiness = evaluateCSharpReadinessGate({
    inventoryFileCount: analysis.inventory.files.length,
    symbolReferenceIndex: symbolIndex,
    csprojRisk: sampleRisk,
    projectEvidence: sampleEvidence,
    mapReport,
  });
  assert.ok(readiness.checks.length >= 8);
  assert.ok(
    readiness.checks.some((check) => check.checkId === 'sdk-pinning' && check.passed),
    'readiness should pass sdk pinning check'
  );
  assert.ok(
    readiness.checks.some((check) => check.checkId === 'nuget-source-mapping' && check.passed),
    'readiness should pass NuGet source mapping check'
  );
}

main().then(
  () => console.log('[atm-lang-csharp] PASS'),
  (error) => {
    console.error('[atm-lang-csharp] FAIL');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
);
