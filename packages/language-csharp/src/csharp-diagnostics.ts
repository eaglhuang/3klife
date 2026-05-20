import type {
  DiagnosticEntry,
  DiagnosticsParseRequest,
  DiagnosticsReport,
} from '../../../plugin-sdk/src/language-adapter';

interface SarifRegion {
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

interface SarifLocation {
  physicalLocation?: {
    artifactLocation?: {
      uri?: string;
    };
    region?: SarifRegion;
  };
}

interface SarifResult {
  ruleId?: string;
  level?: string;
  message?: {
    text?: string;
  };
  locations?: SarifLocation[];
}

interface SarifRun {
  results?: SarifResult[];
}

interface SarifReport {
  runs?: SarifRun[];
}

function mapSeverity(value: string): 'info' | 'warning' | 'error' {
  const normalized = value.toLowerCase();
  if (normalized.startsWith('error')) {
    return 'error';
  }
  if (normalized.startsWith('warning')) {
    return 'warning';
  }
  return 'info';
}

function parseProjectStyleDiagnostic(line: string): DiagnosticEntry | null {
  const match = line.match(
    /^(.+?)\((\d+),(\d+)\):\s*(error|warning|info)\s+([A-Za-z]{2,5}\d+)\s*:\s*(.+?)(?:\s+\[[^\]]+\])?$/
  );
  if (!match) {
    return null;
  }
  const [, filePath, lineNo, columnNo, severity, code, message] = match;
  return {
    severity: mapSeverity(severity),
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

function parseMsbuildStyleDiagnostic(line: string): DiagnosticEntry | null {
  const match = line.match(
    /^(.+?)\((\d+),(\d+)\):\s*(error|warning|info)\s+([A-Za-z]{2,5}\d+)\s*:\s*(.+)$/
  );
  if (!match) {
    return null;
  }
  const [, filePath, lineNo, columnNo, severity, code, message] = match;
  return {
    severity: mapSeverity(severity),
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

function parseShortDiagnostic(line: string): DiagnosticEntry | null {
  const match = line.match(/^(.+?):\s*(error|warning|info)\s+([A-Za-z]{2,5}\d+)\s*:\s*(.+)$/);
  if (!match) {
    return null;
  }
  const [, source, severity, code, message] = match;
  return {
    severity: mapSeverity(severity),
    code,
    message: `${source}: ${message}`.trim(),
  };
}

function appendContinuation(entry: DiagnosticEntry, continuation: string): DiagnosticEntry {
  return {
    ...entry,
    message: `${entry.message} ${continuation}`.trim(),
  };
}

function parseJsonSafely(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function mapSarifLevel(value: string | undefined): 'info' | 'warning' | 'error' {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'error') {
    return 'error';
  }
  if (normalized === 'warning') {
    return 'warning';
  }
  return 'info';
}

function toDiagnosticFromSarifResult(result: SarifResult): DiagnosticEntry {
  const message = result.message?.text?.trim() || 'sarif diagnostic';
  const location = result.locations?.[0]?.physicalLocation;
  const region = location?.region;
  if (!location?.artifactLocation?.uri) {
    return {
      severity: mapSarifLevel(result.level),
      code: result.ruleId,
      message,
    };
  }
  return {
    severity: mapSarifLevel(result.level),
    code: result.ruleId,
    message,
    location: {
      filePath: location.artifactLocation.uri,
      startLine: Math.max(region?.startLine ?? 1, 1),
      startColumn: Math.max(region?.startColumn ?? 1, 1),
      endLine: Math.max(region?.endLine ?? region?.startLine ?? 1, 1),
      endColumn: Math.max(region?.endColumn ?? region?.startColumn ?? 1, 1),
    },
  };
}

function parseSarifDiagnostics(rawDiagnostics: string): DiagnosticsReport | null {
  const parsed = parseJsonSafely(rawDiagnostics) as SarifReport | undefined;
  if (!parsed || !Array.isArray(parsed.runs)) {
    return null;
  }
  const diagnostics: DiagnosticEntry[] = [];
  for (const run of parsed.runs) {
    for (const result of run.results ?? []) {
      diagnostics.push(toDiagnosticFromSarifResult(result));
    }
  }
  if (diagnostics.length === 0) {
    return null;
  }
  return {
    diagnostics,
  };
}

export function parseCSharpDiagnostics(request: DiagnosticsParseRequest): DiagnosticsReport {
  const source = (request.source ?? '').toLowerCase();
  const trimmedRaw = request.rawDiagnostics.trim();
  if (source.includes('sarif') || trimmedRaw.startsWith('{')) {
    const sarifReport = parseSarifDiagnostics(trimmedRaw);
    if (sarifReport) {
      return sarifReport;
    }
  }

  const diagnostics: DiagnosticEntry[] = [];
  const lines = request.rawDiagnostics.replace(/\r\n/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parsed =
      parseProjectStyleDiagnostic(trimmed) ??
      parseMsbuildStyleDiagnostic(trimmed) ??
      parseShortDiagnostic(trimmed);
    if (parsed) {
      diagnostics.push(parsed);
      continue;
    }
    if (/^\s+/.test(line) && diagnostics.length > 0) {
      diagnostics[diagnostics.length - 1] = appendContinuation(
        diagnostics[diagnostics.length - 1],
        trimmed
      );
      continue;
    }
    diagnostics.push({
      severity: 'info',
      message: trimmed,
    });
  }
  return { diagnostics };
}
