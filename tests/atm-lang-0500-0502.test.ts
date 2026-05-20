import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import type { DryRunPlanReport } from '../packages/plugin-sdk/src/language-adapter';
import { isDryRunProposalSafe } from '../packages/plugin-sdk/src/language-adapter';

interface DryRunFixtureCase {
  id: string;
  request: unknown;
  report: DryRunPlanReport;
  expect: {
    reportValid: boolean;
    errorIncludes?: string;
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readSchema(fileName: string): Record<string, unknown> {
  return readJson<Record<string, unknown>>(path.resolve(__dirname, `../schemas/${fileName}`));
}

function main(): void {
  const fixturePath = path.resolve(
    __dirname,
    'fixtures/language-dry-run-plans/dry-run-plan-fixtures.json'
  );
  const fixtures = readJson<{ cases: DryRunFixtureCase[] }>(fixturePath);

  const requestSchema = readSchema('language-dry-run-plan-request.schema.json');
  const evidenceSchema = readSchema('language-dry-run-evidence-envelope.schema.json');
  const reportSchema = readSchema('language-dry-run-plan-report.schema.json');

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  ajv.addSchema(evidenceSchema, String(evidenceSchema.$id));
  const validateRequest = ajv.compile(requestSchema);
  const validateReport = ajv.compile(reportSchema);

  for (const fixture of fixtures.cases) {
    const requestValid = validateRequest(fixture.request);
    assert.equal(requestValid, true, `[${fixture.id}] request schema must pass`);

    const reportValid = validateReport(fixture.report);
    assert.equal(reportValid, fixture.expect.reportValid, `[${fixture.id}] report schema validity mismatch`);
    if (!fixture.expect.reportValid && fixture.expect.errorIncludes) {
      const errorText = JSON.stringify(validateReport.errors ?? []);
      assert.ok(
        errorText.includes(fixture.expect.errorIncludes),
        `[${fixture.id}] expected schema error not found: ${fixture.expect.errorIncludes}`
      );
    }

    if (fixture.expect.reportValid) {
      assert.equal(
        isDryRunProposalSafe(fixture.report),
        true,
        `[${fixture.id}] valid dry-run proposal must be safe`
      );
    } else if (fixture.id === 'invalid-mutates-non-empty') {
      assert.equal(
        isDryRunProposalSafe(fixture.report),
        false,
        `[${fixture.id}] non-empty mutates must fail dry-run safety check`
      );
    }
  }

  const sdkSource = fs.readFileSync(
    path.resolve(__dirname, '../packages/plugin-sdk/src/language-adapter.ts'),
    'utf8'
  );
  const requiredSnippets = [
    'interface DryRunImportRewritePlan',
    'interface DryRunHostShimPlan',
    'interface DryRunRollbackPlan',
    'executionMode: \'dry-run\';',
    'proposalArtifacts: DryRunProposalArtifact[];',
    'reviewGate: DryRunReviewGate;',
    'isDryRunProposalSafe(report: DryRunPlanReport)',
  ];
  for (const snippet of requiredSnippets) {
    assert.ok(sdkSource.includes(snippet), `SDK source missing required dry-run snippet: ${snippet}`);
  }

  console.log('[atm-lang-0500-0502.test] PASS');
}

main();

