import type {
  AtomicMapDecompositionGraphSummary,
  AtomicMapDecompositionReport,
  AtomicMapDecompositionRequest,
  AtomicMapEdge,
  AtomicMapEntrypoint,
  AtomicMapMember,
  EdgeRef,
  SourceInventoryReport,
} from '../../../plugin-sdk/src/language-adapter';
import { analyzePythonProject } from './python-static-analysis';

function toMemberId(mapId: string, filePath: string): string {
  return `${mapId}:${filePath}`;
}

function resolveNodeToFile(node: string, files: ReadonlySet<string>): string | undefined {
  if (files.has(node)) {
    return node;
  }
  const hashIndex = node.indexOf('#');
  if (hashIndex > 0) {
    const maybeFile = node.slice(0, hashIndex);
    if (files.has(maybeFile)) {
      return maybeFile;
    }
  }
  return undefined;
}

function buildMembers(mapId: string, inventory: SourceInventoryReport): AtomicMapMember[] {
  return inventory.files.map((file) => ({
    atomId: toMemberId(mapId, file.filePath),
    title: file.filePath,
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
  inventory: SourceInventoryReport,
  cliEntrypoints: readonly string[]
): AtomicMapEntrypoint[] {
  const direct = cliEntrypoints.map((filePath) => ({
    entrypointId: toMemberId(mapId, filePath),
    reason: 'python __main__ guard detected',
    evidence: filePath,
  }));
  const fallback = inventory.files
    .map((file) => file.filePath)
    .filter((filePath) => /(?:^|\/)(__main__|main)\.py$/i.test(filePath))
    .map((filePath) => ({
      entrypointId: toMemberId(mapId, filePath),
      reason: 'conventional python entrypoint file',
      evidence: filePath,
    }));
  const byId = new Map<string, AtomicMapEntrypoint>();
  for (const entrypoint of [...direct, ...fallback]) {
    byId.set(entrypoint.entrypointId, entrypoint);
  }
  return Array.from(byId.values()).sort((left, right) =>
    left.entrypointId.localeCompare(right.entrypointId)
  );
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

export async function buildPythonAtomicMapDecomposition(
  request: AtomicMapDecompositionRequest
): Promise<AtomicMapDecompositionReport> {
  const analysis = await analyzePythonProject({
    repositoryRoot: request.repositoryRoot,
    includeGlobs: ['**/*.py'],
  });
  const inventory = request.sourceInventory ?? analysis.inventory;
  const dependencyEdges = request.dependencyEdges ?? inventory.dependencyEdges ?? [];
  const callEdges = request.callEdges ?? inventory.callEdges ?? [];
  const artifactEdges = request.artifactEdges ?? inventory.artifactEdges ?? [];
  const members = buildMembers(request.mapId, inventory);
  const files = new Set(inventory.files.map((file) => file.filePath));
  const edges: AtomicMapEdge[] = [];
  pushEdges(request.mapId, dependencyEdges, 'dependency', files, edges);
  pushEdges(request.mapId, callEdges, 'call', files, edges);
  pushEdges(request.mapId, artifactEdges, 'artifact', files, edges);
  const entrypoints = buildEntrypoints(request.mapId, inventory, analysis.surface.cliEntrypoints);
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
      requiredEvidence: [
        'python-source-inventory',
        'python-graph-summary',
        'python-entrypoints',
      ],
      missing,
      messages:
        missing.length === 0
          ? ['Python map decomposition evidence gate accepted.']
          : [`Missing evidence constraints: ${missing.join(', ')}`],
    },
    warnings: [
      ...(inventory.warnings ?? []),
      ...(analysis.surface.sideEffectWarnings ?? []).slice(0, 5),
    ],
  };
}
