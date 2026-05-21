const assert = require('node:assert/strict');
const fs = require('fs');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const REQUIRED_FILES = [
  'packages/language-python/src/index.ts',
  'packages/language-python/src/adapter.ts',
  'packages/language-python/src/python-static-analysis.ts',
  'packages/language-python/src/python-dry-run.ts',
  'packages/language-python/src/python-diagnostics.ts',
  'packages/language-python/src/python-map.ts',
  'fixtures/python-adapter/sample-project/app/main.py',
  'fixtures/python-adapter/sample-project/app/service.py',
  'fixtures/python-adapter/sample-project/app/api.py',
  'fixtures/python-adapter/expected-report.json',
  'fixtures/python-adapter/dry-run-requests.json',
  'fixtures/python-adapter/diagnostics-sample.txt',
  'fixtures/python-adapter/equivalence-fixtures.json',
];

const REQUIRED_SNIPPETS = [
  {
    path: 'packages/language-python/src/python-static-analysis.ts',
    snippets: [
      'buildPythonAstInventory(',
      'buildPythonDependencyCallArtifactGraph(',
      'detectPythonCliApiSideEffects(',
      'scanPythonSourceInventory(',
      'detectPythonRuntimeCommands(',
      'normalizePythonSymbolId(',
      'buildPythonLegacyRoutePlan(',
    ],
  },
  {
    path: 'packages/language-python/src/python-dry-run.ts',
    snippets: [
      'planPythonAtomizeDryRun(',
      'planPythonInfectDryRun(',
      'mutates: []',
    ],
  },
  {
    path: 'packages/language-python/src/python-diagnostics.ts',
    snippets: [
      'parsePythonDiagnostics(',
      'computePythonEquivalenceContract(',
    ],
  },
  {
    path: 'packages/language-python/src/python-map.ts',
    snippets: [
      'buildPythonAtomicMapDecomposition(',
      'evidenceGate',
    ],
  },
];

function ensure(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function edgeExists(edges, expected) {
  return edges.some(
    (edge) =>
      edge.from === expected.from &&
      edge.to === expected.to &&
      edge.relation === expected.relation
  );
}

async function runFixtureCheck() {
  process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || 'tsconfig.test.json';
  require('ts-node/register/transpile-only');

  const {
    analyzePythonProject,
    detectPythonRuntimeCommands,
    parsePythonDiagnostics,
    computePythonEquivalenceContract,
    pythonLanguageAdapterV2,
  } = require('../packages/language-python/src');

  const fixtureRoot = repoPath('fixtures/python-adapter/sample-project');
  const expected = JSON.parse(
    fs.readFileSync(repoPath('fixtures/python-adapter/expected-report.json'), 'utf8')
  );
  const dryRunRequests = JSON.parse(
    fs.readFileSync(repoPath('fixtures/python-adapter/dry-run-requests.json'), 'utf8')
  );
  const diagnosticsRaw = fs.readFileSync(
    repoPath('fixtures/python-adapter/diagnostics-sample.txt'),
    'utf8'
  );
  const equivalenceFixtures = JSON.parse(
    fs.readFileSync(repoPath('fixtures/python-adapter/equivalence-fixtures.json'), 'utf8')
  );

  const analysis = await analyzePythonProject({
    repositoryRoot: fixtureRoot,
    includeGlobs: ['**/*.py'],
  });
  const runtimeReport = await detectPythonRuntimeCommands({
    repositoryRoot: fixtureRoot,
    includeRisky: true,
  });

  for (const requiredFile of expected.requiredFiles) {
    assert.ok(
      analysis.inventory.files.some((entry) => entry.filePath === requiredFile),
      `missing inventory file: ${requiredFile}`
    );
  }

  for (const fileEntry of analysis.inventory.files) {
    for (const symbol of fileEntry.symbols ?? []) {
      assert.ok(
        symbol.range.startLine >= 1 &&
          symbol.range.endLine >= symbol.range.startLine &&
          symbol.range.endColumn >= 0,
        `invalid symbol range: ${symbol.symbolId}`
      );
    }
  }

  for (const requiredEdge of expected.requiredDependencyEdges) {
    assert.ok(
      edgeExists(analysis.inventory.dependencyEdges ?? [], requiredEdge),
      `missing dependency edge: ${JSON.stringify(requiredEdge)}`
    );
  }

  for (const requiredEdge of expected.requiredCallEdges) {
    assert.ok(
      edgeExists(analysis.inventory.callEdges ?? [], requiredEdge),
      `missing call edge: ${JSON.stringify(requiredEdge)}`
    );
  }

  for (const requiredEdge of expected.requiredArtifactEdges) {
    assert.ok(
      edgeExists(analysis.inventory.artifactEdges ?? [], requiredEdge),
      `missing artifact edge: ${JSON.stringify(requiredEdge)}`
    );
  }

  const categories = new Set(runtimeReport.commands.map((entry) => entry.category));
  for (const requiredCategory of expected.requiredRuntimeCategories) {
    assert.ok(categories.has(requiredCategory), `missing runtime category: ${requiredCategory}`);
  }

  assert.equal(pythonLanguageAdapterV2.languageId, 'python', 'adapter languageId mismatch');
  assert.equal(pythonLanguageAdapterV2.contractVersion, 'v2', 'adapter contractVersion mismatch');
  assert.equal(
    pythonLanguageAdapterV2.capabilities?.atomizeDryRun,
    'full',
    'atomizeDryRun capability mismatch'
  );
  assert.equal(
    pythonLanguageAdapterV2.capabilities?.infectDryRun,
    'full',
    'infectDryRun capability mismatch'
  );
  assert.equal(
    pythonLanguageAdapterV2.capabilities?.symbolNormalization,
    'full',
    'symbolNormalization capability mismatch'
  );
  assert.equal(
    pythonLanguageAdapterV2.capabilities?.legacyRoutePlanning,
    'full',
    'legacyRoutePlanning capability mismatch'
  );
  assert.equal(
    pythonLanguageAdapterV2.capabilities?.atomicMapDecomposition,
    'full',
    'atomicMapDecomposition capability mismatch'
  );
  assert.equal(
    pythonLanguageAdapterV2.capabilities?.callGraph,
    'full',
    'callGraph capability mismatch'
  );

  assert.ok(
    typeof pythonLanguageAdapterV2.planAtomizeDryRun === 'function',
    'planAtomizeDryRun should exist'
  );
  assert.ok(
    typeof pythonLanguageAdapterV2.planInfectDryRun === 'function',
    'planInfectDryRun should exist'
  );
  assert.ok(
    typeof pythonLanguageAdapterV2.parseDiagnostics === 'function',
    'parseDiagnostics should exist'
  );
  assert.ok(
    typeof pythonLanguageAdapterV2.computeEquivalenceContract === 'function',
    'computeEquivalenceContract should exist'
  );
  assert.ok(
    typeof pythonLanguageAdapterV2.normalizeSymbolId === 'function',
    'normalizeSymbolId should exist'
  );
  assert.ok(
    typeof pythonLanguageAdapterV2.buildLegacyRoutePlan === 'function',
    'buildLegacyRoutePlan should exist'
  );
  assert.ok(
    typeof pythonLanguageAdapterV2.buildAtomicMapDecomposition === 'function',
    'buildAtomicMapDecomposition should exist'
  );

  const atomizePlan = await pythonLanguageAdapterV2.planAtomizeDryRun(dryRunRequests.atomizeRequest);
  assert.equal(atomizePlan.executionMode, 'dry-run', 'atomize dry-run execution mode mismatch');
  assert.equal(atomizePlan.evidence.planKind, 'atomize', 'atomize evidence planKind mismatch');
  assert.deepEqual(atomizePlan.evidence.mutates, [], 'atomize mutates should be empty');
  assert.ok(atomizePlan.evidence.importRewrite, 'atomize importRewrite should exist');
  assert.ok(atomizePlan.evidence.shim, 'atomize shim should exist');
  assert.ok(atomizePlan.evidence.rollback, 'atomize rollback should exist');

  const infectPlan = await pythonLanguageAdapterV2.planInfectDryRun(dryRunRequests.infectRequest);
  assert.equal(infectPlan.executionMode, 'dry-run', 'infect dry-run execution mode mismatch');
  assert.equal(infectPlan.evidence.planKind, 'infect', 'infect evidence planKind mismatch');
  assert.deepEqual(infectPlan.evidence.mutates, [], 'infect mutates should be empty');
  assert.ok(infectPlan.evidence.importRewrite, 'infect importRewrite should exist');
  assert.ok(infectPlan.evidence.shim, 'infect shim should exist');
  assert.ok(infectPlan.evidence.rollback, 'infect rollback should exist');

  const diagnostics = parsePythonDiagnostics({
    rawDiagnostics: diagnosticsRaw,
    source: 'pytest',
  });
  assert.ok(diagnostics.diagnostics.length >= 3, 'diagnostics parser should parse >= 3 entries');
  assert.ok(
    diagnostics.diagnostics.some((entry) => entry.severity === 'error'),
    'diagnostics parser should include error severity'
  );

  for (const fixture of equivalenceFixtures.cases) {
    const result = computePythonEquivalenceContract({
      fixtureId: fixture.fixtureId,
      expectedBehavior: fixture.expectedBehavior,
    });
    assert.equal(
      result.accepted,
      fixture.accepted,
      `equivalence acceptance mismatch: ${fixture.fixtureId}`
    );
  }

  const normalizedSymbol = pythonLanguageAdapterV2.normalizeSymbolId({
    rawSymbolId: 'App.Service::run_job(raw_text)',
    filePath: 'app/service.py',
  });
  assert.ok(
    normalizedSymbol.normalized.includes('app/service.py#'),
    'normalizeSymbolId should preserve file path prefix'
  );

  const legacyRoute = await pythonLanguageAdapterV2.buildLegacyRoutePlan({
    intent: 'plan atomize route',
    repositoryRoot: fixtureRoot,
  });
  assert.ok(
    legacyRoute.routeId.startsWith('python-legacy-'),
    'legacy route id should use python-legacy prefix'
  );
  assert.ok(legacyRoute.steps.length >= 5, 'legacy route should include >= 5 steps');

  const mapReport = await pythonLanguageAdapterV2.buildAtomicMapDecomposition({
    mapId: 'ATM-MAP-LANG-0700',
    repositoryRoot: fixtureRoot,
    sourceInventory: analysis.inventory,
  });
  assert.equal(mapReport.evidenceGate?.accepted, true, 'atomic map evidence gate should pass');
  assert.ok((mapReport.entrypoints ?? []).length >= 1, 'map decomposition should include entrypoints');

  return {
    inventoryFileCount: analysis.inventory.files.length,
    dependencyEdgeCount: analysis.inventory.dependencyEdges?.length ?? 0,
    callEdgeCount: analysis.inventory.callEdges?.length ?? 0,
    artifactEdgeCount: analysis.inventory.artifactEdges?.length ?? 0,
    runtimeCommandCount: runtimeReport.commands.length,
    runtimeWarningCount: runtimeReport.warnings?.length ?? 0,
    atomizeStepCount: atomizePlan.steps.length,
    infectStepCount: infectPlan.steps.length,
    diagnosticsCount: diagnostics.diagnostics.length,
    equivalenceCaseCount: equivalenceFixtures.cases.length,
    legacyRouteStepCount: legacyRoute.steps.length,
    mapMemberCount: mapReport.members.length,
    mapEdgeCount: mapReport.edges.length,
  };
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-python-adapter] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];

  for (const relativePath of REQUIRED_FILES) {
    ensure(fs.existsSync(repoPath(relativePath)), `missing required file: ${relativePath}`, failures);
  }

  for (const snippetFile of REQUIRED_SNIPPETS) {
    const fullPath = repoPath(snippetFile.path);
    if (!fs.existsSync(fullPath)) {
      failures.push(`cannot check snippets; file missing: ${snippetFile.path}`);
      continue;
    }
    const source = fs.readFileSync(fullPath, 'utf8');
    for (const snippet of snippetFile.snippets) {
      ensure(source.includes(snippet), `missing snippet in ${snippetFile.path}: ${snippet}`, failures);
    }
  }

  if (failures.length > 0) {
    console.error('[validate-python-adapter] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  let summary;
  try {
    summary = await runFixtureCheck();
  } catch (error) {
    console.error('[validate-python-adapter] FAIL');
    console.error(`  - fixture check failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log('[validate-python-adapter] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();
