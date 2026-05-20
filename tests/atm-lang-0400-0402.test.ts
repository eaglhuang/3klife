import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveLanguageAdapter } from '../packages/core/src/guidance/language-adapter-resolver';
import { rankCandidatesWithAdapter } from '../packages/core/src/guidance/candidates-rank-service';
import { candidatesRank } from '../packages/cli/src/commands/candidates';

interface RankingFixtureCase {
  id: string;
  request: {
    repositoryRoot: string;
    inventoryArtifactPath: string;
    resolutionRequest: any;
  };
  inventory: any;
  expect: {
    ok: boolean;
    mode: 'adapter-delegated' | 'generic-fallback';
    selectedAdapterId: string;
    inventoryArtifactPath: string;
    scoreTotal: number;
    advisorySignalIds: string[];
    unsupportedSignalIds: string[];
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

async function main(): Promise<void> {
  const fixturePath = path.resolve(
    __dirname,
    'fixtures/language-candidates-ranking/ranking-fixtures.json'
  );
  const fixtures = readJson<{ cases: RankingFixtureCase[] }>(fixturePath);

  for (const fixture of fixtures.cases) {
    const resolution = resolveLanguageAdapter(fixture.request.resolutionRequest);
    const serviceReport = await rankCandidatesWithAdapter({
      languageId: fixture.request.resolutionRequest.languageId,
      repositoryRoot: fixture.request.repositoryRoot,
      adapterResolution: resolution,
      inventoryArtifactPath: fixture.request.inventoryArtifactPath,
      adapterScanSourceInventory: async () => fixture.inventory,
    });

    assert.equal(serviceReport.ok, fixture.expect.ok, `[${fixture.id}] service ok mismatch`);
    assert.equal(serviceReport.inventory.mode, fixture.expect.mode, `[${fixture.id}] inventory mode mismatch`);
    assert.equal(
      serviceReport.selectedAdapterId,
      fixture.expect.selectedAdapterId,
      `[${fixture.id}] selected adapter mismatch`
    );
    assert.equal(
      serviceReport.inventoryArtifactPath,
      fixture.expect.inventoryArtifactPath,
      `[${fixture.id}] inventory artifact path mismatch`
    );
    assert.equal(
      serviceReport.ranking.score.total,
      fixture.expect.scoreTotal,
      `[${fixture.id}] score total mismatch`
    );
    assert.deepEqual(
      serviceReport.ranking.advisorySignalIds,
      fixture.expect.advisorySignalIds,
      `[${fixture.id}] advisory signal mismatch`
    );
    assert.deepEqual(
      serviceReport.ranking.unsupportedSignalIds,
      fixture.expect.unsupportedSignalIds,
      `[${fixture.id}] unsupported signal mismatch`
    );

    for (const signal of serviceReport.ranking.signals) {
      assert.equal(
        signal.provenance.adapterId,
        fixture.expect.selectedAdapterId,
        `[${fixture.id}] provenance adapter mismatch for ${signal.signalId}`
      );
      assert.equal(
        signal.provenance.inventoryArtifactPath,
        fixture.expect.inventoryArtifactPath,
        `[${fixture.id}] provenance artifact path mismatch for ${signal.signalId}`
      );
    }

    const cliReport = await candidatesRank({
      ...fixture.request.resolutionRequest,
      repositoryRoot: fixture.request.repositoryRoot,
      inventoryArtifactPath: fixture.request.inventoryArtifactPath,
      adapterScanSourceInventory: async () => fixture.inventory,
    });

    assert.equal(cliReport.ok, fixture.expect.ok, `[${fixture.id}] CLI ok mismatch`);
    assert.equal(
      cliReport.report.inventoryArtifactPath,
      fixture.expect.inventoryArtifactPath,
      `[${fixture.id}] CLI artifact path mismatch`
    );
    assert.deepEqual(
      cliReport.report.ranking.score,
      serviceReport.ranking.score,
      `[${fixture.id}] CLI score should mirror service score`
    );
    assert.ok(
      cliReport.summaryLines.some((line) => line.includes(fixture.expect.inventoryArtifactPath)),
      `[${fixture.id}] CLI summary should include inventory artifact path`
    );
  }

  const cliSource = fs.readFileSync(
    path.resolve(__dirname, '../packages/cli/src/commands/candidates.ts'),
    'utf8'
  );
  assert.ok(
    cliSource.includes('rankCandidatesWithAdapter'),
    'candidates CLI command should delegate to rankCandidatesWithAdapter'
  );
  const forbiddenFunctionDeclarations = [
    'scanSourceInventory',
    'buildLegacyRoutePlan',
    'planAtomizeDryRun',
    'planInfectDryRun',
    'buildAtomicMapDecomposition',
    'computeEquivalenceContract',
    'normalizeSymbolId',
    'detectRuntimeCommands',
    'parseDiagnostics',
  ];
  for (const functionName of forbiddenFunctionDeclarations) {
    const pattern = new RegExp(`\\bfunction\\s+${functionName}\\s*\\(`);
    assert.equal(
      pattern.test(cliSource),
      false,
      `candidates CLI facade should not implement core function ${functionName}`
    );
  }

  console.log('[atm-lang-0400-0402.test] PASS');
}

main().catch((error) => {
  console.error('[atm-lang-0400-0402.test] FAIL');
  console.error(error);
  process.exit(1);
});

