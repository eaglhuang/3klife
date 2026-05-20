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
  'packages/language-csharp/src/csharp-legacy-route.ts',
  'packages/language-csharp/src/csharp-registry.ts',
  'packages/language-csharp/src/csharp-symbol-index.ts',
  'packages/language-csharp/src/csharp-solution-graph.ts',
  'packages/language-csharp/src/csharp-csproj-risk.ts',
  'packages/language-csharp/src/csharp-readiness.ts',
  'tests/fixtures/language-csharp/sample-project/MyApp.sln',
  'tests/fixtures/language-csharp/sample-project/src/MyApp.csproj',
  'tests/fixtures/language-csharp/sample-project/src/Shared/Shared.csproj',
  'tests/fixtures/language-csharp/sample-project/tests/MyApp.Tests.csproj',
  'tests/fixtures/language-csharp/sample-project/Directory.Build.props',
  'tests/fixtures/language-csharp/sample-project/Directory.Packages.props',
  'tests/fixtures/language-csharp/sample-project/src/Core/SyntaxPlayground.cs',
  'tests/fixtures/language-csharp/sample-project/src/Models/WorkflowSnapshot.cs',
  'tests/fixtures/language-csharp/enterprise-solution/Contoso.sln',
  'tests/fixtures/language-csharp/enterprise-solution/src/Contoso.App/Contoso.App.csproj',
  'tests/fixtures/language-csharp/enterprise-solution/src/Contoso.Domain/Contoso.Domain.csproj',
  'tests/fixtures/language-csharp/enterprise-solution/src/Contoso.Infrastructure/Contoso.Infrastructure.csproj',
  'tests/fixtures/language-csharp/enterprise-solution/tests/Contoso.App.Tests/Contoso.App.Tests.csproj',
  'tests/fixtures/language-csharp/enterprise-solution/expected-smoke.json',
  'tests/fixtures/language-csharp/expected-report.json',
  'tests/fixtures/language-csharp/capability-baseline.json',
  'tests/fixtures/language-csharp/dry-run-requests.json',
  'tests/fixtures/language-csharp/diagnostics-sample.txt',
  'tests/fixtures/language-csharp/diagnostics-sarif.json',
  'tests/fixtures/language-csharp/diagnostics-sarif-variant.json',
  'tests/fixtures/language-csharp/readiness-thresholds.json',
  'tests/fixtures/language-csharp/equivalence-fixtures.json',
  'tests/atm-lang-csharp.test.ts',
];

const REQUIRED_SNIPPETS = [
  {
    path: 'packages/language-csharp/src/csharp-profile.ts',
    snippets: ['collectCSharpProjectEvidence(', 'parseCsprojProfile(', 'detectCSharpProjectProfile('],
  },
  {
    path: 'packages/language-csharp/src/csharp-inventory.ts',
    snippets: ['buildCSharpInventory(', 'buildMethodSignature(', 'createSymbolIdAllocator(', 'scanCSharpSourceInventory('],
  },
  {
    path: 'packages/language-csharp/src/csharp-risk-model.ts',
    snippets: ['buildCSharpRiskModel('],
  },
  {
    path: 'packages/language-csharp/src/csharp-diagnostics.ts',
    snippets: ['parseCSharpDiagnostics(', 'parseSarifDiagnostics('],
  },
  {
    path: 'packages/language-csharp/src/csharp-runtime.ts',
    snippets: ['detectCSharpRuntimeCommands('],
  },
  {
    path: 'packages/language-csharp/src/csharp-map.ts',
    snippets: [
      'buildCSharpAtomicMapDecomposition(',
      'deriveCSharpMapThresholdProfile(',
      'threshold-profile=',
    ],
  },
  {
    path: 'packages/language-csharp/src/csharp-equivalence.ts',
    snippets: ['computeCSharpEquivalenceContract('],
  },
  {
    path: 'packages/language-csharp/src/csharp-legacy-route.ts',
    snippets: ['parseCSharpLegacyRouteIntent(', 'buildCSharpLegacyRoutePlan('],
  },
  {
    path: 'packages/language-csharp/src/csharp-registry.ts',
    snippets: ['createCSharpAdapterCatalogEntry('],
  },
  {
    path: 'packages/language-csharp/src/csharp-symbol-index.ts',
    snippets: ['buildCSharpSymbolReferenceIndex('],
  },
  {
    path: 'packages/language-csharp/src/csharp-solution-graph.ts',
    snippets: ['buildCSharpSolutionProjectGraph('],
  },
  {
    path: 'packages/language-csharp/src/csharp-csproj-risk.ts',
    snippets: ['buildCSharpCsprojRiskModel('],
  },
  {
    path: 'packages/language-csharp/src/csharp-readiness.ts',
    snippets: ['evaluateCSharpReadinessGate('],
  },
  {
    path: 'packages/language-csharp/src/csharp-dry-run.ts',
    snippets: ['planCSharpAtomizeDryRun(', 'planCSharpInfectDryRun(', 'mutates: []'],
  },
  {
    path: 'packages/language-csharp/src/adapter.ts',
    snippets: [
      "sourceInventory: 'full'",
      "symbolNormalization: 'full'",
      "legacyRoutePlanning: 'full'",
      "atomicMapDecomposition: 'full'",
      "dependencyGraph: 'full'",
      "callGraph: 'full'",
      "artifactGraph: 'full'",
      'buildLegacyRoutePlan(request)',
      'buildAtomicMapDecomposition(request)',
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

function isSorted(values, selector) {
  for (let index = 1; index < values.length; index += 1) {
    if (selector(values[index - 1]).localeCompare(selector(values[index])) > 0) {
      return false;
    }
  }
  return true;
}

async function runFixtureCheck() {
  process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || 'tsconfig.test.json';
  require('ts-node/register/transpile-only');

  const {
    csharpLanguageAdapterV2,
    detectCSharpProjectProfile,
    collectCSharpProjectEvidence,
    buildCSharpInventory,
    buildCSharpPartialDeclarationIndex,
    buildCSharpRiskModel,
    parseCSharpDiagnostics,
    detectCSharpRuntimeCommands,
    buildCSharpAtomicMapDecomposition,
    computeCSharpEquivalenceContract,
    createCSharpAdapterCatalogEntry,
    parseCSharpLegacyRouteIntent,
    buildCSharpSymbolReferenceIndex,
    buildCSharpSolutionProjectGraph,
    buildCSharpCsprojRiskModel,
    evaluateCSharpReadinessGate,
  } = require('../packages/language-csharp/src');
  const { resolveLanguageAdapter } = require('../packages/core/src/guidance/language-adapter-resolver');
  const { planLegacyRouteWithAdapter } = require('../packages/core/src/guidance/legacy-route-delegation');

  const fixtureRoot = repoPath('tests/fixtures/language-csharp/sample-project');
  const expected = JSON.parse(
    fs.readFileSync(repoPath('tests/fixtures/language-csharp/expected-report.json'), 'utf8')
  );
  const capabilityBaseline = JSON.parse(
    fs.readFileSync(repoPath('tests/fixtures/language-csharp/capability-baseline.json'), 'utf8')
  );
  const dryRunRequests = JSON.parse(
    fs.readFileSync(repoPath('tests/fixtures/language-csharp/dry-run-requests.json'), 'utf8')
  );
  const enterpriseSmokeExpect = JSON.parse(
    fs.readFileSync(
      repoPath('tests/fixtures/language-csharp/enterprise-solution/expected-smoke.json'),
      'utf8'
    )
  );
  const diagnosticsRaw = fs.readFileSync(
    repoPath('tests/fixtures/language-csharp/diagnostics-sample.txt'),
    'utf8'
  );
  const diagnosticsSarifRaw = fs.readFileSync(
    repoPath('tests/fixtures/language-csharp/diagnostics-sarif.json'),
    'utf8'
  );
  const diagnosticsSarifVariantRaw = fs.readFileSync(
    repoPath('tests/fixtures/language-csharp/diagnostics-sarif-variant.json'),
    'utf8'
  );
  const readinessThresholds = JSON.parse(
    fs.readFileSync(repoPath('tests/fixtures/language-csharp/readiness-thresholds.json'), 'utf8')
  );
  const equivalenceFixtures = JSON.parse(
    fs.readFileSync(repoPath('tests/fixtures/language-csharp/equivalence-fixtures.json'), 'utf8')
  );

  const profile = detectCSharpProjectProfile(fixtureRoot);
  const projectEvidence = collectCSharpProjectEvidence(fixtureRoot);
  const solutionGraph = buildCSharpSolutionProjectGraph(fixtureRoot, projectEvidence);
  const csprojRisk = buildCSharpCsprojRiskModel(fixtureRoot, projectEvidence, solutionGraph);
  assert.equal(profile.languageId, 'csharp', 'profile languageId mismatch');
  assert.ok(profile.confidence >= 0.75, 'profile confidence should be >= 0.75');
  assert.ok(
    profile.evidence.some((entry) => entry.toLowerCase().includes('.sln#projects=')),
    'profile should include .sln deep parse evidence'
  );
  assert.ok(
    profile.evidence.some((entry) => entry.toLowerCase().includes('.csproj#tfm=')),
    'profile should include .csproj deep parse evidence'
  );
  assert.ok(profile.evidence.some((entry) => entry.toLowerCase().includes('directory.build.props')), 'profile should include Directory.Build.props');
  assert.ok(
    profile.evidence.some((entry) => entry.toLowerCase().includes('directory.packages.props')),
    'profile should include Directory.Packages.props'
  );
  assert.ok(projectEvidence.csprojProfiles.length >= 2, 'csproj deep parse should collect >= 2 projects');
  assert.equal(projectEvidence.hasDirectoryPackagesProps, true, 'Directory.Packages.props evidence missing');
  assert.ok(
    projectEvidence.directoryPackagesPropsProfiles.some(
      (entry) =>
        entry.relativePath === 'Directory.Packages.props' &&
        (entry.managePackageVersionsCentrally ?? '').toLowerCase() === 'true'
    ),
    'Directory.Packages.props should enable central package management'
  );
  assert.ok(
    projectEvidence.csprojProfiles.some((entry) => entry.relativePath === 'tests/MyApp.Tests.csproj' && entry.isTestProject),
    'csproj deep parse should detect test project'
  );
  const appProject = projectEvidence.csprojProfiles.find((entry) => entry.relativePath === 'src/MyApp.csproj');
  assert.ok(appProject, 'missing src/MyApp.csproj profile');
  assert.ok(appProject.targetFrameworks.includes('net8.0'), 'src/MyApp.csproj should include net8.0');
  assert.ok(appProject.targetFrameworks.includes('net9.0'), 'src/MyApp.csproj should include net9.0');
  assert.ok(
    appProject.packageReferences.includes('Serilog'),
    'src/MyApp.csproj should include Serilog package reference'
  );
  assert.ok(
    appProject.projectReferences.includes('Shared/Shared.csproj'),
    'src/MyApp.csproj should include Shared/Shared.csproj reference'
  );
  assert.equal(
    appProject.usesCentralPackageManagement,
    true,
    'src/MyApp.csproj should enable central package management pattern'
  );
  assert.ok(
    appProject.packageReferencesWithoutVersion.includes('Serilog'),
    'src/MyApp.csproj should include Serilog without explicit version'
  );
  assert.ok(
    appProject.conditionalPropertyGroups.length >= 1,
    'src/MyApp.csproj should include conditional property group'
  );
  assert.ok(
    appProject.conditionalItemGroups.length >= 1,
    'src/MyApp.csproj should include conditional item group'
  );
  assert.ok(
    projectEvidence.directoryBuildPropsProfiles.some(
      (entry) => entry.relativePath === 'Directory.Build.props' && entry.treatWarningsAsErrors === 'true'
    ),
    'Directory.Build.props should include TreatWarningsAsErrors=true'
  );
  assert.ok(solutionGraph.summary.projectCount >= 2, 'solution graph should include >= 2 projects');
  assert.ok(
    solutionGraph.edges.some((edge) => edge.relation === 'project-reference'),
    'solution graph should include project-reference edges'
  );
  assert.ok(
    csprojRisk.findings.some((finding) => finding.kind === 'multi-target-framework'),
    'csproj risk should detect multi-target framework'
  );
  assert.ok(
    csprojRisk.findings.some((finding) => finding.kind === 'central-package-management-detected'),
    'csproj risk should detect central package management signal'
  );
  assert.ok(
    csprojRisk.findings.some((finding) => finding.kind === 'conditional-build-configuration'),
    'csproj risk should detect conditional build configuration signal'
  );

  const analysis = buildCSharpInventory({
    repositoryRoot: fixtureRoot,
    includeGlobs: ['**/*.cs'],
  });
  const partialIndex = buildCSharpPartialDeclarationIndex(analysis.moduleAnalyses);
  const symbolReferenceIndex = buildCSharpSymbolReferenceIndex(analysis);
  const risk = buildCSharpRiskModel(analysis.moduleAnalyses);
  const diagnostics = parseCSharpDiagnostics({
    rawDiagnostics: diagnosticsRaw,
    source: 'dotnet-build-log',
  });
  const diagnosticsSarif = parseCSharpDiagnostics({
    rawDiagnostics: diagnosticsSarifRaw,
    source: 'sarif',
  });
  const diagnosticsSarifVariant = parseCSharpDiagnostics({
    rawDiagnostics: diagnosticsSarifVariantRaw,
    source: 'sarif-variant',
  });
  const runtimeCommands = await detectCSharpRuntimeCommands({
    repositoryRoot: fixtureRoot,
    includeRisky: false,
  });

  const enterpriseRoot = repoPath('tests/fixtures/language-csharp/enterprise-solution');
  const enterpriseProfile = detectCSharpProjectProfile(enterpriseRoot);
  const enterpriseEvidence = collectCSharpProjectEvidence(enterpriseRoot);
  const enterpriseAnalysis = buildCSharpInventory({
    repositoryRoot: enterpriseRoot,
    includeGlobs: ['**/*.cs'],
  });
  const enterpriseSymbolIndex = buildCSharpSymbolReferenceIndex(enterpriseAnalysis);
  const enterpriseGraph = buildCSharpSolutionProjectGraph(enterpriseRoot, enterpriseEvidence);
  const enterpriseRisk = buildCSharpCsprojRiskModel(
    enterpriseRoot,
    enterpriseEvidence,
    enterpriseGraph
  );

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
  const overloadFile = analysis.inventory.files.find(
    (entry) => entry.filePath === 'src/Core/Overloads.cs'
  );
  assert.ok(overloadFile, 'missing overload fixture file');
  const overloadMethods = (overloadFile.symbols ?? []).filter(
    (symbol) => symbol.kind === 'method' && symbol.displayName.endsWith('.Sum')
  );
  assert.equal(overloadMethods.length, 2, 'overload fixture should emit two Sum methods');
  assert.equal(
    new Set(overloadMethods.map((symbol) => symbol.symbolId)).size,
    overloadMethods.length,
    'overload method symbolIds should be stable and unique'
  );
  assert.ok(
    symbolReferenceIndex.references.length >= 5,
    'symbol reference index should include >= 5 call references'
  );
  assert.ok(
    symbolReferenceIndex.resolvedCount >= 2,
    'symbol reference index should resolve at least 2 references'
  );
  assert.ok(
    symbolReferenceIndex.references.some(
      (reference) =>
        reference.callee.toLowerCase().startsWith('jointokens') && reference.resolution === 'resolved'
    ),
    'symbol reference index should resolve JoinTokens call from using static context'
  );
  assert.ok(
    symbolReferenceIndex.references.some(
      (reference) =>
        reference.callee.toLowerCase().startsWith('corealias.tag') &&
        reference.resolution === 'resolved'
    ),
    'symbol reference index should resolve alias using call target'
  );
  assert.ok(
    symbolReferenceIndex.references.some(
      (reference) =>
        reference.callee.toLowerCase().startsWith('identity') && reference.resolution === 'resolved'
    ),
    'symbol reference index should resolve generic Identity call'
  );

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
  assert.equal(
    isSorted(analysis.inventory.files ?? [], (entry) => entry.filePath),
    true,
    'inventory files should be sorted by filePath'
  );
  for (const fileEntry of analysis.inventory.files ?? []) {
    assert.equal(
      isSorted(
        fileEntry.symbols ?? [],
        (symbol) =>
          `${symbol.range.startLine}:${symbol.range.startColumn}:${symbol.range.endLine}:${symbol.range.endColumn}|${symbol.kind}|${symbol.displayName}|${symbol.symbolId}`
      ),
      true,
      `symbols should be sorted deterministically: ${fileEntry.filePath}`
    );
  }
  assert.equal(
    isSorted(
      analysis.inventory.dependencyEdges ?? [],
      (edge) => `${edge.from}|${edge.to}|${edge.relation}|${edge.evidence ?? ''}`
    ),
    true,
    'dependency edges should be sorted deterministically'
  );
  assert.equal(
    isSorted(
      analysis.inventory.callEdges ?? [],
      (edge) => `${edge.from}|${edge.to}|${edge.relation}|${edge.evidence ?? ''}`
    ),
    true,
    'call edges should be sorted deterministically'
  );
  assert.equal(
    isSorted(
      analysis.inventory.artifactEdges ?? [],
      (edge) => `${edge.from}|${edge.to}|${edge.relation}|${edge.evidence ?? ''}`
    ),
    true,
    'artifact edges should be sorted deterministically'
  );
  assert.equal(
    isSorted(analysis.inventory.warnings ?? [], (warning) => warning),
    true,
    'inventory warnings should be sorted deterministically'
  );
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
  assert.ok(diagnosticsSarif.diagnostics.length >= 2, 'sarif diagnostics should parse >= 2 entries');
  assert.ok(
    diagnosticsSarif.diagnostics.some((entry) => entry.code === 'CA1822' && entry.severity === 'warning'),
    'sarif diagnostics should include CA1822 warning'
  );
  assert.ok(
    diagnosticsSarif.diagnostics.some((entry) => entry.code === 'CS8618' && entry.severity === 'error'),
    'sarif diagnostics should include CS8618 error'
  );
  assert.ok(
    diagnosticsSarifVariant.diagnostics.some(
      (entry) => entry.code === 'CA1303' && entry.severity === 'warning'
    ),
    'sarif variant diagnostics should include CA1303 warning'
  );
  assert.ok(
    diagnosticsSarifVariant.diagnostics.some(
      (entry) => entry.code === 'CS8602' && entry.severity === 'error'
    ),
    'sarif variant diagnostics should include CS8602 error'
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
  const enterpriseMapReport = await buildCSharpAtomicMapDecomposition({
    mapId: 'ATM-MAP-LANG-CSHARP-0210',
    repositoryRoot: enterpriseRoot,
    sourceInventory: enterpriseAnalysis.inventory,
  });
  assert.equal(atomizePlan.executionMode, 'dry-run', 'atomize execution mode mismatch');
  assert.equal(infectPlan.executionMode, 'dry-run', 'infect execution mode mismatch');
  assert.deepEqual(atomizePlan.evidence.mutates, [], 'atomize mutates should be empty');
  assert.deepEqual(infectPlan.evidence.mutates, [], 'infect mutates should be empty');
  assert.equal(mapReport.evidenceGate?.accepted, true, 'atomic map decomposition evidence gate should pass');
  assert.ok((mapReport.entrypoints ?? []).length >= 1, 'atomic map decomposition should include entrypoints');
  assert.ok(
    enterpriseProfile.confidence >= 0.9,
    'enterprise profile confidence should be >= 0.9'
  );
  assert.ok(
    enterpriseGraph.summary.projectCount >= enterpriseSmokeExpect.minProjects,
    `enterprise solution should include >= ${enterpriseSmokeExpect.minProjects} projects`
  );
  assert.ok(
    enterpriseAnalysis.inventory.files.length >= enterpriseSmokeExpect.minCsFiles,
    `enterprise inventory should include >= ${enterpriseSmokeExpect.minCsFiles} C# files`
  );
  assert.ok(
    enterpriseGraph.edges.filter((edge) => edge.relation === 'project-reference').length >=
      enterpriseSmokeExpect.minProjectReferenceEdges,
    `enterprise graph should include >= ${enterpriseSmokeExpect.minProjectReferenceEdges} project-reference edges`
  );
  assert.ok(
    enterpriseSymbolIndex.resolvedCount >= enterpriseSmokeExpect.minResolvedSymbolReferences,
    `enterprise symbol index should resolve >= ${enterpriseSmokeExpect.minResolvedSymbolReferences} references`
  );
  assert.ok(
    enterpriseMapReport.members.length >= enterpriseSmokeExpect.minMapMembers,
    `enterprise map members should be >= ${enterpriseSmokeExpect.minMapMembers}`
  );
  assert.ok(
    (enterpriseMapReport.evidenceGate?.messages ?? []).some((message) =>
      message.includes(`threshold-profile=${enterpriseSmokeExpect.requiredThresholdProfile}`)
    ),
    `enterprise map should use threshold profile ${enterpriseSmokeExpect.requiredThresholdProfile}`
  );
  assert.ok(
    enterpriseRisk.findings.some((finding) => finding.kind === 'multi-target-framework'),
    'enterprise csproj risk should detect multi-target framework'
  );
  const sampleReadiness = evaluateCSharpReadinessGate({
    inventoryFileCount: analysis.inventory.files.length,
    symbolReferenceIndex,
    csprojRisk,
    mapReport,
    thresholds: readinessThresholds.sample,
  });
  const enterpriseReadiness = evaluateCSharpReadinessGate({
    inventoryFileCount: enterpriseAnalysis.inventory.files.length,
    symbolReferenceIndex: enterpriseSymbolIndex,
    csprojRisk: enterpriseRisk,
    mapReport: enterpriseMapReport,
    thresholds: readinessThresholds.enterprise,
  });
  assert.ok(sampleReadiness.checks.length >= 6, 'sample readiness should include threshold checks');
  assert.ok(
    sampleReadiness.checks.some((check) => check.checkId === 'map-evidence-gate'),
    'sample readiness should include map evidence gate check'
  );
  assert.ok(
    enterpriseReadiness.checks.some((check) => check.checkId === 'resolved-references'),
    'enterprise readiness should include resolved reference threshold check'
  );

  for (const fixture of equivalenceFixtures.cases) {
    const result = computeCSharpEquivalenceContract({
      fixtureId: fixture.fixtureId,
      expectedBehavior: fixture.expectedBehavior,
    });
    assert.equal(result.accepted, fixture.accepted, `equivalence mismatch: ${fixture.fixtureId}`);
  }

  assert.equal(csharpLanguageAdapterV2.languageId, 'csharp', 'adapter languageId mismatch');
  assert.equal(csharpLanguageAdapterV2.contractVersion, 'v2', 'adapter contractVersion mismatch');
  assert.equal(csharpLanguageAdapterV2.adapterId, capabilityBaseline.adapterId, 'adapterId baseline mismatch');
  assert.equal(
    csharpLanguageAdapterV2.languageId,
    capabilityBaseline.languageId,
    'languageId baseline mismatch'
  );
  for (const [capability, level] of Object.entries(capabilityBaseline.capabilities ?? {})) {
    assert.equal(
      csharpLanguageAdapterV2.capabilities?.[capability],
      level,
      `capability baseline mismatch: ${capability}`
    );
  }
  assert.equal(typeof csharpLanguageAdapterV2.buildLegacyRoutePlan, 'function', 'buildLegacyRoutePlan should exist');
  assert.equal(typeof csharpLanguageAdapterV2.buildAtomicMapDecomposition, 'function', 'buildAtomicMapDecomposition should exist');

  const normalizedSymbol = csharpLanguageAdapterV2.normalizeSymbolId({
    rawSymbolId: 'MyApp.Core.Overloads.Sum(string left, string right)',
    filePath: 'src/Core/Overloads.cs',
  });
  assert.ok(
    normalizedSymbol.normalized.includes('src/core/overloads.cs#'),
    'normalizeSymbolId should keep file path and canonical casing'
  );

  const routeIntent = parseCSharpLegacyRouteIntent('plan atomize route for generated outputs');
  assert.equal(routeIntent.action, 'atomize', 'legacy route intent action mismatch');
  assert.ok(routeIntent.focus.includes('generated'), 'legacy route intent should preserve focus tokens');

  const catalogEntry = createCSharpAdapterCatalogEntry();
  assert.equal(catalogEntry.adapterId, 'csharp-future', 'catalog entry adapterId mismatch');
  assert.ok(catalogEntry.languageIds.includes('csharp'), 'catalog entry should include csharp language id');
  assert.ok(catalogEntry.languageIds.includes('c#'), 'catalog entry should include c# alias');
  const resolution = resolveLanguageAdapter({
    languageId: 'csharp',
    requiredCapabilities: ['sourceInventory', 'legacyRoutePlanning', 'runtimeCommandDetection'],
    allowPartialCapability: true,
    discoveryInput: {
      bundledAdapters: [catalogEntry],
    },
  });
  assert.equal(resolution.selected?.adapterId, 'csharp-future', 'resolver should select csharp adapter');
  assert.equal(resolution.ok, true, 'resolver should pass with partial capability allowed');
  assert.ok(
    resolution.selected?.fallback.advisory.includes('runtimeCommandDetection'),
    'resolver advisory should include runtimeCommandDetection partial capability'
  );

  const delegatedRoute = await planLegacyRouteWithAdapter({
    intent: 'plan atomize route',
    repositoryRoot: fixtureRoot,
    languageId: 'csharp',
    adapterResolution: resolution,
    adapterDelegate: (request) => csharpLanguageAdapterV2.buildLegacyRoutePlan(request),
  });
  assert.equal(delegatedRoute.mode, 'adapter-delegated', 'legacy route should be adapter delegated');
  assert.ok(
    delegatedRoute.routeReport.routeId.startsWith('csharp-future-'),
    'legacy route id should use csharp future prefix'
  );

  const validationReport = csharpLanguageAdapterV2.validateComputeAtom({ repositoryRoot: fixtureRoot });
  assert.equal(validationReport.ok, true, 'validateComputeAtom should pass on fixture');
  assert.ok(
    validationReport.messages.some((message) => message.includes('future feasibility mode')),
    'validateComputeAtom should mention future feasibility mode'
  );

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
    resolvedSymbolReferenceCount: symbolReferenceIndex.resolvedCount,
    enterpriseProjectCount: enterpriseGraph.summary.projectCount,
    enterpriseMapMemberCount: enterpriseMapReport.members.length,
    enterpriseRiskFindingCount: enterpriseRisk.findings.length,
    sampleReadinessStage: sampleReadiness.stage,
    enterpriseReadinessStage: enterpriseReadiness.stage,
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
