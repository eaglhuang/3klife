import type {
  AtomicMapEdge,
  AtomicMapEntrypoint,
  AtomicMapDecompositionGraphSummary,
  AtomicMapMember,
  AtomicMapDecompositionReport,
  AtomicMapDecompositionRequest,
  EdgeRef,
  SourceInventoryReport,
  SymbolRef,
} from '../../../plugin-sdk/src/language-adapter';
import { buildCSharpInventory } from './csharp-inventory';

function toMemberId(mapId: string, filePath: string): string {
  return `${mapId}:${filePath}`;
}

function resolveNodeToFile(node: string, fileSet: ReadonlySet<string>): string | undefined {
  if (fileSet.has(node)) {
    return node;
  }
  const hashIndex = node.indexOf('#');
  if (hashIndex > 0) {
    const maybeFile = node.slice(0, hashIndex);
    if (fileSet.has(maybeFile)) {
      return maybeFile;
    }
  }
  return undefined;
}

function buildMembers(mapId: string, inventory: SourceInventoryReport): AtomicMapMember[] {
  return inventory.files.map((fileEntry) => ({
    atomId: toMemberId(mapId, fileEntry.filePath),
    title: fileEntry.filePath,
  }));
}

function pushEdges(
  mapId: string,
  edges: readonly EdgeRef[],
  graphKind: 'dependency' | 'call' | 'artifact',
  files: ReadonlySet<string>,
  output: AtomicMapEdge[]
): void {
  for (const edge of edges) {
    const fromFile = resolveNodeToFile(edge.from, files);
    if (!fromFile) {
      continue;
    }
    const toFile = resolveNodeToFile(edge.to, files);
    output.push({
      from: toMemberId(mapId, fromFile),
      to: toFile ? toMemberId(mapId, toFile) : edge.to,
      relation: edge.relation,
      graphKind,
    });
  }
}

function buildEntrypoints(
  mapId: string,
  inventory: SourceInventoryReport
): AtomicMapEntrypoint[] {
  const entrypoints: AtomicMapEntrypoint[] = [];
  for (const file of inventory.files) {
    const hasMainMethod = (file.symbols ?? []).some(
      (symbol: SymbolRef) => symbol.kind === 'method' && symbol.displayName.endsWith('.Main')
    );
    const looksLikeProgram = /program\.cs$/i.test(file.filePath);
    const looksLikeTopLevel = /toplevel|runner/i.test(file.filePath);
    if (hasMainMethod || looksLikeProgram || looksLikeTopLevel) {
      entrypoints.push({
        entrypointId: toMemberId(mapId, file.filePath),
        reason: hasMainMethod ? 'contains Main method' : 'conventional entrypoint file',
        evidence: file.filePath,
      });
    }
  }
  return entrypoints;
}

function buildGraphSummary(
  dependencyEdges: readonly EdgeRef[],
  callEdges: readonly EdgeRef[],
  artifactEdges: readonly EdgeRef[]
): AtomicMapDecompositionGraphSummary {
  return {
    dependencyEdgeCount: dependencyEdges.length,
    callEdgeCount: callEdges.length,
    artifactEdgeCount: artifactEdges.length,
    totalEdgeCount: dependencyEdges.length + callEdges.length + artifactEdges.length,
  };
}

export async function buildCSharpAtomicMapDecomposition(
  request: AtomicMapDecompositionRequest
): Promise<AtomicMapDecompositionReport> {
  const inventory =
    request.sourceInventory ??
    buildCSharpInventory({
      repositoryRoot: request.repositoryRoot,
      includeGlobs: ['**/*.cs'],
    }).inventory;
  const dependencyEdges = request.dependencyEdges ?? inventory.dependencyEdges ?? [];
  const callEdges = request.callEdges ?? inventory.callEdges ?? [];
  const artifactEdges = request.artifactEdges ?? inventory.artifactEdges ?? [];
  const members = buildMembers(request.mapId, inventory);
  const files = new Set(inventory.files.map((file) => file.filePath));
  const edges: AtomicMapEdge[] = [];
  pushEdges(request.mapId, dependencyEdges, 'dependency', files, edges);
  pushEdges(request.mapId, callEdges, 'call', files, edges);
  pushEdges(request.mapId, artifactEdges, 'artifact', files, edges);
  const entrypoints = buildEntrypoints(request.mapId, inventory);
  const graphSummary = buildGraphSummary(dependencyEdges, callEdges, artifactEdges);

  const minMembers = request.minMembers ?? 1;
  const minEdges = request.minEdges ?? 0;
  const minEntrypoints = request.minEntrypoints ?? 1;
  const missing: string[] = [];
  if (members.length < minMembers) {
    missing.push(`members>=${minMembers}`);
  }
  if (edges.length < minEdges) {
    missing.push(`edges>=${minEdges}`);
  }
  if (entrypoints.length < minEntrypoints) {
    missing.push(`entrypoints>=${minEntrypoints}`);
  }

  return {
    mapId: request.mapId,
    members,
    edges,
    entrypoints,
    graphSummary,
    evidenceGate: {
      accepted: missing.length === 0,
      requiredEvidence: ['csharp-source-inventory', 'csharp-graph-summary', 'csharp-entrypoints'],
      missing,
      messages:
        missing.length === 0
          ? ['C# map decomposition evidence gate accepted.']
          : [`Missing evidence constraints: ${missing.join(', ')}`],
    },
    warnings: inventory.warnings ?? [],
  };
}
