import type {
  DiagnosticEntry,
  DiagnosticsParseRequest,
  DiagnosticsReport,
} from '../../../plugin-sdk/src/language-adapter';

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
    /^(.+?)\((\d+),(\d+)\):\s*(error|warning|info)\s+([A-Za-z]{2,4}\d+)\s*:\s*(.+?)(?:\s+\[[^\]]+\])?$/
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
    /^(.+?)\((\d+),(\d+)\):\s*(error|warning|info)\s+([A-Za-z]{2,4}\d+)\s*:\s*(.+)$/
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

export function parseCSharpDiagnostics(request: DiagnosticsParseRequest): DiagnosticsReport {
  const diagnostics: DiagnosticEntry[] = [];
  const lines = request.rawDiagnostics.replace(/\r\n/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const parsed = parseProjectStyleDiagnostic(line) ?? parseMsbuildStyleDiagnostic(line);
    if (parsed) {
      diagnostics.push(parsed);
      continue;
    }
    diagnostics.push({
      severity: 'info',
      message: line,
    });
  }
  return { diagnostics };
}
