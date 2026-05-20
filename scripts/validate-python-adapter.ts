const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const REQUIRED_FILES = [
  'packages/language-python/src/index.ts',
  'packages/language-python/src/adapter.ts',
  'packages/language-python/src/python-static-analysis.ts',
  'fixtures/python-adapter/sample-project/app/main.py',
  'fixtures/python-adapter/sample-project/app/service.py',
  'fixtures/python-adapter/sample-project/app/api.py',
  'fixtures/python-adapter/expected-report.json',
];

const REQUIRED_SNIPPETS = [
  'buildPythonAstInventory(',
  'buildPythonDependencyCallArtifactGraph(',
  'detectPythonCliApiSideEffects(',
  'scanPythonSourceInventory(',
  'detectPythonRuntimeCommands(',
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
    pythonLanguageAdapterV2,
  } = require('../packages/language-python/src');

  const fixtureRoot = repoPath('fixtures/python-adapter/sample-project');
  const expected = JSON.parse(
    fs.readFileSync(repoPath('fixtures/python-adapter/expected-report.json'), 'utf8')
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

  return {
    inventoryFileCount: analysis.inventory.files.length,
    dependencyEdgeCount: analysis.inventory.dependencyEdges?.length ?? 0,
    callEdgeCount: analysis.inventory.callEdges?.length ?? 0,
    artifactEdgeCount: analysis.inventory.artifactEdges?.length ?? 0,
    runtimeCommandCount: runtimeReport.commands.length,
    runtimeWarningCount: runtimeReport.warnings?.length ?? 0,
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

  const analysisPath = repoPath('packages/language-python/src/python-static-analysis.ts');
  if (fs.existsSync(analysisPath)) {
    const source = fs.readFileSync(analysisPath, 'utf8');
    for (const snippet of REQUIRED_SNIPPETS) {
      ensure(source.includes(snippet), `missing snippet in python-static-analysis.ts: ${snippet}`, failures);
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

