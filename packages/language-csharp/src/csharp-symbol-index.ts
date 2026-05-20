import fs from 'node:fs';
import path from 'node:path';
import type { EdgeRef, SymbolRef } from '../../../plugin-sdk/src/language-adapter';
import type { CSharpProjectAnalysisReport } from './csharp-inventory';

export interface CSharpSymbolDeclarationRef {
  symbolId: string;
  displayName: string;
  kind: string;
  filePath: string;
}

export interface CSharpSymbolReferenceEntry {
  referenceId: string;
  fromSymbolId: string;
  fromFilePath: string;
  fromLine?: number;
  callee: string;
  resolution: 'resolved' | 'ambiguous' | 'unresolved';
  toSymbolId?: string;
  candidateSymbolIds?: string[];
  evidence: string;
}

export interface CSharpSymbolReferenceIndex {
  declarations: CSharpSymbolDeclarationRef[];
  references: CSharpSymbolReferenceEntry[];
  resolvedCount: number;
  ambiguousCount: number;
  unresolvedCount: number;
  warnings: string[];
}

interface MatchIndex {
  byFullName: Map<string, CSharpSymbolDeclarationRef[]>;
  byShortName: Map<string, CSharpSymbolDeclarationRef[]>;
  declarationMetaBySymbolId: Map<string, CSharpDeclarationMeta>;
}

interface CSharpDeclarationMeta {
  declaration: CSharpSymbolDeclarationRef;
  shortName: string;
  genericArity?: number;
  parameterCount?: number;
  isExtensionMethod?: boolean;
  staticContainer?: string;
}

interface CSharpFileResolutionContext {
  aliases: Record<string, string>;
  staticUsings: string[];
  lineIndex: string[];
}

interface CSharpCallContext {
  argumentCount?: number;
  genericArity?: number;
  hasQualifier: boolean;
  qualifierToken?: string;
}

function canonicalizeToken(value: string): string {
  return value
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, '')
    .replace(/`[0-9]+/g, '')
    .replace(/global::/g, '')
    .toLowerCase();
}

function parseEvidenceLine(evidence: string): number | undefined {
  const match = evidence.match(/^(.+?):(\d+)(?::.*)?$/);
  return match ? Number(match[2]) : undefined;
}

function parseEvidenceFilePath(evidence: string): string | undefined {
  const match = evidence.match(/^(.+?):\d+(?::.*)?$/);
  if (!match) {
    return undefined;
  }
  return match[1];
}

function dedupeBySymbolId(
  declarations: readonly CSharpSymbolDeclarationRef[]
): CSharpSymbolDeclarationRef[] {
  const seen = new Set<string>();
  const output: CSharpSymbolDeclarationRef[] = [];
  for (const declaration of declarations) {
    if (seen.has(declaration.symbolId)) {
      continue;
    }
    seen.add(declaration.symbolId);
    output.push(declaration);
  }
  return output;
}

function parseMethodMetadata(symbolId: string): {
  parameterCount?: number;
  isExtensionMethod?: boolean;
} {
  const methodMatch = symbolId.match(/^[^#]+#.+\(([^)]*)\):method(?:@\d+)?$/i);
  if (!methodMatch) {
    return {};
  }
  const signature = methodMatch[1].trim();
  if (!signature) {
    return {
      parameterCount: 0,
      isExtensionMethod: false,
    };
  }
  const parameters = signature
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    parameterCount: parameters.length,
    isExtensionMethod: parameters[0]?.startsWith('this:') ?? false,
  };
}

function parseGenericArity(displayName: string): number | undefined {
  const short = shortName(displayName);
  const match = short.match(/<([^>]+)>/);
  if (!match) {
    return undefined;
  }
  return match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean).length;
}

function parseStaticContainer(displayName: string): string | undefined {
  const parts = displayName.split('.');
  if (parts.length <= 1) {
    return undefined;
  }
  parts.pop();
  const container = parts.join('.');
  return container || undefined;
}

function toDeclarationMeta(symbol: SymbolRef): CSharpDeclarationMeta {
  const declaration = toDeclaration(symbol);
  const methodMeta = symbol.kind === 'method' ? parseMethodMetadata(symbol.symbolId) : {};
  return {
    declaration,
    shortName: shortName(declaration.displayName),
    genericArity: parseGenericArity(declaration.displayName),
    parameterCount: methodMeta.parameterCount,
    isExtensionMethod: methodMeta.isExtensionMethod,
    staticContainer: parseStaticContainer(declaration.displayName),
  };
}

function countArguments(callArgs: string): number {
  if (!callArgs.trim()) {
    return 0;
  }
  let count = 1;
  let parenDepth = 0;
  let angleDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;
  let quote: '"' | "'" | undefined;
  for (let index = 0; index < callArgs.length; index += 1) {
    const ch = callArgs[index];
    if (quote) {
      if (ch === quote && callArgs[index - 1] !== '\\') {
        quote = undefined;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '(') {
      parenDepth += 1;
      continue;
    }
    if (ch === ')') {
      parenDepth = Math.max(parenDepth - 1, 0);
      continue;
    }
    if (ch === '<') {
      angleDepth += 1;
      continue;
    }
    if (ch === '>') {
      angleDepth = Math.max(angleDepth - 1, 0);
      continue;
    }
    if (ch === '[') {
      squareDepth += 1;
      continue;
    }
    if (ch === ']') {
      squareDepth = Math.max(squareDepth - 1, 0);
      continue;
    }
    if (ch === '{') {
      braceDepth += 1;
      continue;
    }
    if (ch === '}') {
      braceDepth = Math.max(braceDepth - 1, 0);
      continue;
    }
    if (ch === ',' && parenDepth === 0 && angleDepth === 0 && squareDepth === 0 && braceDepth === 0) {
      count += 1;
    }
  }
  return count;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseCallContext(rawLine: string, calleeToken: string): CSharpCallContext {
  const firstSegment = calleeToken.split('.')[0];
  const hasQualifier = calleeToken.includes('.');
  const context: CSharpCallContext = {
    hasQualifier,
    qualifierToken: hasQualifier ? firstSegment : undefined,
  };

  const callRegex = new RegExp(
    `${escapeRegExp(calleeToken)}(?:\\s*<([^>\\r\\n]+)>)?\\s*\\(`,
    'i'
  );
  const match = callRegex.exec(rawLine);
  if (!match) {
    return context;
  }

  if (match[1]) {
    context.genericArity = match[1]
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length;
  }

  const openParenIndex = match.index + match[0].lastIndexOf('(');
  if (openParenIndex < 0 || openParenIndex >= rawLine.length) {
    return context;
  }

  let depth = 1;
  let closeIndex = -1;
  for (let index = openParenIndex + 1; index < rawLine.length; index += 1) {
    const ch = rawLine[index];
    if (ch === '(') {
      depth += 1;
      continue;
    }
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        closeIndex = index;
        break;
      }
    }
  }
  if (closeIndex <= openParenIndex) {
    return context;
  }
  const argsRaw = rawLine.slice(openParenIndex + 1, closeIndex);
  context.argumentCount = countArguments(argsRaw);
  return context;
}

function collectFileResolutionContexts(
  analysis: CSharpProjectAnalysisReport
): Map<string, CSharpFileResolutionContext> {
  const contexts = new Map<string, CSharpFileResolutionContext>();
  const root = analysis.repositoryRoot ? path.resolve(analysis.repositoryRoot) : undefined;
  for (const moduleAnalysis of analysis.moduleAnalyses) {
    let lines: string[] = [];
    if (root) {
      const absolute = path.join(root, moduleAnalysis.filePath);
      if (fs.existsSync(absolute)) {
        lines = fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n').split('\n');
      }
    }
    contexts.set(moduleAnalysis.filePath, {
      aliases: moduleAnalysis.usingAliases ?? {},
      staticUsings: moduleAnalysis.staticUsings ?? [],
      lineIndex: lines,
    });
  }
  return contexts;
}

function expandAliasCallee(
  calleeToken: string,
  aliases: Readonly<Record<string, string>>
): string | undefined {
  if (!calleeToken.includes('.')) {
    return undefined;
  }
  const [head, ...rest] = calleeToken.split('.');
  const mapped = aliases[head];
  if (!mapped) {
    return undefined;
  }
  if (rest.length === 0) {
    return mapped;
  }
  return `${mapped}.${rest.join('.')}`;
}

function resolveFromStaticUsing(
  matchIndex: MatchIndex,
  calleeToken: string,
  staticUsings: readonly string[]
): CSharpSymbolDeclarationRef[] {
  if (calleeToken.includes('.')) {
    return [];
  }
  const methodKey = canonicalizeToken(calleeToken);
  const output: CSharpSymbolDeclarationRef[] = [];
  for (const staticUsing of staticUsings) {
    const prefix = `${canonicalizeToken(staticUsing)}.`;
    const candidates = matchIndex.byFullName.get(`${prefix}${methodKey}`) ?? [];
    output.push(...candidates);
  }
  return dedupeBySymbolId(output);
}

function filterCandidatesByContext(
  declarations: readonly CSharpSymbolDeclarationRef[],
  matchIndex: MatchIndex,
  callContext: CSharpCallContext
): CSharpSymbolDeclarationRef[] {
  if (declarations.length <= 1) {
    return [...declarations];
  }

  let output = [...declarations];

  if (callContext.genericArity != null) {
    const genericFiltered = output.filter((candidate) => {
      const meta = matchIndex.declarationMetaBySymbolId.get(candidate.symbolId);
      return meta?.genericArity === callContext.genericArity;
    });
    if (genericFiltered.length > 0) {
      output = genericFiltered;
    }
  }

  if (callContext.argumentCount != null) {
    const methodCandidates = output.filter((candidate) => candidate.kind === 'method');
    if (methodCandidates.length > 0) {
      const extensionExpectedCount = callContext.hasQualifier ? callContext.argumentCount + 1 : undefined;
      const filteredByArgs = methodCandidates.filter((candidate) => {
        const meta = matchIndex.declarationMetaBySymbolId.get(candidate.symbolId);
        const parameterCount = meta?.parameterCount;
        if (parameterCount == null) {
          return false;
        }
        if (
          callContext.hasQualifier &&
          meta?.isExtensionMethod &&
          extensionExpectedCount != null
        ) {
          return parameterCount === extensionExpectedCount;
        }
        return parameterCount === callContext.argumentCount;
      });
      if (filteredByArgs.length > 0) {
        output = filteredByArgs;
      }
    }
  }

  return dedupeBySymbolId(output);
}

function resolveDeclarationsForEdge(
  matchIndex: MatchIndex,
  calleeToken: string,
  fileContext: CSharpFileResolutionContext,
  callContext: CSharpCallContext
): CSharpSymbolDeclarationRef[] {
  const direct = resolveDeclarations(matchIndex, calleeToken);
  const aliasExpanded = expandAliasCallee(calleeToken, fileContext.aliases);
  const aliasResolved = aliasExpanded ? resolveDeclarations(matchIndex, aliasExpanded) : [];
  const staticResolved =
    direct.length + aliasResolved.length > 0
      ? []
      : resolveFromStaticUsing(matchIndex, calleeToken, fileContext.staticUsings);
  const merged = dedupeBySymbolId([...direct, ...aliasResolved, ...staticResolved]);
  return filterCandidatesByContext(merged, matchIndex, callContext);
}

function readSourceLine(
  context: CSharpFileResolutionContext | undefined,
  lineNo: number | undefined
): string {
  if (!context || lineNo == null || lineNo <= 0) {
    return '';
  }
  return context.lineIndex[lineNo - 1] ?? '';
}

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function normalizeContextPath(filePath: string): string {
  return toPosix(path.posix.normalize(filePath)).replace(/^\/+/, '');
}

function resolveFileContext(
  contexts: ReadonlyMap<string, CSharpFileResolutionContext>,
  evidencePath: string | undefined
): CSharpFileResolutionContext | undefined {
  if (!evidencePath) {
    return undefined;
  }
  const normalized = normalizeContextPath(evidencePath);
  return contexts.get(normalized) ?? contexts.get(toPosix(evidencePath));
}

function toReadableCallee(calleeToken: string, callContext: CSharpCallContext): string {
  if (callContext.genericArity != null) {
    return `${calleeToken}<${callContext.genericArity}>`;
  }
  return calleeToken;
}

function parseSeveritySuffix(reference: CSharpSymbolReferenceEntry): string {
  if (reference.resolution === 'ambiguous') {
    return ` (${reference.candidateSymbolIds?.length ?? 0} matches)`;
  }
  return '';
}

function collectReferenceWarnings(
  references: readonly CSharpSymbolReferenceEntry[]
): string[] {
  const warnings: string[] = [];
  for (const reference of references) {
    if (reference.resolution === 'resolved') {
      continue;
    }
    warnings.push(`${reference.resolution} symbol reference: ${reference.callee}${parseSeveritySuffix(reference)}`);
  }
  return warnings;
}

function toDeclaration(symbol: SymbolRef): CSharpSymbolDeclarationRef {
  return {
    symbolId: symbol.symbolId,
    displayName: symbol.displayName,
    kind: symbol.kind,
    filePath: symbol.range.filePath,
  };
}

function shortName(displayName: string): string {
  const parts = displayName.split('.');
  return parts[parts.length - 1] ?? displayName;
}

function buildMatchIndex(
  declarations: readonly CSharpSymbolDeclarationRef[]
): MatchIndex {
  const byFullName = new Map<string, CSharpSymbolDeclarationRef[]>();
  const byShortName = new Map<string, CSharpSymbolDeclarationRef[]>();
  const declarationMetaBySymbolId = new Map<string, CSharpDeclarationMeta>();
  for (const declaration of declarations) {
    const meta = toDeclarationMeta({
      symbolId: declaration.symbolId,
      displayName: declaration.displayName,
      kind: declaration.kind,
      range: {
        filePath: declaration.filePath,
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 1,
      },
    });
    declarationMetaBySymbolId.set(declaration.symbolId, meta);
    const fullKey = canonicalizeToken(meta.declaration.displayName);
    const shortKey = canonicalizeToken(meta.shortName);
    byFullName.set(fullKey, [...(byFullName.get(fullKey) ?? []), declaration]);
    byShortName.set(shortKey, [...(byShortName.get(shortKey) ?? []), declaration]);
  }
  return {
    byFullName,
    byShortName,
    declarationMetaBySymbolId,
  };
}

function parseCalleeToken(edge: EdgeRef): string | undefined {
  if (!edge.to.startsWith('symbol:')) {
    return undefined;
  }
  return edge.to.slice('symbol:'.length).trim();
}

function resolveDeclarations(
  matchIndex: MatchIndex,
  calleeToken: string
): CSharpSymbolDeclarationRef[] {
  const fullKey = canonicalizeToken(calleeToken);
  const fullMatches = matchIndex.byFullName.get(fullKey) ?? [];
  if (fullMatches.length > 0) {
    return fullMatches;
  }

  const tail = calleeToken.includes('.')
    ? calleeToken.split('.').pop() ?? calleeToken
    : calleeToken;
  const shortKey = canonicalizeToken(tail);
  return matchIndex.byShortName.get(shortKey) ?? [];
}

export function buildCSharpSymbolReferenceIndex(
  analysis: CSharpProjectAnalysisReport
): CSharpSymbolReferenceIndex {
  const declarations = analysis.inventory.files.flatMap((file) =>
    (file.symbols ?? []).map((symbol) => toDeclaration(symbol))
  );
  const matchIndex = buildMatchIndex(declarations);
  const fileContexts = collectFileResolutionContexts(analysis);
  const references: CSharpSymbolReferenceEntry[] = [];

  for (const edge of analysis.inventory.callEdges ?? []) {
    const calleeToken = parseCalleeToken(edge);
    if (!calleeToken) {
      continue;
    }
    const evidencePath = parseEvidenceFilePath(edge.evidence ?? '');
    const evidenceLine = edge.evidence ? parseEvidenceLine(edge.evidence) : undefined;
    const fileContext = resolveFileContext(fileContexts, evidencePath);
    const rawLine = readSourceLine(fileContext, evidenceLine);
    const callContext = parseCallContext(rawLine, calleeToken);
    const candidates = resolveDeclarationsForEdge(
      matchIndex,
      calleeToken,
      fileContext ?? { aliases: {}, staticUsings: [], lineIndex: [] },
      callContext
    );
    const referenceId = `${edge.from}->${edge.to}@${edge.evidence ?? 'n/a'}`;
    const readableCallee = toReadableCallee(calleeToken, callContext);
    if (candidates.length === 1) {
      references.push({
        referenceId,
        fromSymbolId: edge.from,
        fromFilePath: evidencePath ?? 'unknown',
        fromLine: evidenceLine,
        callee: readableCallee,
        resolution: 'resolved',
        toSymbolId: candidates[0].symbolId,
        evidence: edge.evidence ?? 'n/a',
      });
      continue;
    }
    if (candidates.length > 1) {
      references.push({
        referenceId,
        fromSymbolId: edge.from,
        fromFilePath: evidencePath ?? 'unknown',
        fromLine: evidenceLine,
        callee: readableCallee,
        resolution: 'ambiguous',
        candidateSymbolIds: candidates.map((candidate) => candidate.symbolId),
        evidence: edge.evidence ?? 'n/a',
      });
      continue;
    }
    references.push({
      referenceId,
      fromSymbolId: edge.from,
      fromFilePath: evidencePath ?? 'unknown',
      fromLine: evidenceLine,
      callee: readableCallee,
      resolution: 'unresolved',
      evidence: edge.evidence ?? 'n/a',
    });
  }

  return {
    declarations,
    references,
    resolvedCount: references.filter((reference) => reference.resolution === 'resolved').length,
    ambiguousCount: references.filter((reference) => reference.resolution === 'ambiguous').length,
    unresolvedCount: references.filter((reference) => reference.resolution === 'unresolved').length,
    warnings: collectReferenceWarnings(references),
  };
}
