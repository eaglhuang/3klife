const assert = require('node:assert/strict');
const fs = require('fs');

const { parseMode, repoPath } = require('./atm-lang-validator-common.ts');

const REQUIRED_FILES = [
  'packages/language-csharp/src/index.ts',
  'packages/language-csharp/src/adapter.ts',
  'packages/language-csharp/src/csharp-profile.ts',
  'packages/language-csharp/src/csharp-inventory.ts',
  'packages/language-csharp/src/csharp-risk-model.ts',
  'packages/language-csharp/src/csharp-diagnostics.ts',
  'packages/language-csharp/src/csharp-dry-run.ts',
  'packages/language-csharp/src/csharp-runtime.ts',
  'packages/language-csharp/src/csharp-map.ts',
  'packages/language-csharp/src/csharp-equivalence.ts',
  'tests/fixtures/language-csharp/sample-project/MyApp.sln',
  'tests/fixtures/language-csharp/sample-project/src/MyApp.csproj',
  'tests/fixtures/language-csharp/sample-project/Directory.Build.props',
  'tests/fixtures/language-csharp/expected-report.json',
  'tests/fixtures/language-csharp/dry-run-requests.json',
  'tests/fixtures/language-csharp/diagnostics-sample.txt',
  'tests/fixtures/language-csharp/equivalence-fixtures.json',
  'tests/atm-lang-csharp.test.ts',
];

const REQUIRED_SNIPPETS = [
  {
    path: 'packages/language-csharp/src/csharp-profile.ts',
    snippets: ['collectCSharpProjectEvidence(', 'detectCSharpProjectProfile('],
  },
  {
    path: 'packages/language-csharp/src/csharp-inventory.ts',
    snippets: ['buildCSharpInventory(', 'scanCSharpSourceInventory('],
  },
  {
    path: 'packages/language-csharp/src/csharp-risk-model.ts',
    snippets: ['buildCSharpRiskModel('],
  },
  {
    path: 'packages/language-csharp/src/csharp-diagnostics.ts',
    snippets: ['parseCSharpDiagnostics('],
  },
  {
    path: 'packages/language-csharp/src/csharp-runtime.ts',
    snippets: ['detectCSharpRuntimeCommands('],
  },
  {
    path: 'packages/language-csharp/src/csharp-map.ts',
    snippets: ['buildCSharpAtomicMapDecomposition('],
  },
  {
    path: 'packages/language-csharp/src/csharp-equivalence.ts',
    snippets: ['computeCSharpEquivalenceContract('],
  },
  {
    path: 'packages/language-csharp/src/csharp-dry-run.ts',
    snippets: ['planCSharpAtomizeDryRun(', 'planCSharpInfectDryRun(', 'mutates: []'],
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
    csharpLanguageAdapterV2,
    detectCSharpProjectProfile,
    buildCSharpInventory,
    buildCSharpPartialDeclarationIndex,
    buildCSharpRiskModel,
    parseCSharpDiagnostics,
    detectCSharpRuntimeCommands,
    buildCSharpAtomicMapDecomposition,
    computeCSharpEquivalenceContract,
  } = require('../packages/language-csharp/src');

  const fixtureRoot = repoPath('tests/fixtures/language-csharp/sample-project');
  const expected = JSON.parse(
    fs.readFileSync(repoPath('tests/fixtures/language-csharp/expected-report.json'), 'utf8')
  );
  const dryRunRequests = JSON.parse(
    fs.readFileSync(repoPath('tests/fixtures/language-csharp/dry-run-requests.json'), 'utf8')
  );
  const diagnosticsRaw = fs.readFileSync(
    repoPath('tests/fixtures/language-csharp/diagnostics-sample.txt'),
    'utf8'
  );
  const equivalenceFixtures = JSON.parse(
    fs.readFileSync(repoPath('tests/fixtures/language-csharp/equivalence-fixtures.json'), 'utf8')
  );

  const profile = detectCSharpProjectProfile(fixtureRoot);
  assert.equal(profile.languageId, 'csharp', 'profile languageId mismatch');
  assert.ok(profile.confidence >= 0.75, 'profile confidence should be >= 0.75');
  assert.ok(profile.evidence.some((entry) => entry.toLowerCase().endsWith('.sln')), 'profile should include .sln evidence');
  assert.ok(profile.evidence.some((entry) => entry.toLowerCase().endsWith('.csproj')), 'profile should include .csproj evidence');
  assert.ok(profile.evidence.some((entry) => entry.toLowerCase().includes('directory.build.props')), 'profile should include Directory.Build.props');

  const analysis = buildCSharpInventory({
    repositoryRoot: fixtureRoot,
    includeGlobs: ['**/*.cs'],
  });
  const partialIndex = buildCSharpPartialDeclarationIndex(analysis.moduleAnalyses);
  const risk = buildCSharpRiskModel(analysis.moduleAnalyses);
  const diagnostics = parseCSharpDiagnostics({
    rawDiagnostics: diagnosticsRaw,
    source: 'dotnet-build-log',
  });
  const runtimeCommands = await detectCSharpRuntimeCommands({
    repositoryRoot: fixtureRoot,
    includeRisky: false,
  });

  for (const requiredFile of expected.requiredFiles) {
    assert.ok(
      analysis.inventory.files.some((entry) => entry.filePath === requiredFile),
      `missing inventory file: ${requiredFile}`
    );
  }

  for (const requiredKind of expected.requiredSymbolKinds) {
    assert.ok(
      analysis.inventory.files.some((fileEntry) =>
        (fileEntry.symbols ?? []).some((symbol) => symbol.kind === requiredKind)
      ),
      `missing symbol kind: ${requiredKind}`
    );
  }

  for (const fileEntry of analysis.inventory.files) {
    for (const symbol of fileEntry.symbols ?? []) {
      assert.ok(
        symbol.range.startLine >= 1 &&
          symbol.range.endLine >= symbol.range.startLine &&
          symbol.range.endColumn >= symbol.range.startColumn,
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
  for (const partialTypeKey of expected.requiredPartialTypeKeys ?? []) {
    assert.ok(
      partialIndex.groups.some((group) => group.fullTypeKey === partialTypeKey),
      `missing partial type key: ${partialTypeKey}`
    );
  }

  assert.ok(risk.findings.some((finding) => finding.kind === 'partial-declaration'), 'risk model should detect partial declarations');
  assert.ok(risk.findings.some((finding) => finding.kind === 'generated-file'), 'risk model should detect generated files');
  assert.ok(risk.findings.some((finding) => finding.kind === 'auto-generated-header'), 'risk model should detect auto-generated headers');

  assert.ok(diagnostics.diagnostics.length >= 3, 'diagnostics parser should parse >= 3 entries');
  assert.ok(diagnostics.diagnostics.some((entry) => entry.severity === 'error'), 'diagnostics should include error entries');
  assert.ok(diagnostics.diagnostics.some((entry) => entry.code && entry.code.startsWith('CS')), 'diagnostics should include CS code');
  assert.ok(diagnostics.diagnostics.some((entry) => entry.code && entry.code.startsWith('MSB')), 'diagnostics should include MSB code');
  assert.ok(diagnostics.diagnostics.some((entry) => entry.code && entry.code.startsWith('CA')), 'diagnostics should include analyzer codes');
  assert.ok(
    diagnostics.diagnostics.some((entry) => entry.message.includes('promoted by TreatWarningsAsErrors')),
    'diagnostics should preserve multiline continuation context'
  );

  assert.ok(runtimeCommands.commands.length >= 3, 'runtime command detection should return advisory commands');
  assert.ok(
    runtimeCommands.commands.some((command) => command.command.startsWith('dotnet build')),
    'runtime commands should include dotnet build advisory'
  );
  assert.ok(
    (runtimeCommands.warnings ?? []).some((warning) => warning.includes('advisory commands only')),
    'runtime command warnings should mention advisory-only behavior'
  );

  const atomizePlan = await csharpLanguageAdapterV2.planAtomizeDryRun(dryRunRequests.atomizeRequest);
  const infectPlan = await csharpLanguageAdapterV2.planInfectDryRun(dryRunRequests.infectRequest);
  const mapReport = await buildCSharpAtomicMapDecomposition({
    mapId: 'ATM-MAP-LANG-CSHARP-0105',
    repositoryRoot: fixtureRoot,
    sourceInventory: analysis.inventory,
    minMembers: 3,
    minEdges: 1,
    minEntrypoints: 1,
  });
  assert.equal(atomizePlan.executionMode, 'dry-run', 'atomize execution mode mismatch');
  assert.equal(infectPlan.executionMode, 'dry-run', 'infect execution mode mismatch');
  assert.deepEqual(atomizePlan.evidence.mutates, [], 'atomize mutates should be empty');
  assert.deepEqual(infectPlan.evidence.mutates, [], 'infect mutates should be empty');
  assert.equal(mapReport.evidenceGate?.accepted, true, 'atomic map decomposition evidence gate should pass');
  assert.ok((mapReport.entrypoints ?? []).length >= 1, 'atomic map decomposition should include entrypoints');

  for (const fixture of equivalenceFixtures.cases) {
    const result = computeCSharpEquivalenceContract({
      fixtureId: fixture.fixtureId,
      expectedBehavior: fixture.expectedBehavior,
    });
    assert.equal(result.accepted, fixture.accepted, `equivalence mismatch: ${fixture.fixtureId}`);
  }

  assert.equal(csharpLanguageAdapterV2.languageId, 'csharp', 'adapter languageId mismatch');
  assert.equal(csharpLanguageAdapterV2.contractVersion, 'v2', 'adapter contractVersion mismatch');
  assert.equal(csharpLanguageAdapterV2.capabilities?.sourceInventory, 'partial', 'sourceInventory capability mismatch');
  assert.equal(csharpLanguageAdapterV2.capabilities?.atomizeDryRun, 'partial', 'atomize capability mismatch');
  assert.equal(csharpLanguageAdapterV2.capabilities?.infectDryRun, 'partial', 'infect capability mismatch');
  assert.equal(csharpLanguageAdapterV2.capabilities?.diagnosticsParsing, 'partial', 'diagnostics capability mismatch');
  assert.equal(csharpLanguageAdapterV2.capabilities?.runtimeCommandDetection, 'partial', 'runtime command capability mismatch');
  assert.equal(csharpLanguageAdapterV2.capabilities?.atomicMapDecomposition, 'partial', 'atomic map capability mismatch');
  assert.equal(csharpLanguageAdapterV2.capabilities?.equivalenceContract, 'partial', 'equivalence capability mismatch');

  const validationReport = csharpLanguageAdapterV2.validateComputeAtom({ repositoryRoot: fixtureRoot });
  assert.equal(validationReport.ok, true, 'validateComputeAtom should pass on fixture');
  assert.ok(validationReport.messages.some((message) => message.includes('future/partial')), 'validateComputeAtom should mention future/partial');

  return {
    inventoryFileCount: analysis.inventory.files.length,
    symbolCount: analysis.inventory.files.reduce((acc, file) => acc + ((file.symbols ?? []).length), 0),
    dependencyEdgeCount: analysis.inventory.dependencyEdges?.length ?? 0,
    callEdgeCount: analysis.inventory.callEdges?.length ?? 0,
    artifactEdgeCount: analysis.inventory.artifactEdges?.length ?? 0,
    riskFindingCount: risk.findings.length,
    partialGroupCount: partialIndex.groups.length,
    diagnosticsCount: diagnostics.diagnostics.length,
    runtimeCommandCount: runtimeCommands.commands.length,
    mapMemberCount: mapReport.members.length,
    mapEdgeCount: mapReport.edges.length,
    atomizeStepCount: atomizePlan.steps.length,
    infectStepCount: infectPlan.steps.length,
    equivalenceCaseCount: equivalenceFixtures.cases.length,
  };
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode !== 'validate') {
    console.log(`[validate-language-csharp] unsupported mode: ${mode}`);
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
    console.error('[validate-language-csharp] FAIL');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  let summary;
  try {
    summary = await runFixtureCheck();
  } catch (error) {
    console.error('[validate-language-csharp] FAIL');
    console.error(`  - fixture check failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log('[validate-language-csharp] PASS');
  console.log(JSON.stringify(summary, null, 2));
}

main();
