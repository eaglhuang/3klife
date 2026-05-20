import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { planLegacyRouteWithAdapter, parseGenericRouteIntent } from '../packages/core/src/guidance/legacy-route-delegation';
import { buildPoliceGuidanceIntegrationReport } from '../packages/core/src/police/guidance-police-integration';

interface RouteFixtureCase {
  id: string;
  request: any;
  delegateResult?: any;
  expect: {
    mode: 'adapter-delegated' | 'generic-fallback';
    routeId?: string;
    routeIdPrefix?: string;
    messageIncludes: string;
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

async function main(): Promise<void> {
  const fixturePath = path.resolve(
    __dirname,
    'fixtures/language-route-planning/delegated-and-fallback.json'
  );
  const fixtures = readJson<{ cases: RouteFixtureCase[] }>(fixturePath);

  for (const fixture of fixtures.cases) {
    const delegate =
      fixture.delegateResult != null
        ? async () => fixture.delegateResult
        : undefined;

    const routeResult = await planLegacyRouteWithAdapter({
      ...fixture.request,
      adapterDelegate: delegate,
    });

    assert.equal(routeResult.mode, fixture.expect.mode, `[${fixture.id}] route mode mismatch`);
    if (fixture.expect.routeId) {
      assert.equal(routeResult.routeReport.routeId, fixture.expect.routeId, `[${fixture.id}] routeId mismatch`);
    }
    if (fixture.expect.routeIdPrefix) {
      assert.ok(
        routeResult.routeReport.routeId.startsWith(fixture.expect.routeIdPrefix),
        `[${fixture.id}] routeId prefix mismatch`
      );
    }
    assert.ok(
      routeResult.messages.some((message) => message.includes(fixture.expect.messageIncludes)),
      `[${fixture.id}] expected message missing`
    );

    const policeReport = buildPoliceGuidanceIntegrationReport(routeResult, fixture.request.adapterResolution);
    assert.equal(policeReport.ok, true, `[${fixture.id}] police integration should pass`);
    assert.equal(policeReport.routeMode, routeResult.mode, `[${fixture.id}] police route mode mismatch`);
    assert.ok(policeReport.records.length > 0, `[${fixture.id}] police evidence records should exist`);
  }

  const parsed = parseGenericRouteIntent('validate inventory route plan');
  assert.equal(parsed.action, 'validate', 'generic parser action mismatch');
  assert.deepEqual(
    parsed.targets,
    ['inventory', 'route', 'plan'],
    'generic parser targets mismatch'
  );

  const delegationSource = fs.readFileSync(
    path.resolve(__dirname, '../packages/core/src/guidance/legacy-route-delegation.ts'),
    'utf8'
  );
  const forbiddenLanguageWords = ['python', 'java', 'c#', 'csharp', 'go', 'php'];
  for (const word of forbiddenLanguageWords) {
    assert.equal(
      new RegExp(`\\b${word.replace('#', '\\#')}\\b`, 'i').test(delegationSource),
      false,
      `legacy-route-delegation should not include language-specific regex ownership: ${word}`
    );
  }

  console.log('[atm-lang-0300-0302.test] PASS');
}

main().catch((error) => {
  console.error('[atm-lang-0300-0302.test] FAIL');
  console.error(error);
  process.exit(1);
});

