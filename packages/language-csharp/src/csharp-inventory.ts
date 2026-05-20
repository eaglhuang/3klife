import fs from 'node:fs';
import path from 'node:path';
import type {
  EdgeRef,
  SourceFileEntry,
  SourceInventoryReport,
  SourceInventoryRequest,
  SourceRange,
  SymbolRef,
} from '../../../plugin-sdk/src/language-adapter';

const CSHARP_EXCLUDE_DEFAULT = [
  '**/.git/**',
  '**/node_modules/**',
  '**/obj/**',
  '**/bin/**',
  '**/Library/**',
  '**/Temp/**',
];
const CALL_KEYWORDS = new Set([
  'if',
  'for',
  'foreach',
  'while',
  'switch',
  'catch',
  'return',
  'nameof',
  'typeof',
  'new',
  'base',
  'this',
  'using',
]);

export interface CSharpTypeEvidence {
  symbolId: string;
  displayName: string;
  kind: string;
  isPartial: boolean;
  filePath: string;
  line: number;
  fullTypeKey: string;
}

export interface CSharpGeneratedEvidence {
  filePath: string;
  kind: 'generated-file-name' | 'auto-generated-header';
  line: number;
  evidence: string;
}

export interface CSharpModuleAnalysis {
  filePath: string;
  symbols: SymbolRef[];
  dependencyEdges: EdgeRef[];
  callEdges: EdgeRef[];
  artifactEdges: EdgeRef[];
  warnings: string[];
  typeEvidence: CSharpTypeEvidence[];
  generatedEvidence: CSharpGeneratedEvidence[];
}

export interface CSharpPartialDeclarationRef {
  symbolId: string;
  displayName: string;
  kind: string;
  filePath: string;
  line: number;
}

export interface CSharpPartialDeclarationGroup {
  groupId: string;
  fullTypeKey: string;
  declarationCount: number;
  declarations: CSharpPartialDeclarationRef[];
}

export interface CSharpPartialDeclarationIndex {
  groups: CSharpPartialDeclarationGroup[];
  warnings: string[];
}

export interface CSharpProjectAnalysisReport {
  inventory: SourceInventoryReport;
  moduleAnalyses: CSharpModuleAnalysis[];
  partialIndex: CSharpPartialDeclarationIndex;
}

interface MutableScope {
  name: string;
  kind: 'namespace' | 'type' | 'method';
  depth: number;
  symbolId?: string;
  awaitingBrace?: boolean;
}

interface SymbolIdInput {
  kind: string;
  displayName: string;
  signature?: string;
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

function shouldIncludePath(
  relativePath: string,
  includeMatchers: readonly RegExp[],
  excludeMatchers: readonly RegExp[]
): boolean {
  if (!relativePath.toLowerCase().endsWith('.cs')) {
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

function collectCSharpFilePaths(request: SourceInventoryRequest): string[] {
  const includeMatchers = (request.includeGlobs ?? ['**/*.cs']).map(globToRegExp);
  const excludeMatchers = (request.excludeGlobs ?? CSHARP_EXCLUDE_DEFAULT).map(globToRegExp);
  const root = path.resolve(request.repositoryRoot);
  const files: string[] = [];

  if (!fs.existsSync(root)) {
    return files;
  }

  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      const relativePath = toPosix(path.relative(root, fullPath));
      if (shouldIncludePath(relativePath, includeMatchers, excludeMatchers)) {
        files.push(relativePath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function buildRange(filePath: string, line: number, startColumn: number, endColumn: number): SourceRange {
  const safeStartColumn = startColumn >= 0 ? startColumn : 0;
  const safeEndColumn = endColumn >= safeStartColumn ? endColumn : safeStartColumn;
  return {
    filePath,
    startLine: line,
    startColumn: safeStartColumn,
    endLine: line,
    endColumn: safeEndColumn,
  };
}

function cleanIdentifier(identifier: string): string {
  return identifier.replace(/[<>,\[\]\?]/g, '').trim();
}

function currentNamespace(scopeStack: readonly MutableScope): string | undefined {
  for (let i = scopeStack.length - 1; i >= 0; i -= 1) {
    if (scopeStack[i].kind === 'namespace') {
      return scopeStack[i].name;
    }
  }
  return undefined;
}

function currentTypePath(scopeStack: readonly MutableScope): string | undefined {
  const names: string[] = [];
  for (const scope of scopeStack) {
    if (scope.kind === 'type') {
      names.push(scope.name);
    }
  }
  if (names.length === 0) {
    return undefined;
  }
  return names.join('.');
}

function currentMethod(scopeStack: readonly MutableScope): string | undefined {
  for (let i = scopeStack.length - 1; i >= 0; i -= 1) {
    if (scopeStack[i].kind === 'method' && scopeStack[i].symbolId) {
      return scopeStack[i].symbolId;
    }
  }
  return undefined;
}

function buildDisplayName(
  namespaceName: string | undefined,
  typePath: string | undefined,
  memberName: string
): string {
  const parts = [namespaceName, typePath, memberName].filter(Boolean);
  return parts.join('.');
}

function buildSymbolId(filePath: string, displayName: string, kind: string): string {
  return `${filePath}#${displayName}:${kind}`;
}

function canonicalizeSymbolToken(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/`[0-9]+/g, '')
    .replace(/global::/g, '')
    .replace(/[^a-z0-9_\.\[\]\?]/g, '');
}

function buildStableSymbolKey(input: SymbolIdInput): string {
  const display = input.displayName
    .split('.')
    .map((part) => canonicalizeSymbolToken(part))
    .filter(Boolean)
    .join('.');
  const signature = input.signature ? `(${input.signature})` : '';
  return `${canonicalizeSymbolToken(input.kind)}|${display}${signature}`;
}

function buildMethodSignature(parametersRaw: string): string {
  const normalized = parametersRaw.trim();
  if (!normalized) {
    return '';
  }

  const parameterKinds = normalized
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const withoutDefault = segment.split('=')[0].trim();
      const withoutAttributes = withoutDefault.replace(/\[[^\]]+\]\s*/g, '');
      const tokens = withoutAttributes
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => !['ref', 'out', 'in', 'params', 'this', 'scoped'].includes(token));
      if (tokens.length <= 1) {
        return canonicalizeSymbolToken(tokens[0] ?? withoutAttributes);
      }
      return canonicalizeSymbolToken(tokens.slice(0, -1).join(' '));
    });

  return parameterKinds.join(',');
}

function createSymbolIdAllocator(filePath: string): (input: SymbolIdInput) => string {
  const counters = new Map<string, number>();
  return (input: SymbolIdInput) => {
    const stableKey = buildStableSymbolKey(input);
    const count = (counters.get(stableKey) ?? 0) + 1;
    counters.set(stableKey, count);
    const signatureSuffix = input.signature && input.signature.length > 0 ? `(${input.signature})` : '';
    const baseId = buildSymbolId(filePath, `${input.displayName}${signatureSuffix}`, input.kind);
    if (count === 1) {
      return baseId;
    }
    return `${baseId}@${count}`;
  };
}

function countBraceDelta(line: string): number {
  const opens = (line.match(/\{/g) ?? []).length;
  const closes = (line.match(/\}/g) ?? []).length;
  return opens - closes;
}

function activateAwaitingScopes(scopeStack: MutableScope[], braceDepth: number): void {
  for (let index = scopeStack.length - 1; index >= 0; index -= 1) {
    const scope = scopeStack[index];
    if (!scope.awaitingBrace) {
      continue;
    }
    if (braceDepth > scope.depth) {
      scope.depth = braceDepth;
      scope.awaitingBrace = false;
    }
  }
}

function buildTypeKey(kind: string, displayName: string): string {
  return `${kind}:${displayName}`.toLowerCase();
}

function parseModule(filePath: string, content: string): CSharpModuleAnalysis {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const symbols: SymbolRef[] = [];
  const dependencyEdges: EdgeRef[] = [];
  const callEdges: EdgeRef[] = [];
  const artifactEdges: EdgeRef[] = [];
  const warnings: string[] = [];
  const typeEvidence: CSharpTypeEvidence[] = [];
  const generatedEvidence: CSharpGeneratedEvidence[] = [];
  const scopeStack: MutableScope[] = [];
  let braceDepth = 0;
  const allocateSymbolId = createSymbolIdAllocator(filePath);

  const lowerFileName = filePath.toLowerCase();
  if (/\.(g|generated|designer)\.cs$/.test(lowerFileName)) {
    generatedEvidence.push({
      filePath,
      kind: 'generated-file-name',
      line: 1,
      evidence: `${filePath}:1 generated file naming pattern`,
    });
  }

  for (let index = 0; index < lines.length; index += 1) {
    const lineNo = index + 1;
    const raw = lines[index];
    const trimmed = raw.trim();
    if (!trimmed) {
      braceDepth += countBraceDelta(raw);
      activateAwaitingScopes(scopeStack, braceDepth);
      while (scopeStack.length > 0 && braceDepth < scopeStack[scopeStack.length - 1].depth) {
        scopeStack.pop();
      }
      continue;
    }

    if (trimmed.includes('<auto-generated')) {
      generatedEvidence.push({
        filePath,
        kind: 'auto-generated-header',
        line: lineNo,
        evidence: `${filePath}:${lineNo} <auto-generated>`,
      });
    }

    const usingMatch = trimmed.match(/^(global\s+)?using\s+([A-Za-z0-9_\.]+)\s*;/);
    if (usingMatch) {
      dependencyEdges.push({
        from: filePath,
        to: `module:${usingMatch[2]}`,
        relation: usingMatch[1] ? 'imports-global' : 'imports',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    const fileNamespaceMatch = trimmed.match(/^namespace\s+([A-Za-z_][A-Za-z0-9_\.]*)\s*;/);
    if (fileNamespaceMatch) {
      const namespaceName = cleanIdentifier(fileNamespaceMatch[1]);
      const displayName = namespaceName;
      const symbolId = allocateSymbolId({
        kind: 'namespace',
        displayName,
      });
      symbols.push({
        symbolId,
        displayName,
        kind: 'namespace',
        range: buildRange(filePath, lineNo, raw.indexOf('namespace'), raw.length),
      });
      scopeStack.push({
        name: namespaceName,
        kind: 'namespace',
        depth: Number.NEGATIVE_INFINITY,
        symbolId,
        awaitingBrace: false,
      });
    }

    const blockNamespaceMatch = trimmed.match(/^namespace\s+([A-Za-z_][A-Za-z0-9_\.]*)\s*$/);
    if (blockNamespaceMatch) {
      const namespaceName = cleanIdentifier(blockNamespaceMatch[1]);
      const displayName = namespaceName;
      const symbolId = allocateSymbolId({
        kind: 'namespace',
        displayName,
      });
      symbols.push({
        symbolId,
        displayName,
        kind: 'namespace',
        range: buildRange(filePath, lineNo, raw.indexOf('namespace'), raw.length),
      });
      const enterDepth = braceDepth + (raw.includes('{') ? 1 : 0);
      scopeStack.push({
        name: namespaceName,
        kind: 'namespace',
        depth: Math.max(enterDepth, braceDepth),
        symbolId,
        awaitingBrace: !raw.includes('{'),
      });
    }

    const typeMatch = trimmed.match(
      /\b(partial\s+)?(class|interface|struct|enum|record)\s+(?:class\s+|struct\s+)?([A-Za-z_][A-Za-z0-9_]*)\b/
    );
    if (typeMatch) {
      const namespaceName = currentNamespace(scopeStack);
      const parentTypePath = currentTypePath(scopeStack);
      const typeName = cleanIdentifier(typeMatch[3]);
      const kind = typeMatch[2];
      const displayName = buildDisplayName(namespaceName, parentTypePath, typeName);
      const symbolId = allocateSymbolId({
        kind,
        displayName,
      });
      symbols.push({
        symbolId,
        displayName,
        kind,
        range: buildRange(filePath, lineNo, raw.indexOf(typeName), raw.length),
      });
      const isPartial = Boolean(typeMatch[1]);
      typeEvidence.push({
        symbolId,
        displayName,
        kind,
        isPartial,
        filePath,
        line: lineNo,
        fullTypeKey: buildTypeKey(kind, displayName),
      });
      const typeDepth = braceDepth + (raw.includes('{') ? 1 : 0);
      scopeStack.push({
        name: typeName,
        kind: 'type',
        depth: Math.max(typeDepth, braceDepth),
        symbolId,
        awaitingBrace: !raw.includes('{'),
      });
    }

    const propertyMatch = trimmed.match(
      /^(?:\[[^\]]+\]\s*)*(?:public|private|protected|internal|static|virtual|override|sealed|new|readonly|required|\s)+\s+[A-Za-z_][A-Za-z0-9_<>,\[\]\?\.]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*(?:get|set|init|private|protected|internal)/
    );
    if (propertyMatch) {
      const propertyName = cleanIdentifier(propertyMatch[1]);
      const namespaceName = currentNamespace(scopeStack);
      const typePath = currentTypePath(scopeStack);
      const displayName = buildDisplayName(namespaceName, typePath, propertyName);
      symbols.push({
        symbolId: allocateSymbolId({
          kind: 'property',
          displayName,
        }),
        displayName,
        kind: 'property',
        range: buildRange(filePath, lineNo, raw.indexOf(propertyName), raw.length),
      });
    }

    const fieldMatch = trimmed.match(
      /^(?:\[[^\]]+\]\s*)*(?:public|private|protected|internal|static|readonly|const|volatile|new|\s)+\s+[A-Za-z_][A-Za-z0-9_<>,\[\]\?\.]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|;)/
    );
    if (fieldMatch && !trimmed.includes('(')) {
      const fieldName = cleanIdentifier(fieldMatch[1]);
      const namespaceName = currentNamespace(scopeStack);
      const typePath = currentTypePath(scopeStack);
      const displayName = buildDisplayName(namespaceName, typePath, fieldName);
      symbols.push({
        symbolId: allocateSymbolId({
          kind: 'field',
          displayName,
        }),
        displayName,
        kind: 'field',
        range: buildRange(filePath, lineNo, raw.indexOf(fieldName), raw.length),
      });
    }

    const methodMatch = trimmed.match(
      /^(?:\[[^\]]+\]\s*)*(?:public|private|protected|internal|static|virtual|override|sealed|new|async|extern|partial|\s)+\s+[A-Za-z_][A-Za-z0-9_<>,\[\]\?\.]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^\)]*)\)\s*(?:\{|=>|where|$|;)/
    );
    let declaredMethodName: string | undefined;
    if (methodMatch) {
      const methodName = cleanIdentifier(methodMatch[1]);
      declaredMethodName = methodName;
      if (!CALL_KEYWORDS.has(methodName)) {
        const namespaceName = currentNamespace(scopeStack);
        const typePath = currentTypePath(scopeStack);
        const displayName = buildDisplayName(namespaceName, typePath, methodName);
        const signature = buildMethodSignature(methodMatch[2] ?? '');
        const symbolId = allocateSymbolId({
          kind: 'method',
          displayName,
          signature,
        });
        symbols.push({
          symbolId,
          displayName,
          kind: 'method',
          range: buildRange(filePath, lineNo, raw.indexOf(methodName), raw.length),
        });
        const hasInlineBody = raw.includes('{');
        const hasExplicitNoBody = trimmed.includes('=>') || trimmed.endsWith(';');
        if (!hasExplicitNoBody) {
          const methodDepth = braceDepth + (hasInlineBody ? 1 : 0);
          scopeStack.push({
            name: methodName,
            kind: 'method',
            depth: Math.max(methodDepth, braceDepth),
            symbolId,
            awaitingBrace: !hasInlineBody,
          });
        }
      }
    }

    const callRegex = /\b([A-Za-z_][A-Za-z0-9_\.]*)\s*\(/g;
    let match: RegExpExecArray | null;
    const actor = currentMethod(scopeStack) ?? filePath;
    while ((match = callRegex.exec(raw)) != null) {
      const callee = cleanIdentifier(match[1]);
      if (CALL_KEYWORDS.has(callee) || callee.endsWith('new') || callee === declaredMethodName) {
        continue;
      }
      callEdges.push({
        from: actor,
        to: `symbol:${callee}`,
        relation: 'calls',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    const writeMatch = raw.match(
      /File\.(WriteAllText|AppendAllText|WriteAllBytes)\s*\(\s*["']([^"']+)["']/
    );
    if (writeMatch) {
      artifactEdges.push({
        from: actor,
        to: `artifact:${writeMatch[2]}`,
        relation: 'writes',
        evidence: `${filePath}:${lineNo}`,
      });
    }
    const readMatch = raw.match(/File\.(ReadAllText|ReadAllBytes|OpenRead)\s*\(\s*["']([^"']+)["']/);
    if (readMatch) {
      artifactEdges.push({
        from: actor,
        to: `artifact:${readMatch[2]}`,
        relation: 'reads',
        evidence: `${filePath}:${lineNo}`,
      });
    }

    braceDepth += countBraceDelta(raw);
    activateAwaitingScopes(scopeStack, braceDepth);
    while (scopeStack.length > 0 && braceDepth < scopeStack[scopeStack.length - 1].depth) {
      scopeStack.pop();
    }
  }

  if (callEdges.length === 0) {
    warnings.push(`${filePath}: no deterministic call edges detected`);
  }

  return {
    filePath,
    symbols,
    dependencyEdges,
    callEdges,
    artifactEdges,
    warnings,
    typeEvidence,
    generatedEvidence,
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

export function buildCSharpPartialDeclarationIndex(
  moduleAnalyses: readonly CSharpModuleAnalysis[]
): CSharpPartialDeclarationIndex {
  const groupsByType = new Map<string, CSharpPartialDeclarationRef[]>();

  for (const moduleAnalysis of moduleAnalyses) {
    for (const type of moduleAnalysis.typeEvidence) {
      if (!type.isPartial) {
        continue;
      }
      const list = groupsByType.get(type.fullTypeKey) ?? [];
      list.push({
        symbolId: type.symbolId,
        displayName: type.displayName,
        kind: type.kind,
        filePath: type.filePath,
        line: type.line,
      });
      groupsByType.set(type.fullTypeKey, list);
    }
  }

  const groups = Array.from(groupsByType.entries())
    .map(([fullTypeKey, declarations]) => ({
      groupId: `partial-group:${fullTypeKey}`,
      fullTypeKey,
      declarationCount: declarations.length,
      declarations: declarations.sort((left, right) =>
        `${left.filePath}:${left.line}`.localeCompare(`${right.filePath}:${right.line}`)
      ),
    }))
    .sort((left, right) => left.fullTypeKey.localeCompare(right.fullTypeKey));

  const warnings = groups
    .filter((group) => group.declarationCount === 1)
    .map((group) => `${group.fullTypeKey} only has one partial declaration in fixture scope`);

  return {
    groups,
    warnings,
  };
}

export function buildCSharpInventory(request: SourceInventoryRequest): CSharpProjectAnalysisReport {
  const root = path.resolve(request.repositoryRoot);
  const filePaths = collectCSharpFilePaths(request);
  const moduleAnalyses: CSharpModuleAnalysis[] = [];

  for (const filePath of filePaths) {
    const absolutePath = path.join(root, filePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    moduleAnalyses.push(parseModule(filePath, content));
  }

  const files: SourceFileEntry[] = moduleAnalyses.map((analysis) => ({
    filePath: analysis.filePath,
    languageId: 'csharp',
    symbols: analysis.symbols,
  }));
  const dependencyEdges = dedupeEdges(
    moduleAnalyses.flatMap((analysis) => analysis.dependencyEdges)
  );
  const callEdges = dedupeEdges(moduleAnalyses.flatMap((analysis) => analysis.callEdges));
  const artifactEdges = dedupeEdges(moduleAnalyses.flatMap((analysis) => analysis.artifactEdges));
  const warnings = moduleAnalyses.flatMap((analysis) => analysis.warnings);
  const partialIndex = buildCSharpPartialDeclarationIndex(moduleAnalyses);

  return {
    inventory: {
      files,
      dependencyEdges,
      callEdges,
      artifactEdges,
      warnings: [...warnings, ...partialIndex.warnings],
    },
    moduleAnalyses,
    partialIndex,
  };
}

export async function scanCSharpSourceInventory(
  request: SourceInventoryRequest
): Promise<SourceInventoryReport> {
  return buildCSharpInventory(request).inventory;
}
