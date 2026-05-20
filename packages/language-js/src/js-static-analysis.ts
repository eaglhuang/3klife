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

const JS_TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs']);

const CALL_KEYWORDS = new Set([
  'if', 'for', 'while', 'return', 'switch', 'case', 'new', 'typeof', 'instanceof',
  'throw', 'catch', 'await', 'yield', 'delete', 'void', 'in', 'of',
]);

export interface JsSideEffectRecord {
  actor: string;
  target: string;
  relation: string;
  evidence: string;
}

export interface JsModuleAnalysis {
  filePath: string;
  symbols: SymbolRef[];
  dependencyEdges: EdgeRef[];
  callEdges: EdgeRef[];
  artifactEdges: EdgeRef[];
  cliEntrypoints: string[];
  exportSurfaceHints: string[];
  sideEffects: JsSideEffectRecord[];
  warnings: string[];
}

export interface JsSurfaceReport {
  cliEntrypoints: string[];
  exportSurfaceHints: string[];
  sideEffectWarnings: string[];
  runtimeCommands: RuntimeCommandReport;
}

export interface JsProjectAnalysisReport {
  inventory: SourceInventoryReport;
  surface: JsSurfaceReport;
}

export interface JsAstInventoryReport {
  files: SourceFileEntry[];
  moduleAnalyses: JsModuleAnalysis[];
  warnings: string[];
}

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/');
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

function isJsTsFile(filePath: string): boolean {
  return JS_TS_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function shouldIncludePath(
  relativePath: string,
  includeMatchers: readonly RegExp[],
  excludeMatchers: readonly RegExp[]
): boolean {
  if (!isJsTsFile(relativePath)) {
    return false;
  }
  if (excludeMatchers.some((m) => m.test(relativePath))) {
    return false;
  }
  if (includeMatchers.length === 0) {
    return true;
  }
  return includeMatchers.some((m) => m.test(relativePath));
}

function collectJsTsFilePaths(request: SourceInventoryRequest): string[] {
  const includeMatchers = (request.includeGlobs ?? ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']).map(globToRegExp);
  const excludeMatchers = (
    request.excludeGlobs ?? ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**']
  ).map(globToRegExp);
  const root = path.resolve(request.repositoryRoot);
  const collected: string[] = [];

  function walk(currentDir: string): void {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
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
  return collected.sort((a, b) => a.localeCompare(b));
}

function buildRange(
  filePath: string,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number
): SourceRange {
  return { filePath, startLine, startColumn, endLine, endColumn };
}

function dedupeEdges(edges: readonly EdgeRef[]): EdgeRef[] {
  const seen = new Map<string, EdgeRef>();
  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}|${edge.relation}|${edge.evidence ?? ''}`;
    if (!seen.has(key)) {
      seen.set(key, edge);
    }
  }
  return Array.from(seen.values());
}

function parseJsModule(filePath: string, source: string): JsModuleAnalysis {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const symbols: SymbolRef[] = [];
  const dependencyEdges: EdgeRef[] = [];
  const callEdges: EdgeRef[] = [];
  const artifactEdges: EdgeRef[] = [];
  const cliEntrypoints: string[] = [];
  const exportSurfaceHints: string[] = [];
  const sideEffects: JsSideEffectRecord[] = [];
  const warnings: string[] = [];

  const isEntryIndex =
    /(?:^|\/)index\.(ts|tsx|js|jsx|mts|mjs)$/.test(filePath) ||
    /(?:^|\/)main\.(ts|tsx|js|jsx)$/.test(filePath);

  if (isEntryIndex) {
    cliEntrypoints.push(filePath);
  }

  for (let idx = 0; idx < lines.length; idx += 1) {
    const lineNo = idx + 1;
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      continue;
    }

    // ES6 static import
    const importMatch = trimmed.match(
      /^import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/
    );
    if (importMatch) {
      const specifier = importMatch[1];
      dependencyEdges.push({
        from: filePath,
        to: `module:${specifier}`,
        relation: 'imports',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    // require()
    const requireMatch = rawLine.match(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      dependencyEdges.push({
        from: filePath,
        to: `module:${requireMatch[1]}`,
        relation: 'imports',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    // export function / export class / export const / export async function
    const exportFnMatch = trimmed.match(
      /^export\s+(?:default\s+)?(?:async\s+)?(?:function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
    );
    if (exportFnMatch) {
      const symbolName = exportFnMatch[1];
      const col = rawLine.indexOf(symbolName);
      const symbol: SymbolRef = {
        symbolId: `${filePath}#${symbolName}`,
        displayName: symbolName,
        kind: trimmed.includes('class') ? 'class' : 'function',
        range: buildRange(filePath, lineNo, Math.max(0, col), lineNo, rawLine.length),
      };
      symbols.push(symbol);
      exportSurfaceHints.push(symbol.symbolId);
    }

    // export const / export let
    const exportConstMatch = trimmed.match(
      /^export\s+(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
    );
    if (exportConstMatch) {
      const symbolName = exportConstMatch[1];
      const col = rawLine.indexOf(symbolName);
      const symbol: SymbolRef = {
        symbolId: `${filePath}#${symbolName}`,
        displayName: symbolName,
        kind: 'variable',
        range: buildRange(filePath, lineNo, Math.max(0, col), lineNo, rawLine.length),
      };
      symbols.push(symbol);
      exportSurfaceHints.push(symbol.symbolId);
    }

    // Non-exported function / class / const definitions
    const defMatch = trimmed.match(
      /^(?:async\s+)?(?:function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
    );
    if (defMatch && !trimmed.startsWith('export')) {
      const symbolName = defMatch[1];
      const col = rawLine.indexOf(symbolName);
      symbols.push({
        symbolId: `${filePath}#${symbolName}`,
        displayName: symbolName,
        kind: trimmed.includes('class') ? 'class' : 'function',
        range: buildRange(filePath, lineNo, Math.max(0, col), lineNo, rawLine.length),
      });
    }

    // Call edges — look for identifier(
    const callRegex = /\b([A-Za-z_$][A-Za-z0-9_$.]*)\s*\(/g;
    let callMatch: RegExpExecArray | null;
    while ((callMatch = callRegex.exec(rawLine)) !== null) {
      const callee = callMatch[1];
      const base = callee.split('.')[0];
      if (CALL_KEYWORDS.has(base)) {
        continue;
      }
      callEdges.push({
        from: filePath,
        to: `symbol:${callee}`,
        relation: 'calls',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    // fs.writeFile / fs.writeFileSync / fs.readFile / fs.readFileSync artifact edges
    const fsWriteMatch = rawLine.match(/\bfs\.(writeFile|appendFile|writeFileSync|appendFileSync)\s*\(\s*(['"`])([^'"` ]+)\2/);
    if (fsWriteMatch) {
      const target = `artifact:${fsWriteMatch[3]}`;
      artifactEdges.push({ from: filePath, to: target, relation: 'writes', evidence: `${filePath}:${lineNo}` });
      sideEffects.push({ actor: filePath, target, relation: 'writes', evidence: `${filePath}:${lineNo}` });
    }
    const fsReadMatch = rawLine.match(/\bfs\.(readFile|readFileSync)\s*\(\s*(['"`])([^'"` ]+)\2/);
    if (fsReadMatch) {
      const target = `artifact:${fsReadMatch[3]}`;
      artifactEdges.push({ from: filePath, to: target, relation: 'reads', evidence: `${filePath}:${lineNo}` });
    }

    // process.env mutation
    if (/\bprocess\.env\s*\[[^\]]+\]\s*=/.test(rawLine) || /\bprocess\.env\.[A-Z_]+\s*=/.test(rawLine)) {
      const target = 'artifact:process-env';
      artifactEdges.push({ from: filePath, to: target, relation: 'mutates-env', evidence: `${filePath}:${lineNo}` });
      sideEffects.push({ actor: filePath, target, relation: 'mutates-env', evidence: `${filePath}:${lineNo}` });
    }

    // child_process.exec / spawn
    if (/\b(?:exec|spawn|execSync|spawnSync)\s*\(/.test(rawLine)) {
      const target = 'artifact:subprocess';
      artifactEdges.push({ from: filePath, to: target, relation: 'spawns-process', evidence: `${filePath}:${lineNo}` });
      sideEffects.push({ actor: filePath, target, relation: 'spawns-process', evidence: `${filePath}:${lineNo}` });
    }
  }

  if (callEdges.length === 0) {
    warnings.push(`${filePath}: call graph has no deterministic calls`);
  }

  const sideEffectWarnings = sideEffects.map(
    (se) => `${se.evidence} ${se.actor} ${se.relation} ${se.target}`
  );
  warnings.push(...sideEffectWarnings);

  return {
    filePath,
    symbols,
    dependencyEdges: dedupeEdges(dependencyEdges),
    callEdges: dedupeEdges(callEdges),
    artifactEdges: dedupeEdges(artifactEdges),
    cliEntrypoints: Array.from(new Set(cliEntrypoints)),
    exportSurfaceHints: Array.from(new Set(exportSurfaceHints)),
    sideEffects,
    warnings,
  };
}

export function buildJsAstInventory(request: SourceInventoryRequest): JsAstInventoryReport {
  const root = path.resolve(request.repositoryRoot);
  const filePaths = collectJsTsFilePaths(request);
  const moduleAnalyses: JsModuleAnalysis[] = [];

  for (const relativePath of filePaths) {
    const absolutePath = path.join(root, relativePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    moduleAnalyses.push(parseJsModule(relativePath, content));
  }

  return {
    files: moduleAnalyses.map((m) => ({
      filePath: m.filePath,
      languageId: 'typescript',
      symbols: m.symbols,
    })),
    moduleAnalyses,
    warnings: moduleAnalyses.flatMap((m) => m.warnings),
  };
}

export interface JsGraphReport {
  dependencyEdges: EdgeRef[];
  callEdges: EdgeRef[];
  artifactEdges: EdgeRef[];
}

export function buildJsDependencyCallArtifactGraph(
  moduleAnalyses: readonly JsModuleAnalysis[]
): JsGraphReport {
  return {
    dependencyEdges: dedupeEdges(moduleAnalyses.flatMap((m) => m.dependencyEdges)),
    callEdges: dedupeEdges(moduleAnalyses.flatMap((m) => m.callEdges)),
    artifactEdges: dedupeEdges(moduleAnalyses.flatMap((m) => m.artifactEdges)),
  };
}

function buildJsRuntimeCommands(
  cliEntrypoints: readonly string[],
  exportSurfaceHints: readonly string[],
  sideEffects: readonly JsSideEffectRecord[],
  includeRisky: boolean
): RuntimeCommandReport {
  const commands: RuntimeCommandEntry[] = [];

  for (const entry of cliEntrypoints) {
    commands.push({
      commandId: `js-cli:${entry}`,
      command: `node ${entry}`,
      category: 'cli-entrypoint',
      mutates: false,
      confidence: 0.9,
    });
  }

  for (const hint of exportSurfaceHints) {
    commands.push({
      commandId: `js-api:${hint}`,
      command: `invoke ${hint}`,
      category: 'api-surface',
      mutates: false,
      confidence: 0.7,
    });
  }

  const sideEffectWarnings: string[] = [];
  for (const se of sideEffects) {
    const mutates = se.relation !== 'reads';
    const warning = `${se.evidence} ${se.actor} ${se.relation} ${se.target}`;
    sideEffectWarnings.push(warning);
    if (!includeRisky && mutates) {
      continue;
    }
    commands.push({
      commandId: `js-side-effect:${se.evidence}:${se.relation}:${se.target}`,
      command: `${se.actor} ${se.relation} ${se.target}`,
      category: 'side-effect',
      mutates,
      confidence: mutates ? 0.8 : 0.6,
    });
  }

  return { commands, warnings: sideEffectWarnings };
}

export function detectJsCliApiSideEffects(
  moduleAnalyses: readonly JsModuleAnalysis[],
  includeRisky: boolean
): JsSurfaceReport {
  const cliEntrypoints = Array.from(
    new Set(moduleAnalyses.flatMap((m) => m.cliEntrypoints))
  ).sort((a, b) => a.localeCompare(b));
  const exportSurfaceHints = Array.from(
    new Set(moduleAnalyses.flatMap((m) => m.exportSurfaceHints))
  ).sort((a, b) => a.localeCompare(b));
  const sideEffects = moduleAnalyses.flatMap((m) => m.sideEffects);
  const runtimeCommands = buildJsRuntimeCommands(cliEntrypoints, exportSurfaceHints, sideEffects, includeRisky);

  return {
    cliEntrypoints,
    exportSurfaceHints,
    sideEffectWarnings: runtimeCommands.warnings ?? [],
    runtimeCommands,
  };
}

export async function analyzeJsProject(
  request: SourceInventoryRequest
): Promise<JsProjectAnalysisReport> {
  const inventoryBase = buildJsAstInventory(request);
  const graphs = buildJsDependencyCallArtifactGraph(inventoryBase.moduleAnalyses);
  const surface = detectJsCliApiSideEffects(inventoryBase.moduleAnalyses, true);

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

export async function scanJsSourceInventory(
  request: SourceInventoryRequest
): Promise<SourceInventoryReport> {
  const analysis = await analyzeJsProject(request);
  return analysis.inventory;
}

export async function detectJsRuntimeCommands(
  request: RuntimeCommandRequest
): Promise<RuntimeCommandReport> {
  const inventoryBase = buildJsAstInventory({
    repositoryRoot: request.repositoryRoot,
    includeGlobs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  });
  return detectJsCliApiSideEffects(
    inventoryBase.moduleAnalyses,
    request.includeRisky ?? false
  ).runtimeCommands;
}

export function buildJsLegacyRoutePlan(intent: string, repositoryRoot: string) {
  return {
    routeId: `js-legacy-route:${Buffer.from(intent).toString('base64').slice(0, 12)}`,
    steps: [
      { phase: 'inventory', description: `scan JS/TS source inventory under ${repositoryRoot}` },
      { phase: 'entrypoint-resolution', description: 'resolve entry files (index.ts / main.ts)' },
      { phase: 'import-graph', description: 'trace static imports and re-exports' },
      { phase: 'symbol-resolution', description: 'normalize exported symbol ids' },
      { phase: 'route-plan', description: `map intent "${intent}" to candidate file/symbol targets` },
    ],
    warnings: [] as string[],
  };
}

export function normalizeJsSymbolId(rawSymbolId: string, filePath?: string) {
  const normalized = rawSymbolId
    .replace(/\\/g, '/')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_$/:#.-]/g, '');
  return {
    normalized: filePath ? `${toPosix(filePath)}#${normalized}` : normalized,
    strategy: 'js-posix-path-hash',
  };
}
