import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildCapabilityFallbackReport } from '../packages/core/src/guidance/language-adapter-fallback';
import { resolveLanguageAdapter } from '../packages/core/src/guidance/language-adapter-resolver';
import { runtimeAdapterReadiness } from '../packages/cli/src/commands/runtime-adapter-readiness';

interface ResolverFixtureCase {
  id: string;
  request: unknown;
  expect: {
    selectedAdapterId: string | null;
    ok: boolean;
    advisory?: string[];
    unsupported?: string[];
    rejectedCount?: number;
    messageIncludes?: string;
  };
}

interface FallbackFixtureCase {
  id: string;
  input: unknown;
  expect: {
    ok: boolean;
    advisory: string[];
    unsupported: string[];
    messages: string[];
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

const resolverFixturePath = path.resolve(
  __dirname,
  'fixtures/language-adapter-resolution/resolver-fixtures.json'
);
const fallbackFixturePath = path.resolve(
  __dirname,
  'fixtures/language-adapter-resolution/fallback-snapshots.json'
);

const resolverFixtures = readJson<{ cases: ResolverFixtureCase[] }>(resolverFixturePath);
const fallbackFixtures = readJson<{ cases: FallbackFixtureCase[] }>(fallbackFixturePath);

for (const fixture of resolverFixtures.cases) {
  const report = resolveLanguageAdapter(fixture.request as never);
  const selectedAdapterId = report.selected?.adapterId ?? null;
  assert.equal(
    selectedAdapterId,
    fixture.expect.selectedAdapterId,
    `[${fixture.id}] selected adapter mismatch`
  );
  assert.equal(report.ok, fixture.expect.ok, `[${fixture.id}] ok mismatch`);

  if (fixture.expect.advisory) {
    assert.deepEqual(
      report.selected?.fallback.advisory ?? [],
      fixture.expect.advisory,
      `[${fixture.id}] advisory mismatch`
    );
  }
  if (fixture.expect.unsupported) {
    assert.deepEqual(
      report.selected?.fallback.unsupported ?? [],
      fixture.expect.unsupported,
      `[${fixture.id}] unsupported mismatch`
    );
  }
  if (typeof fixture.expect.rejectedCount === 'number') {
    assert.equal(
      report.rejected.length,
      fixture.expect.rejectedCount,
      `[${fixture.id}] rejected count mismatch`
    );
  }
  if (fixture.expect.messageIncludes) {
    assert.ok(
      report.messages.some((message) => message.includes(fixture.expect.messageIncludes!)),
      `[${fixture.id}] expected message not found`
    );
  }
}

for (const fixture of fallbackFixtures.cases) {
  const report = buildCapabilityFallbackReport(fixture.input as never);
  assert.equal(report.ok, fixture.expect.ok, `[${fixture.id}] fallback ok mismatch`);
  assert.deepEqual(report.advisory, fixture.expect.advisory, `[${fixture.id}] fallback advisory mismatch`);
  assert.deepEqual(
    report.unsupported,
    fixture.expect.unsupported,
    `[${fixture.id}] fallback unsupported mismatch`
  );
  assert.deepEqual(report.messages, fixture.expect.messages, `[${fixture.id}] fallback messages mismatch`);
}

const readinessFixture = resolverFixtures.cases.find((fixture) => fixture.id === 'bundled-python-preferred');
assert.ok(readinessFixture, 'missing readiness fixture');
const readiness = runtimeAdapterReadiness(readinessFixture.request as never);
assert.equal(readiness.ok, true, 'runtime readiness should pass for bundled python fixture');
assert.ok(
  readiness.summaryLines.some((line) => line.includes('Selected py-bundled')),
  'runtime readiness should include selected adapter summary'
);

console.log('[atm-lang-0200-0202.test] PASS');

