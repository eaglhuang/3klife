const assert = require('node:assert/strict');
const fs = require('fs');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const REQUIRED_FILES = [
  'packages/language-js/src/index.ts',
  'packages/language-js/src/adapter.ts',
  'packages/language-js/src/js-static-analysis.ts',
  'packages/language-js/src/js-dry-run.ts',
  'fixtures/language-js-adapter/sample-project/src/index.ts',
  'fixtures/language-js-adapter/sample-project/src/service.ts',
  'fixtures/language-js-adapter/sample-project/src/api.ts',
  'fixtures/language-js-adapter/expected-report.json',
  'fixtures/language-js-adapter/dry-run-requests.json',
];

const REQUIRED_ANALYSIS_SNIPPETS = [
  'buildJsAstInventory(',
  'buildJsDependencyCallArtifactGraph(',
  'detectJsCliApiSideEffects(',
  'scanJsSourceInventory(',
  'detectJsRuntimeCommands(',
  'buildJsLegacyRoutePlan(',
  'normalizeJsSymbolId(',
];

const REQUIRED_DRY_RUN_SNIPPETS = [
  'planJsAtomizeDryRun(',
  'planJsInfectDryRun(',
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
    analyzeJsProject,
    detectJsRuntimeCommands,
    jsLanguageAdapterV2,
  } = require('../packages/language-js/src');

  const fixtureRoot = repoPath('fixtures/language-js-adapter/sample-project');
  const expected = JSON.parse(
    fs.readFileSync(repoPath('fixtures/language-js-adapter/expected-report.json'), 'utf8')
  );
  const dryRunRequests = JSON.parse(
    fs.readFileSync(repoPath('fixtures/language-js-adapter/dry-run-requests.json'), 'utf8')
  );

  const analysis = await analyzeJsProject({
    repositoryRoot: fixtureRoot,
    includeGlobs: ['**/*.ts'],
  });
  const runtimeReport = await detectJsRuntimeCommands({
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

  assert.equal(jsLanguageAdapterV2.languageId, 'typescript', 'adapter languageId mismatch');
  assert.equal(jsLanguageAdapterV2.contractVersion, 'v2', 'adapter contractVersion mismatch');
  assert.equal(jsLanguageAdapterV2.capabilities?.atomizeDryRun, 'full', 'atomizeDryRun capability mismatch');
  assert.equal(jsLanguageAdapterV2.capabilities?.infectDryRun, 'full', 'infectDryRun capability mismatch');
  assert.equal(jsLanguageAdapterV2.capabilities?.sourceInventory, 'full', 'sourceInventory capability mismatch');
  assert.equal(jsLanguageAdapterV2.capabilities?.legacyRoutePlanning, 'full', 'legacyRoutePlanning capability mismatch');
  assert.equal(jsLanguageAdapterV2.capabilities?.symbolNormalization, 'full', 'symbolNormalization capability mismatch');

  assert.ok(typeof jsLanguageAdapterV2.planAtomizeDryRun === 'function', 'planAtomizeDryRun should exist');
  assert.ok(typeof jsLanguageAdapterV2.planInfectDryRun === 'function', 'planInfectDryRun should exist');
  assert.ok(typeof jsLanguageAdapterV2.normalizeSymbolId === 'function', 'normalizeSymbolId should exist');
  assert.ok(typeof jsLanguageAdapterV2.buildLegacyRoutePlan === 'function', 'buildLegacyRoutePlan should exist');
  assert.ok(typeof jsLanguageAdapterV2.detectRuntimeCommands === 'function', 'detectRuntimeCommands should exist');

  const atomizePlan = await jsLanguageAdapterV2.planAtomizeDryRun(dryRunRequests.atomizeRequest);
  assert.equal(atomizePlan.executionMode, 'dry-run', 'atomize dry-run execution mode mismatch');
  assert.equal(atomizePlan.evidence.planKind, 'atomize', 'atomize evidence planKind mismatch');
  assert.deepEqual(atomizePlan.evidence.mutates, [], 'atomize mutates should be empty');
  assert.ok(atomizePlan.evidence.importRewrite, 'atomize importRewrite should exist');
  assert.ok(atomizePlan.evidence.shim, 'atomize shim should exist');
  assert.ok(atomizePlan.evidence.rollback, 'atomize rollback should exist');

  const infectPlan = await jsLanguageAdapterV2.planInfectDryRun(dryRunRequests.infectRequest);
  assert.equal(infectPlan.executionMode, 'dry-run', 'infect dry-run execution mode mismatch');
  assert.equal(infectPlan.evidence.planKind, 'infect', 'infect evidence planKind mismatch');
  assert.deepEqual(infectPlan.evidence.mutates, [], 'infect mutates should be empty');
  assert.ok(infectPlan.evidence.importRewrite, 'infect importRewrite should exist');
  assert.ok(infectPlan.evidence.shim, 'infect shim should exist');
  assert.ok(infectPlan.evidence.rollback, 'infect rollback should exist');

  const normalizedSymbol = jsLanguageAdapterV2.normalizeSymbolId({ rawSymbolId: 'MyClass', filePath: 'src/service.ts' });
  assert.ok(normalizedSymbol.normalized.includes('src/service.ts'), 'normalizeSymbolId should include file path');

  const routePlan = await jsLanguageAdapterV2.buildLegacyRoutePlan({
    intent: 'extract service atom',
    repositoryRoot: fixtureRoot,
  });
  assert.ok(routePlan.steps.length >= 3, 'route plan should have >= 3 steps');

  return {
    inventoryFileCount: analysis.inventory.files.length,
    dependencyEdgeCount: analysis.inventory.dependencyEdges?.length ?? 0,
    callEdgeCount: analysis.inventory.callEdges?.length ?? 0,
    artifactEdgeCount: analysis.inventory.artifactEdges?.length ?? 0,
    runtimeCommandCount: runtimeReport.commands.length,
    atomizeStepCount: atomizePlan.steps.length,
    infectStepCount: infectPlan.steps.length,
    routePlanStepCount: routePlan.steps.length,
  };
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-language-js] unsupported mode: ${mode}`);
    process.exit(2);
  }

  const failures = [];

  for (const relativePath of REQUIRED_FILES) {
    ensure(fs.existsSync(repoPath(relativePath)), `missing required file: ${relativePath}`, failures);
  }

  const analysisPath = repoPath('packages/language-js/src/js-static-analysis.ts');
  if (fs.existsSync(analysisPath)) {
    const source = fs.readFileSync(analysisPath, 'utf8');
    for (const snippet of REQUIRED_ANALYSIS_SNIPPETS) {
      ensure(source.includes(snippet), `missing snippet in js-static-analysis.ts: ${snippet}`, failures);
    }
  }

  const dryRunPath = repoPath('packages/language-js/src/js-dry-run.ts');
  if (fs.existsSync(dryRunPath)) {
    const source = fs.readFileSync(dryRunPath, 'utf8');
    for (const snippet of REQUIRED_DRY_RUN_SNIPPETS) {
      ensure(source.includes(snippet), `missing snippet in js-dry-run.ts: ${snippet}`, failures);
    }
    ensure(source.includes('mutates: []'), 'js-dry-run must keep mutates as empty array', failures);
  }

  if (failures.length > 0) {
    console.error('[validate-language-js] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  let summary;
  try {
    summary = await runFixtureCheck();
  } catch (error) {
    console.error('[validate-language-js] FAIL');
    console.error(`  - fixture check failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log('[validate-language-js] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();
