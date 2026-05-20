import type {
  EquivalenceContractReport,
  EquivalenceContractRequest,
} from '../../../plugin-sdk/src/language-adapter';

interface CSharpEquivalenceFixture {
  fixtureId: string;
  requiredAll: string[];
  requiredAny?: string[];
  forbidden?: string[];
  rationale: string;
  evidencePaths: string[];
}

const FIXTURE_TABLE: CSharpEquivalenceFixture[] = [
  {
    fixtureId: 'csharp-equivalence-happy-path',
    requiredAll: ['inventory', 'diagnostics', 'dry-run', 'runtime', 'map'],
    requiredAny: ['risk', 'partial', 'generated'],
    forbidden: ['execute', 'apply', 'mutate'],
    rationale:
      'expected behavior must include inventory, diagnostics, dry-run, runtime, and map evidence while remaining non-mutating',
    evidencePaths: ['tests/fixtures/language-csharp/equivalence-fixtures.json#csharp-equivalence-happy-path'],
  },
  {
    fixtureId: 'csharp-equivalence-missing-map',
    requiredAll: ['inventory', 'diagnostics', 'dry-run', 'runtime', 'map'],
    rationale: 'expected behavior misses map decomposition evidence',
    evidencePaths: ['tests/fixtures/language-csharp/equivalence-fixtures.json#csharp-equivalence-missing-map'],
  },
  {
    fixtureId: 'csharp-equivalence-exec-risk',
    requiredAll: ['inventory', 'diagnostics', 'dry-run'],
    forbidden: ['execute', 'apply', 'write'],
    rationale: 'expected behavior must stay proposal-only and avoid execution or source writes',
    evidencePaths: ['tests/fixtures/language-csharp/equivalence-fixtures.json#csharp-equivalence-exec-risk'],
  },
  {
    fixtureId: 'csharp-equivalence-minimal-advisory',
    requiredAll: ['inventory', 'dry-run', 'runtime'],
    requiredAny: ['advisory', 'review', 'gate'],
    forbidden: ['mutate', 'rewrite-apply'],
    rationale: 'minimal advisory equivalence still needs dry-run + runtime evidence and explicit review gating',
    evidencePaths: ['tests/fixtures/language-csharp/equivalence-fixtures.json#csharp-equivalence-minimal-advisory'],
  },
];

function tokenize(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  return new Set(normalized);
}

function evaluateFixture(
  fixture: CSharpEquivalenceFixture,
  expectedBehavior: string
): { accepted: boolean; details: string[] } {
  const tokenSet = tokenize(expectedBehavior);
  const missingAll = fixture.requiredAll.filter((token) => !tokenSet.has(token));
  const missingAny =
    fixture.requiredAny && fixture.requiredAny.length > 0
      ? fixture.requiredAny.every((token) => !tokenSet.has(token))
      : false;
  const forbiddenHits = (fixture.forbidden ?? []).filter((token) => tokenSet.has(token));

  const details: string[] = [];
  if (missingAll.length > 0) {
    details.push(`missing required tokens: ${missingAll.join(', ')}`);
  }
  if (missingAny) {
    details.push(`missing any-of tokens: ${(fixture.requiredAny ?? []).join(', ')}`);
  }
  if (forbiddenHits.length > 0) {
    details.push(`forbidden tokens detected: ${forbiddenHits.join(', ')}`);
  }

  return {
    accepted: details.length === 0,
    details,
  };
}

export function computeCSharpEquivalenceContract(
  request: EquivalenceContractRequest
): EquivalenceContractReport {
  const fixture = FIXTURE_TABLE.find((item) => item.fixtureId === request.fixtureId);
  if (!fixture) {
    return {
      fixtureId: request.fixtureId,
      accepted: false,
      rationale: `unknown csharp equivalence fixture: ${request.fixtureId}`,
      evidencePaths: ['tests/fixtures/language-csharp/equivalence-fixtures.json'],
    };
  }

  const evaluation = evaluateFixture(fixture, request.expectedBehavior);
  if (evaluation.accepted) {
    return {
      fixtureId: request.fixtureId,
      accepted: true,
      rationale: fixture.rationale,
      evidencePaths: fixture.evidencePaths,
    };
  }

  return {
    fixtureId: request.fixtureId,
    accepted: false,
    rationale: `${fixture.rationale}; ${evaluation.details.join('; ')}`,
    evidencePaths: fixture.evidencePaths,
  };
}
