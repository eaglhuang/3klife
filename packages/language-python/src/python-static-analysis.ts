import fs from 'node:fs';
import path from 'node:path';
import type {
  EdgeRef,
  RuntimeCommandEntry,
  RuntimeCommandReport,
  RuntimeCommandRequest,
  SourceFileEntry,
  SourceInventoryReport,
  SourceInventoryRequest,
  SourceRange,
  SymbolRef,
} from '../../../plugin-sdk/src/language-adapter';

interface MutableSymbol extends SymbolRef {
  indent: number;
}

interface PythonSideEffectRecord {
  actor: string;
  target: string;
  relation: string;
  evidence: string;
}

interface PythonModuleAnalysis {
  filePath: string;
  symbols: SymbolRef[];
  dependencyEdges: EdgeRef[];
  callEdges: EdgeRef[];
  artifactEdges: EdgeRef[];
  cliEntrypoints: string[];
  apiSurfaceHints: string[];
  sideEffects: PythonSideEffectRecord[];
  warnings: string[];
}

export interface PythonSurfaceReport {
  cliEntrypoints: string[];
  apiSurfaceHints: string[];
  sideEffectWarnings: string[];
  runtimeCommands: RuntimeCommandReport;
}

export interface PythonProjectAnalysisReport {
  inventory: SourceInventoryReport;
  surface: PythonSurfaceReport;
}

const CALL_KEYWORDS = new Set([
  'if',
  'for',
  'while',
  'return',
  'with',
  'class',
  'def',
  'lambda',
  'await',
  'yield',
  'except',
  'assert',
  'from',
  'import',
  'print',
]);

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function countIndent(rawLine: string): number {
  let indent = 0;
  for (const char of rawLine) {
    if (char === ' ') {
      indent += 1;
      continue;
    }
    if (char === '\t') {
      indent += 4;
      continue;
    }
    break;
  }
  return indent;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(glob: string): RegExp {
  const normalized = toPosix(glob.trim());
  const escaped = escapeRegExp(normalized)
    .replace(/\\\*\\\*/g, '::DOUBLE_STAR::')
    .replace(/\\\*/g, '[^/]*')
    .replace(/\\\?/g, '[^/]')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function shouldIncludePath(
  relativePath: string,
  includeMatchers: readonly RegExp[],
  excludeMatchers: readonly RegExp[]
): boolean {
  if (!relativePath.endsWith('.py')) {
    return false;
  }
  if (excludeMatchers.some((matcher) => matcher.test(relativePath))) {
    return false;
  }
  if (includeMatchers.length === 0) {
    return true;
  }
  return includeMatchers.some((matcher) => matcher.test(relativePath));
}

function collectPythonFilePaths(request: SourceInventoryRequest): string[] {
  const includeMatchers = (request.includeGlobs ?? ['**/*.py']).map(globToRegExp);
  const excludeMatchers = (request.excludeGlobs ?? ['**/.venv/**', '**/venv/**', '**/__pycache__/**']).map(
    globToRegExp
  );
  const root = path.resolve(request.repositoryRoot);
  const collected: string[] = [];

  function walk(currentDir: string): void {
    for (const name of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (name.name === '.git' || name.name === 'node_modules') {
        continue;
      }
      const absolutePath = path.join(currentDir, name.name);
      if (name.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      const relative = toPosix(path.relative(root, absolutePath));
      if (shouldIncludePath(relative, includeMatchers, excludeMatchers)) {
        collected.push(relative);
      }
    }
  }

  if (!fs.existsSync(root)) {
    return [];
  }
  walk(root);
  return collected.sort((left, right) => left.localeCompare(right));
}

function buildRange(
  filePath: string,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number
): SourceRange {
  return {
    filePath,
    startLine,
    startColumn,
    endLine,
    endColumn,
  };
}

function closeScopesAt(
  stack: MutableSymbol[],
  lines: readonly string[],
  closeUntilIndent: number,
  currentLine: number
): void {
  while (stack.length > 0 && closeUntilIndent <= stack[stack.length - 1].indent) {
    const top = stack.pop();
    if (!top) {
      continue;
    }
    const safeEndLine = Math.max(top.range.startLine, currentLine - 1);
    const safeEndColumn = (lines[safeEndLine - 1] ?? '').length;
    top.range.endLine = safeEndLine;
    top.range.endColumn = safeEndColumn;
  }
}

function finalizeOpenScopes(stack: MutableSymbol[], lines: readonly string[]): void {
  while (stack.length > 0) {
    const top = stack.pop();
    if (!top) {
      continue;
    }
    const endLine = Math.max(top.range.startLine, lines.length || top.range.startLine);
    const endColumn = (lines[endLine - 1] ?? '').length;
    top.range.endLine = endLine;
    top.range.endColumn = endColumn;
  }
}

function buildActorId(scopeStack: readonly MutableSymbol[], filePath: string): string {
  for (let i = scopeStack.length - 1; i >= 0; i -= 1) {
    const scope = scopeStack[i];
    if (scope.kind === 'function' || scope.kind === 'method') {
      return scope.symbolId;
    }
  }
  return filePath;
}

function parsePythonModule(filePath: string, source: string): PythonModuleAnalysis {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const symbols: MutableSymbol[] = [];
  const scopeStack: MutableSymbol[] = [];
  const dependencyEdges: EdgeRef[] = [];
  const callEdges: EdgeRef[] = [];
  const artifactEdges: EdgeRef[] = [];
  const cliEntrypoints: string[] = [];
  const apiSurfaceHints: string[] = [];
  const sideEffects: PythonSideEffectRecord[] = [];
  const warnings: string[] = [];

  const importedByAll = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const lineNo = index + 1;
    const rawLine = lines[index];
    const trimmed = rawLine.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const indent = countIndent(rawLine);
    const isDecorator = trimmed.startsWith('@');
    if (!isDecorator) {
      closeScopesAt(scopeStack, lines, indent, lineNo);
    }

    const allMatch = trimmed.match(/^__all__\s*=\s*\[([^\]]*)\]/);
    if (allMatch) {
      const names = allMatch[1]
        .split(',')
        .map((token) => token.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      for (const name of names) {
        importedByAll.add(name);
      }
    }

    const importMatch = trimmed.match(/^import\s+(.+)$/);
    if (importMatch) {
      const modules = importMatch[1]
        .split(',')
        .map((token) => token.trim().split(/\s+as\s+/i)[0])
        .filter(Boolean);
      for (const moduleName of modules) {
        dependencyEdges.push({
          from: filePath,
          to: `module:${moduleName}`,
          relation: 'imports',
          evidence: `${filePath}:${lineNo}`,
        });
      }
    }

    const fromImportMatch = trimmed.match(/^from\s+([A-Za-z0-9_\.]+)\s+import\s+(.+)$/);
    if (fromImportMatch) {
      dependencyEdges.push({
        from: filePath,
        to: `module:${fromImportMatch[1]}`,
        relation: 'imports',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    const definitionMatch = trimmed.match(/^(async\s+def|def|class)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|:)/);
    if (definitionMatch) {
      const token = definitionMatch[1];
      const symbolName = definitionMatch[2];
      const symbolColumn = rawLine.indexOf(symbolName);
      const parentScope = scopeStack.length > 0 ? scopeStack[scopeStack.length - 1] : undefined;
      const parentDisplay = parentScope?.displayName;
      const displayName = parentDisplay ? `${parentDisplay}.${symbolName}` : symbolName;
      const symbolKind =
        token === 'class'
          ? 'class'
          : parentScope?.kind === 'class'
            ? 'method'
            : 'function';
      const symbol: MutableSymbol = {
        symbolId: `${filePath}#${displayName}`,
        displayName,
        kind: symbolKind,
        range: buildRange(
          filePath,
          lineNo,
          Math.max(0, symbolColumn),
          lineNo,
          rawLine.length
        ),
        indent,
      };
      symbols.push(symbol);
      scopeStack.push(symbol);
      if (!displayName.includes('.') && !displayName.startsWith('_')) {
        apiSurfaceHints.push(symbol.symbolId);
      }
      continue;
    }

    if (/^if\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(trimmed)) {
      cliEntrypoints.push(filePath);
    }

    const callerId = buildActorId(scopeStack, filePath);
    const callRegex = /\b([A-Za-z_][A-Za-z0-9_\.]*)\s*\(/g;
    let callMatch: RegExpExecArray | null;
    while ((callMatch = callRegex.exec(rawLine)) != null) {
      const callee = callMatch[1];
      if (CALL_KEYWORDS.has(callee)) {
        continue;
      }
      callEdges.push({
        from: callerId,
        to: `symbol:${callee}`,
        relation: 'calls',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    const openMatch = rawLine.match(/\bopen\(\s*(['"])([^'"]+)\1(?:\s*,\s*(['"])([^'"]+)\3)?/);
    if (openMatch) {
      const mode = openMatch[4] ?? 'r';
      const relation = /[wax+]/i.test(mode) ? 'writes' : 'reads';
      const target = `artifact:${openMatch[2]}`;
      artifactEdges.push({
        from: callerId,
        to: target,
        relation,
        evidence: `${filePath}:${lineNo}`,
      });
      sideEffects.push({
        actor: callerId,
        target,
        relation,
        evidence: `${filePath}:${lineNo}`,
      });
    }

    const pathReadWriteMatch = rawLine.match(
      /\bPath\(\s*(['"])([^'"]+)\1\s*\)\.(write_text|write_bytes|read_text|read_bytes)\s*\(/
    );
    if (pathReadWriteMatch) {
      const method = pathReadWriteMatch[3];
      const relation = method.startsWith('write') ? 'writes' : 'reads';
      const target = `artifact:${pathReadWriteMatch[2]}`;
      artifactEdges.push({
        from: callerId,
        to: target,
        relation,
        evidence: `${filePath}:${lineNo}`,
      });
      sideEffects.push({
        actor: callerId,
        target,
        relation,
        evidence: `${filePath}:${lineNo}`,
      });
    }

    if (/\bos\.environ\[[^\]]+\]\s*=/.test(rawLine)) {
      const target = 'artifact:process-env';
      artifactEdges.push({
        from: callerId,
        to: target,
        relation: 'mutates-env',
        evidence: `${filePath}:${lineNo}`,
      });
      sideEffects.push({
        actor: callerId,
        target,
        relation: 'mutates-env',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    if (/\bsubprocess\.(run|Popen|call|check_call|check_output)\s*\(/.test(rawLine)) {
      const target = 'artifact:subprocess';
      artifactEdges.push({
        from: callerId,
        to: target,
        relation: 'spawns-process',
        evidence: `${filePath}:${lineNo}`,
      });
      sideEffects.push({
        actor: callerId,
        target,
        relation: 'spawns-process',
        evidence: `${filePath}:${lineNo}`,
      });
    }
  }

  finalizeOpenScopes(scopeStack, lines);

  for (const symbol of symbols) {
    if (importedByAll.has(symbol.displayName)) {
      apiSurfaceHints.push(symbol.symbolId);
    }
  }

  if (callEdges.length === 0) {
    warnings.push(`${filePath}: call graph has no deterministic calls`);
  }

  const sideEffectWarnings = sideEffects.map(
    (sideEffect) =>
      `${sideEffect.evidence} ${sideEffect.actor} ${sideEffect.relation} ${sideEffect.target}`
  );
  warnings.push(...sideEffectWarnings);

  return {
    filePath,
    symbols,
    dependencyEdges,
    callEdges,
    artifactEdges,
    cliEntrypoints: Array.from(new Set(cliEntrypoints)),
    apiSurfaceHints: Array.from(new Set(apiSurfaceHints)),
    sideEffects,
    warnings,
  };
}

function dedupeEdges(edges: readonly EdgeRef[]): EdgeRef[] {
  const byKey = new Map<string, EdgeRef>();
  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}|${edge.relation}|${edge.evidence ?? ''}`;
    if (!byKey.has(key)) {
      byKey.set(key, edge);
    }
  }
  return Array.from(byKey.values());
}

export interface PythonAstInventoryReport {
  files: SourceFileEntry[];
  moduleAnalyses: PythonModuleAnalysis[];
  warnings: string[];
}

export function buildPythonAstInventory(
  request: SourceInventoryRequest
): PythonAstInventoryReport {
  const root = path.resolve(request.repositoryRoot);
  const filePaths = collectPythonFilePaths(request);
  const moduleAnalyses: PythonModuleAnalysis[] = [];

  for (const relativePath of filePaths) {
    const absolutePath = path.join(root, relativePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    moduleAnalyses.push(parsePythonModule(relativePath, content));
  }

  return {
    files: moduleAnalyses.map((moduleAnalysis) => ({
      filePath: moduleAnalysis.filePath,
      languageId: 'python',
      symbols: moduleAnalysis.symbols,
    })),
    moduleAnalyses,
    warnings: moduleAnalyses.flatMap((moduleAnalysis) => moduleAnalysis.warnings),
  };
}

export interface PythonGraphReport {
  dependencyEdges: EdgeRef[];
  callEdges: EdgeRef[];
  artifactEdges: EdgeRef[];
}

export function buildPythonDependencyCallArtifactGraph(
  moduleAnalyses: readonly PythonModuleAnalysis[]
): PythonGraphReport {
  return {
    dependencyEdges: dedupeEdges(moduleAnalyses.flatMap((moduleAnalysis) => moduleAnalysis.dependencyEdges)),
    callEdges: dedupeEdges(moduleAnalyses.flatMap((moduleAnalysis) => moduleAnalysis.callEdges)),
    artifactEdges: dedupeEdges(moduleAnalyses.flatMap((moduleAnalysis) => moduleAnalysis.artifactEdges)),
  };
}

function buildRuntimeCommands(
  cliEntrypoints: readonly string[],
  apiSurfaceHints: readonly string[],
  sideEffects: readonly PythonSideEffectRecord[],
  includeRisky: boolean
): RuntimeCommandReport {
  const commands: RuntimeCommandEntry[] = [];

  for (const cliEntrypoint of cliEntrypoints) {
    commands.push({
      commandId: `python-cli:${cliEntrypoint}`,
      command: `python ${cliEntrypoint}`,
      category: 'cli-entrypoint',
      mutates: false,
      confidence: 0.9,
    });
  }

  for (const apiHint of apiSurfaceHints) {
    commands.push({
      commandId: `python-api:${apiHint}`,
      command: `invoke ${apiHint}`,
      category: 'api-surface',
      mutates: false,
      confidence: 0.7,
    });
  }

  const sideEffectWarnings: string[] = [];
  for (const sideEffect of sideEffects) {
    const mutates = sideEffect.relation !== 'reads';
    const warning = `${sideEffect.evidence} ${sideEffect.actor} ${sideEffect.relation} ${sideEffect.target}`;
    sideEffectWarnings.push(warning);
    if (!includeRisky && mutates) {
      continue;
    }
    commands.push({
      commandId: `python-side-effect:${sideEffect.evidence}:${sideEffect.relation}:${sideEffect.target}`,
      command: `${sideEffect.actor} ${sideEffect.relation} ${sideEffect.target}`,
      category: 'side-effect',
      mutates,
      confidence: mutates ? 0.8 : 0.6,
    });
  }

  return {
    commands,
    warnings: sideEffectWarnings,
  };
}

export function detectPythonCliApiSideEffects(
  moduleAnalyses: readonly PythonModuleAnalysis[],
  includeRisky: boolean
): PythonSurfaceReport {
  const cliEntrypoints = Array.from(
    new Set(moduleAnalyses.flatMap((moduleAnalysis) => moduleAnalysis.cliEntrypoints))
  ).sort((left, right) => left.localeCompare(right));
  const apiSurfaceHints = Array.from(
    new Set(moduleAnalyses.flatMap((moduleAnalysis) => moduleAnalysis.apiSurfaceHints))
  ).sort((left, right) => left.localeCompare(right));
  const sideEffects = moduleAnalyses.flatMap((moduleAnalysis) => moduleAnalysis.sideEffects);
  const runtimeCommands = buildRuntimeCommands(cliEntrypoints, apiSurfaceHints, sideEffects, includeRisky);

  return {
    cliEntrypoints,
    apiSurfaceHints,
    sideEffectWarnings: runtimeCommands.warnings ?? [],
    runtimeCommands,
  };
}

export async function analyzePythonProject(
  request: SourceInventoryRequest
): Promise<PythonProjectAnalysisReport> {
  const inventoryBase = buildPythonAstInventory(request);
  const graphs = buildPythonDependencyCallArtifactGraph(inventoryBase.moduleAnalyses);
  const surface = detectPythonCliApiSideEffects(inventoryBase.moduleAnalyses, true);

  return {
    inventory: {
      files: inventoryBase.files,
      dependencyEdges: graphs.dependencyEdges,
      callEdges: graphs.callEdges,
      artifactEdges: graphs.artifactEdges,
      warnings: inventoryBase.warnings,
    },
    surface,
  };
}

export async function scanPythonSourceInventory(
  request: SourceInventoryRequest
): Promise<SourceInventoryReport> {
  const analysis = await analyzePythonProject(request);
  return analysis.inventory;
}

export async function detectPythonRuntimeCommands(
  request: RuntimeCommandRequest
): Promise<RuntimeCommandReport> {
  const inventoryBase = buildPythonAstInventory({
    repositoryRoot: request.repositoryRoot,
    includeGlobs: ['**/*.py'],
  });
  return detectPythonCliApiSideEffects(
    inventoryBase.moduleAnalyses,
    request.includeRisky ?? false
  ).runtimeCommands;
}
