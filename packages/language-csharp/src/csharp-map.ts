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
import { buildCSharpSolutionProjectGraph } from './csharp-solution-graph';

export interface CSharpMapThresholdProfile {
  level: 'small' | 'medium' | 'large' | 'explicit';
  minMembers: number;
  minEdges: number;
  minEntrypoints: number;
  reason: string;
}

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

export function deriveCSharpMapThresholdProfile(
  memberCount: number,
  projectCount: number
): CSharpMapThresholdProfile {
  if (memberCount >= 14 || projectCount >= 4) {
    return {
      level: 'large',
      minMembers: 8,
      minEdges: 10,
      minEntrypoints: 1,
      reason: `large solution profile (members=${memberCount}, projects=${projectCount})`,
    };
  }
  if (memberCount >= 8 || projectCount >= 2) {
    return {
      level: 'medium',
      minMembers: 4,
      minEdges: 4,
      minEntrypoints: 1,
      reason: `medium solution profile (members=${memberCount}, projects=${projectCount})`,
    };
  }
  return {
    level: 'small',
    minMembers: 1,
    minEdges: 0,
    minEntrypoints: 1,
    reason: `small solution profile (members=${memberCount}, projects=${projectCount})`,
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
  const projectGraph = buildCSharpSolutionProjectGraph(request.repositoryRoot);

  const explicitThresholdRequested =
    request.minMembers != null || request.minEdges != null || request.minEntrypoints != null;
  const thresholdProfile: CSharpMapThresholdProfile = explicitThresholdRequested
    ? {
        level: 'explicit',
        minMembers: request.minMembers ?? 1,
        minEdges: request.minEdges ?? 0,
        minEntrypoints: request.minEntrypoints ?? 1,
        reason: 'explicit threshold from request',
      }
    : deriveCSharpMapThresholdProfile(members.length, projectGraph.summary.projectCount);

  const minMembers = thresholdProfile.minMembers;
  const minEdges = thresholdProfile.minEdges;
  const minEntrypoints = thresholdProfile.minEntrypoints;
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
        'csharp-source-inventory',
        'csharp-graph-summary',
        'csharp-entrypoints',
        `csharp-threshold-profile:${thresholdProfile.level}`,
      ],
      missing,
      messages:
        missing.length === 0
          ? [
              'C# map decomposition evidence gate accepted.',
              `threshold-profile=${thresholdProfile.level}; ${thresholdProfile.reason}`,
            ]
          : [
              `Missing evidence constraints: ${missing.join(', ')}`,
              `threshold-profile=${thresholdProfile.level}; ${thresholdProfile.reason}`,
            ],
    },
    warnings: [
      ...(inventory.warnings ?? []),
      ...projectGraph.warnings.slice(0, 3),
      ...(thresholdProfile.level === 'large'
        ? ['large solution threshold profile enabled for decomposition evidence gate']
        : []),
    ],
  };
}
