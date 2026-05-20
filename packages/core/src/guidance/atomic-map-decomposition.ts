import type {
  AtomicMapDecompositionEvidenceGate,
  AtomicMapDecompositionReport,
  AtomicMapDecompositionRequest,
  AtomicMapEdge,
  AtomicMapEntrypoint,
  AtomicMapMember,
  EdgeRef,
  SourceFileEntry,
} from '../../../plugin-sdk/src/language-adapter';

export interface AtomicMapGateThresholds {
  minMembers: number;
  minEdges: number;
  minEntrypoints: number;
  requiredEvidence: string[];
}

export interface GraphToMapDecompositionRequest extends AtomicMapDecompositionRequest {
  gateThresholds?: Partial<AtomicMapGateThresholds>;
}

interface TaggedEdge extends EdgeRef {
  graphKind: 'dependency' | 'call' | 'artifact';
}

const DEFAULT_GATE_THRESHOLDS: AtomicMapGateThresholds = {
  minMembers: 1,
  minEdges: 1,
  minEntrypoints: 1,
  requiredEvidence: ['source-inventory', 'graph-conversion-report', 'entrypoint-proof'],
};

function normalizeAtomId(rawId: string): string {
  const normalized = rawId.trim().replace(/\\/g, '/').replace(/\s+/g, '-');
  return normalized.replace(/[^a-zA-Z0-9._:/-]/g, '-');
}

function buildMemberTitle(atomId: string): string {
  const token = atomId.split(/[/:#]/).filter(Boolean).pop() ?? atomId;
  return token.replace(/[-_]/g, ' ');
}

function collectTaggedEdges(request: GraphToMapDecompositionRequest): TaggedEdge[] {
  const tagged: TaggedEdge[] = [];
  const pushEdges = (edges: readonly EdgeRef[] | undefined, graphKind: TaggedEdge['graphKind']): void => {
    for (const edge of edges ?? []) {
      tagged.push({
        ...edge,
        graphKind,
      });
    }
  };

  pushEdges(request.dependencyEdges ?? request.sourceInventory?.dependencyEdges, 'dependency');
  pushEdges(request.callEdges ?? request.sourceInventory?.callEdges, 'call');
  pushEdges(request.artifactEdges ?? request.sourceInventory?.artifactEdges, 'artifact');
  return tagged;
}

function collectMembers(
  sourceFiles: readonly SourceFileEntry[] | undefined,
  taggedEdges: readonly TaggedEdge[]
): AtomicMapMember[] {
  const memberIds = new Map<string, AtomicMapMember>();

  const upsertMember = (rawId: string): void => {
    const atomId = normalizeAtomId(rawId);
    if (!atomId || memberIds.has(atomId)) {
      return;
    }
    memberIds.set(atomId, {
      atomId,
      title: buildMemberTitle(atomId),
    });
  };

  for (const edge of taggedEdges) {
    upsertMember(edge.from);
    upsertMember(edge.to);
  }

  for (const file of sourceFiles ?? []) {
    upsertMember(file.filePath);
    for (const symbol of file.symbols ?? []) {
      upsertMember(symbol.symbolId);
    }
  }

  return Array.from(memberIds.values()).sort((left, right) => left.atomId.localeCompare(right.atomId));
}

function buildMapEdges(taggedEdges: readonly TaggedEdge[]): AtomicMapEdge[] {
  return taggedEdges.map((edge) => ({
    from: normalizeAtomId(edge.from),
    to: normalizeAtomId(edge.to),
    relation: edge.relation,
    graphKind: edge.graphKind,
  }));
}

function collectEntrypoints(
  sourceFiles: readonly SourceFileEntry[] | undefined,
  mapEdges: readonly AtomicMapEdge[]
): AtomicMapEntrypoint[] {
  const entrypoints: AtomicMapEntrypoint[] = [];
  const seen = new Set<string>();
  const pushEntrypoint = (entrypointId: string, reason: string, evidence?: string): void => {
    const normalized = normalizeAtomId(entrypointId);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    entrypoints.push({
      entrypointId: normalized,
      reason,
      evidence,
    });
  };

  for (const file of sourceFiles ?? []) {
    if (/(^|\/)(main|index|app|entry)\.[a-z0-9]+$/i.test(file.filePath)) {
      pushEntrypoint(file.filePath, 'heuristic-main-file', file.filePath);
    }
  }

  if (entrypoints.length === 0) {
    const inbound = new Set(mapEdges.map((edge) => edge.to));
    for (const edge of mapEdges) {
      if (!inbound.has(edge.from)) {
        pushEntrypoint(edge.from, 'graph-root-node', `${edge.from} -> ${edge.to}`);
      }
    }
  }

  return entrypoints;
}

function resolveThresholds(request: GraphToMapDecompositionRequest): AtomicMapGateThresholds {
  return {
    minMembers: request.gateThresholds?.minMembers ?? request.minMembers ?? DEFAULT_GATE_THRESHOLDS.minMembers,
    minEdges: request.gateThresholds?.minEdges ?? request.minEdges ?? DEFAULT_GATE_THRESHOLDS.minEdges,
    minEntrypoints:
      request.gateThresholds?.minEntrypoints ??
      request.minEntrypoints ??
      DEFAULT_GATE_THRESHOLDS.minEntrypoints,
    requiredEvidence:
      request.gateThresholds?.requiredEvidence ?? DEFAULT_GATE_THRESHOLDS.requiredEvidence,
  };
}

export function buildAtomicMapDecompositionEvidenceGate(
  report: Pick<AtomicMapDecompositionReport, 'members' | 'edges' | 'entrypoints'>,
  thresholds: AtomicMapGateThresholds
): AtomicMapDecompositionEvidenceGate {
  const missing: string[] = [];
  const messages: string[] = [];

  if (report.members.length < thresholds.minMembers) {
    missing.push(`members<${thresholds.minMembers}`);
  }
  if (report.edges.length < thresholds.minEdges) {
    missing.push(`edges<${thresholds.minEdges}`);
  }
  if (report.entrypoints.length < thresholds.minEntrypoints) {
    missing.push(`entrypoints<${thresholds.minEntrypoints}`);
  }

  if (missing.length === 0) {
    messages.push('atomic map decomposition evidence gate passed');
  } else {
    messages.push(`atomic map decomposition evidence gate failed: ${missing.join(', ')}`);
  }

  return {
    accepted: missing.length === 0,
    requiredEvidence: thresholds.requiredEvidence,
    missing,
    messages,
  };
}

export function buildGraphToMapDecompositionProposal(
  request: GraphToMapDecompositionRequest
): AtomicMapDecompositionReport {
  const taggedEdges = collectTaggedEdges(request);
  const sourceFiles = request.sourceInventory?.files ?? [];
  const members = collectMembers(sourceFiles, taggedEdges);
  const edges = buildMapEdges(taggedEdges);
  const entrypoints = collectEntrypoints(sourceFiles, edges);
  const thresholds = resolveThresholds(request);
  const evidenceGate = buildAtomicMapDecompositionEvidenceGate(
    {
      members,
      edges,
      entrypoints,
    },
    thresholds
  );

  const report: AtomicMapDecompositionReport = {
    mapId: request.mapId,
    members,
    edges,
    entrypoints,
    graphSummary: {
      dependencyEdgeCount: taggedEdges.filter((edge) => edge.graphKind === 'dependency').length,
      callEdgeCount: taggedEdges.filter((edge) => edge.graphKind === 'call').length,
      artifactEdgeCount: taggedEdges.filter((edge) => edge.graphKind === 'artifact').length,
      totalEdgeCount: taggedEdges.length,
    },
    evidenceGate,
    warnings: evidenceGate.accepted ? [] : [...evidenceGate.messages],
  };

  return report;
}

