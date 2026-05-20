import type {
  DiagnosticEntry,
  DiagnosticsParseRequest,
  DiagnosticsReport,
  EquivalenceContractReport,
  EquivalenceContractRequest,
} from '../../../plugin-sdk/src/language-adapter';

interface EquivalenceFixtureCase {
  fixtureId: string;
  mustContain: string[];
  accepted: boolean;
  rationale: string;
  evidencePaths: string[];
}

const EQUIVALENCE_FIXTURE_TABLE: EquivalenceFixtureCase[] = [
  {
    fixtureId: 'python-equivalence-happy-path',
    mustContain: ['inventory', 'graph', 'dry-run'],
    accepted: true,
    rationale: 'expected behavior covers inventory + graph + dry-run governance requirements',
    evidencePaths: [
      'fixtures/python-adapter/equivalence-fixtures.json#python-equivalence-happy-path',
    ],
  },
  {
    fixtureId: 'python-equivalence-missing-dry-run',
    mustContain: ['inventory', 'graph', 'dry-run'],
    accepted: false,
    rationale: 'expected behavior does not provide dry-run governance evidence',
    evidencePaths: [
      'fixtures/python-adapter/equivalence-fixtures.json#python-equivalence-missing-dry-run',
    ],
  },
];

function mapSeverity(token: string): 'info' | 'warning' | 'error' {
  const normalized = token.toLowerCase();
  if (normalized === 'error' || normalized.startsWith('e') || normalized.startsWith('f')) {
    return 'error';
  }
  if (normalized === 'warning' || normalized.startsWith('w')) {
    return 'warning';
  }
  return 'info';
}

function parseDiagnosticsLine(line: string): DiagnosticEntry | null {
  const pycodestyle = line.match(
    /^(.+?):(\d+):(\d+):\s*([A-Za-z]\d+)\s+(.+)$/
  );
  if (pycodestyle) {
    const [, filePath, lineNo, columnNo, code, message] = pycodestyle;
    return {
      severity: mapSeverity(code),
      code,
      message: message.trim(),
      location: {
        filePath,
        startLine: Number(lineNo),
        startColumn: Number(columnNo),
        endLine: Number(lineNo),
        endColumn: Number(columnNo),
      },
    };
  }

  const mypy = line.match(/^(.+?):(\d+):\s*(error|warning|note):\s*(.+?)(?:\s+\[([^\]]+)\])?$/i);
  if (mypy) {
    const [, filePath, lineNo, severityToken, message, code] = mypy;
    return {
      severity: mapSeverity(severityToken),
      code: code?.trim(),
      message: message.trim(),
      location: {
        filePath,
        startLine: Number(lineNo),
        startColumn: 0,
        endLine: Number(lineNo),
        endColumn: 0,
      },
    };
  }

  return null;
}

export function parsePythonDiagnostics(
  request: DiagnosticsParseRequest
): DiagnosticsReport {
  const diagnostics: DiagnosticEntry[] = [];
  const lines = request.rawDiagnostics.replace(/\r\n/g, '\n').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }
    const parsed = parseDiagnosticsLine(line);
    if (parsed) {
      diagnostics.push(parsed);
      continue;
    }
    diagnostics.push({
      severity: 'info',
      message: line,
    });
  }

  return {
    diagnostics,
  };
}

export function computePythonEquivalenceContract(
  request: EquivalenceContractRequest
): EquivalenceContractReport {
  const fixture = EQUIVALENCE_FIXTURE_TABLE.find(
    (candidate) => candidate.fixtureId === request.fixtureId
  );

  if (!fixture) {
    return {
      fixtureId: request.fixtureId,
      accepted: false,
      rationale: `unknown python equivalence fixture: ${request.fixtureId}`,
      evidencePaths: [
        'fixtures/python-adapter/equivalence-fixtures.json',
      ],
    };
  }

  const normalizedBehavior = request.expectedBehavior.toLowerCase();
  const missing = fixture.mustContain.filter(
    (token) => !normalizedBehavior.includes(token)
  );
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

