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
}

function canonicalizeToken(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/`[0-9]+/g, '')
    .toLowerCase();
}

function parseEvidenceLine(evidence: string): number | undefined {
  const match = evidence.match(/:(\d+)$/);
  return match ? Number(match[1]) : undefined;
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
  for (const declaration of declarations) {
    const fullKey = canonicalizeToken(declaration.displayName);
    const shortKey = canonicalizeToken(shortName(declaration.displayName));
    byFullName.set(fullKey, [...(byFullName.get(fullKey) ?? []), declaration]);
    byShortName.set(shortKey, [...(byShortName.get(shortKey) ?? []), declaration]);
  }
  return {
    byFullName,
    byShortName,
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
  const references: CSharpSymbolReferenceEntry[] = [];
  const warnings: string[] = [];

  for (const edge of analysis.inventory.callEdges ?? []) {
    const calleeToken = parseCalleeToken(edge);
    if (!calleeToken) {
      continue;
    }
    const candidates = resolveDeclarations(matchIndex, calleeToken);
    const referenceId = `${edge.from}->${edge.to}@${edge.evidence ?? 'n/a'}`;
    if (candidates.length === 1) {
      references.push({
        referenceId,
        fromSymbolId: edge.from,
        fromFilePath: edge.evidence?.split(':')[0] ?? 'unknown',
        fromLine: edge.evidence ? parseEvidenceLine(edge.evidence) : undefined,
        callee: calleeToken,
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
        fromFilePath: edge.evidence?.split(':')[0] ?? 'unknown',
        fromLine: edge.evidence ? parseEvidenceLine(edge.evidence) : undefined,
        callee: calleeToken,
        resolution: 'ambiguous',
        candidateSymbolIds: candidates.map((candidate) => candidate.symbolId),
        evidence: edge.evidence ?? 'n/a',
      });
      warnings.push(`ambiguous symbol reference: ${calleeToken} (${candidates.length} matches)`);
      continue;
    }
    references.push({
      referenceId,
      fromSymbolId: edge.from,
      fromFilePath: edge.evidence?.split(':')[0] ?? 'unknown',
      fromLine: edge.evidence ? parseEvidenceLine(edge.evidence) : undefined,
      callee: calleeToken,
      resolution: 'unresolved',
      evidence: edge.evidence ?? 'n/a',
    });
    warnings.push(`unresolved symbol reference: ${calleeToken}`);
  }

  return {
    declarations,
    references,
    resolvedCount: references.filter((reference) => reference.resolution === 'resolved').length,
    ambiguousCount: references.filter((reference) => reference.resolution === 'ambiguous').length,
    unresolvedCount: references.filter((reference) => reference.resolution === 'unresolved').length,
    warnings,
  };
}
