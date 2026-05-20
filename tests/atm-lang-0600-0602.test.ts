import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import {
  buildGraphToMapDecompositionProposal,
} from '../packages/core/src/guidance/atomic-map-decomposition';
import {
  isAtomicMapDecompositionGateAccepted,
  type AtomicMapDecompositionRequest,
} from '../packages/plugin-sdk/src/language-adapter';

interface FixtureCase {
  id: string;
  request: AtomicMapDecompositionRequest;
  expect: {
    accepted: boolean;
    minMembers?: number;
    minEdges?: number;
    missingContains?: string;
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function main(): void {
  const fixturePath = path.resolve(
    __dirname,
    'fixtures/language-map-decomposition/decomposition-fixtures.json'
  );
  const fixtures = readJson<{ cases: FixtureCase[] }>(fixturePath);

  const sourceInventorySchema = readJson<Record<string, unknown>>(
    path.resolve(__dirname, '../schemas/language-source-inventory.schema.json')
  );
  const symbolRangeSchema = readJson<Record<string, unknown>>(
    path.resolve(__dirname, '../schemas/language-symbol-range-reference.schema.json')
  );
  const requestSchema = readJson<Record<string, unknown>>(
    path.resolve(__dirname, '../schemas/language-atomic-map-decomposition-request.schema.json')
  );
  const reportSchema = readJson<Record<string, unknown>>(
    path.resolve(__dirname, '../schemas/language-atomic-map-decomposition-report.schema.json')
  );

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  ajv.addSchema(symbolRangeSchema, String(symbolRangeSchema.$id));
  ajv.addSchema(sourceInventorySchema, String(sourceInventorySchema.$id));
  const validateRequest = ajv.compile(requestSchema);
  const validateReport = ajv.compile(reportSchema);

  for (const fixture of fixtures.cases) {
    const requestValid = validateRequest(fixture.request);
    assert.equal(requestValid, true, `[${fixture.id}] request schema should pass`);

    const report = buildGraphToMapDecompositionProposal({
      ...fixture.request,
      gateThresholds: {
        minMembers: fixture.request.minMembers,
        minEdges: fixture.request.minEdges,
        minEntrypoints: fixture.request.minEntrypoints,
      },
    });
    const reportValid = validateReport(report);
    assert.equal(reportValid, true, `[${fixture.id}] report schema should pass`);

    assert.equal(
      isAtomicMapDecompositionGateAccepted(report),
      fixture.expect.accepted,
      `[${fixture.id}] gate accepted mismatch`
    );

    if (typeof fixture.expect.minMembers === 'number') {
      assert.ok(
        report.members.length >= fixture.expect.minMembers,
        `[${fixture.id}] member count should be >= ${fixture.expect.minMembers}`
      );
    }
    if (typeof fixture.expect.minEdges === 'number') {
      assert.ok(
        report.edges.length >= fixture.expect.minEdges,
        `[${fixture.id}] edge count should be >= ${fixture.expect.minEdges}`
      );
    }
    if (fixture.expect.missingContains) {
      assert.ok(
        report.evidenceGate?.missing.includes(fixture.expect.missingContains),
        `[${fixture.id}] missing should include ${fixture.expect.missingContains}`
      );
    }
  }

  const sdkSource = fs.readFileSync(
    path.resolve(__dirname, '../packages/plugin-sdk/src/language-adapter.ts'),
    'utf8'
  );
  const requiredSdkSnippets = [
    'interface AtomicMapEntrypoint',
    'interface AtomicMapDecompositionGraphSummary',
    'interface AtomicMapDecompositionEvidenceGate',
    'entrypoints: AtomicMapEntrypoint[];',
    'isAtomicMapDecompositionGateAccepted(',
  ];
  for (const snippet of requiredSdkSnippets) {
    assert.ok(sdkSource.includes(snippet), `SDK snippet missing: ${snippet}`);
  }

  console.log('[atm-lang-0600-0602.test] PASS');
}

main();
