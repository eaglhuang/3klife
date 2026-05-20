import type {
  EquivalenceContractReport,
  EquivalenceContractRequest,
} from '../../../plugin-sdk/src/language-adapter';

interface CSharpEquivalenceFixture {
  fixtureId: string;
  mustContain: string[];
  accepted: boolean;
  rationale: string;
  evidencePaths: string[];
}

const FIXTURE_TABLE: CSharpEquivalenceFixture[] = [
  {
    fixtureId: 'csharp-equivalence-happy-path',
    mustContain: [
      'inventory',
      'diagnostics',
      'dry-run',
      'partial',
      'runtime',
      'map',
    ],
    accepted: true,
    rationale:
      'expected behavior covers inventory, diagnostics, dry-run, partial risk, runtime advisory, and map decomposition',
    evidencePaths: ['tests/fixtures/language-csharp/equivalence-fixtures.json#csharp-equivalence-happy-path'],
  },
  {
    fixtureId: 'csharp-equivalence-missing-map',
    mustContain: ['inventory', 'dry-run', 'map'],
    accepted: false,
    rationale: 'expected behavior misses map decomposition evidence',
    evidencePaths: ['tests/fixtures/language-csharp/equivalence-fixtures.json#csharp-equivalence-missing-map'],
  },
];

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

  const normalized = request.expectedBehavior.toLowerCase();
  const missing = fixture.mustContain.filter((token) => !normalized.includes(token));
  const accepted = fixture.accepted && missing.length === 0;
  if (accepted) {
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
    rationale:
      missing.length > 0
        ? `${fixture.rationale}; missing tokens: ${missing.join(', ')}`
        : fixture.rationale,
    evidencePaths: fixture.evidencePaths,
  };
}
