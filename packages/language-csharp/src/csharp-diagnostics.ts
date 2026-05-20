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
      uriBaseId?: string;
    };
    region?: SarifRegion;
  };
}

interface SarifRuleConfiguration {
  level?: string;
}

interface SarifRule {
  id?: string;
  defaultConfiguration?: SarifRuleConfiguration;
}

interface SarifDriver {
  rules?: SarifRule[];
}

interface SarifResult {
  ruleId?: string;
  ruleIndex?: number;
  level?: string;
  message?: {
    text?: string;
    markdown?: string;
  };
  properties?: Record<string, unknown>;
  locations?: SarifLocation[];
}

interface SarifRun {
  tool?: {
    driver?: SarifDriver;
  };
  results?: SarifResult[];
}

interface SarifReport {
  runs?: SarifRun[];
}

function toPosix(value: string): string {
  return value.replace(/\\/g, '/');
}

function normalizeLocationPath(value: string): string {
  return toPosix(value.trim().replace(/^['"]|['"]$/g, ''));
}

function mapSeverity(value: string): 'info' | 'warning' | 'error' {
  const normalized = value.toLowerCase();
  if (normalized.startsWith('error') || normalized === 'fatal') {
    return 'error';
  }
  if (normalized.startsWith('warning')) {
    return 'warning';
  }
  return 'info';
}

function parseLocationDiagnostic(line: string): DiagnosticEntry | null {
  const match = line.match(
    /^(.+?)\((\d+),(\d+)(?:,(\d+),(\d+))?\):\s*(error|warning|info)\s+([A-Za-z]{2,8}\d+)\s*:\s*(.+?)(?:\s+\[[^\]]+\])?$/
  );
  if (!match) {
    return null;
  }
  const [, filePath, startLine, startColumn, endLine, endColumn, severity, code, message] = match;
  return {
    severity: mapSeverity(severity),
    code,
    message: message.trim(),
    location: {
      filePath: normalizeLocationPath(filePath),
      startLine: Number(startLine),
      startColumn: Number(startColumn),
      endLine: Number(endLine ?? startLine),
      endColumn: Number(endColumn ?? startColumn),
    },
  };
}

function parseToolDiagnostic(line: string): DiagnosticEntry | null {
  const match = line.match(
    /^([^:]+?)\s*:\s*(error|warning|info)\s+([A-Za-z]{2,8}\d+)\s*:\s*(.+?)(?:\s+\[([^\]]+)\])?$/
  );
  if (!match) {
    return null;
  }
  const [, source, severity, code, message, projectPath] = match;
  const sourceLabel = source.trim();
  const projectLabel = projectPath ? ` [${normalizeLocationPath(projectPath)}]` : '';
  return {
    severity: mapSeverity(severity),
    code,
    message: `${sourceLabel}: ${message.trim()}${projectLabel}`,
  };
}

function parseNoLocationDiagnostic(line: string): DiagnosticEntry | null {
  const match = line.match(
    /^(error|warning|info)\s+([A-Za-z]{2,8}\d+)\s*:\s*(.+?)(?:\s+\[([^\]]+)\])?$/
  );
  if (!match) {
    return null;
  }
  const [, severity, code, message, projectPath] = match;
  const projectSuffix = projectPath ? ` [${normalizeLocationPath(projectPath)}]` : '';
  return {
    severity: mapSeverity(severity),
    code,
    message: `${message.trim()}${projectSuffix}`,
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
  if (!value) {
    return 'warning';
  }
  return mapSeverity(value);
}

function toSarifMessage(result: SarifResult): string {
  const text = result.message?.text?.trim() || result.message?.markdown?.trim();
  if (text) {
    return text;
  }
  return 'sarif diagnostic';
}

function toDiagnosticFromSarifResult(
  result: SarifResult,
  defaultLevel: string | undefined,
  fallbackRuleId: string | undefined
): DiagnosticEntry {
  const location = result.locations?.[0]?.physicalLocation;
  const region = location?.region;
  const path = location?.artifactLocation?.uri;
  const effectiveLevel =
    result.level ??
    (typeof result.properties?.level === 'string' ? String(result.properties?.level) : undefined) ??
    defaultLevel;
  const code = result.ruleId ?? fallbackRuleId;
  if (!path) {
    return {
      severity: mapSarifLevel(effectiveLevel),
      code,
      message: toSarifMessage(result),
    };
  }
  return {
    severity: mapSarifLevel(effectiveLevel),
    code,
    message: toSarifMessage(result),
    location: {
      filePath: normalizeLocationPath(path),
      startLine: Math.max(region?.startLine ?? 1, 1),
      startColumn: Math.max(region?.startColumn ?? 1, 1),
      endLine: Math.max(region?.endLine ?? region?.startLine ?? 1, 1),
      endColumn: Math.max(region?.endColumn ?? region?.startColumn ?? 1, 1),
    },
  };
}

function parseSarifDiagnostics(rawDiagnostics: string): DiagnosticsReport | null {
  const parsed = parseJsonSafely(rawDiagnostics);
  if (!parsed) {
    return null;
  }
  const reports = Array.isArray(parsed) ? parsed : [parsed];
  const diagnostics: DiagnosticEntry[] = [];

  for (const report of reports) {
    const sarifReport = report as SarifReport;
    if (!Array.isArray(sarifReport.runs)) {
      continue;
    }
    for (const run of sarifReport.runs) {
      const rules = run.tool?.driver?.rules ?? [];
      for (const result of run.results ?? []) {
        const ruleByIndex =
          typeof result.ruleIndex === 'number' ? rules[result.ruleIndex] : undefined;
        diagnostics.push(
          toDiagnosticFromSarifResult(
            result,
            ruleByIndex?.defaultConfiguration?.level,
            ruleByIndex?.id
          )
        );
      }
    }
  }

  if (diagnostics.length === 0) {
    return null;
  }
  return { diagnostics };
}

function looksLikeSarif(source: string, trimmedRaw: string): boolean {
  if (source.includes('sarif')) {
    return true;
  }
  if (!trimmedRaw.startsWith('{') && !trimmedRaw.startsWith('[')) {
    return false;
  }
  return trimmedRaw.includes('"runs"') && trimmedRaw.includes('"results"');
}

export function parseCSharpDiagnostics(request: DiagnosticsParseRequest): DiagnosticsReport {
  const source = (request.source ?? '').toLowerCase();
  const trimmedRaw = request.rawDiagnostics.trim();
  if (looksLikeSarif(source, trimmedRaw)) {
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
      parseLocationDiagnostic(trimmed) ??
      parseToolDiagnostic(trimmed) ??
      parseNoLocationDiagnostic(trimmed);
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
