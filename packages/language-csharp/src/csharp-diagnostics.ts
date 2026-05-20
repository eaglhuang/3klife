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

export function parseCSharpDiagnostics(request: DiagnosticsParseRequest): DiagnosticsReport {
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
