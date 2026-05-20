import path from 'node:path';
import {
  collectCSharpProjectEvidence,
  type CSharpCsprojProfile,
  type CSharpProjectEvidence,
  type CSharpSolutionProfile,
} from './csharp-profile';

export interface CSharpSolutionGraphNode {
  projectId: string;
  projectPath: string;
  displayName: string;
  source: 'csproj' | 'solution-entry';
  targetFrameworks: string[];
  isTestProject: boolean;
  includedInSolution: boolean;
}

export interface CSharpSolutionGraphEdge {
  fromProjectId: string;
  toProjectId: string;
  relation: 'solution-includes' | 'project-reference';
  evidence: string;
}

export interface CSharpSolutionGraphSummary {
  solutionCount: number;
  projectCount: number;
  testProjectCount: number;
  orphanProjectCount: number;
  projectReferenceCount: number;
}

export interface CSharpSolutionProjectGraph {
  repositoryRoot: string;
  solutionPath?: string;
  nodes: CSharpSolutionGraphNode[];
  edges: CSharpSolutionGraphEdge[];
  warnings: string[];
  summary: CSharpSolutionGraphSummary;
}

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function normalizeRelativePath(relativePath: string): string {
  return toPosix(path.posix.normalize(relativePath.replace(/^\.\/+/, ''))).replace(/^\/+/, '');
}

function buildProjectId(projectPath: string): string {
  return `project:${projectPath.toLowerCase()}`;
}

function toDisplayName(projectPath: string): string {
  const fileName = projectPath.split('/').pop() ?? projectPath;
  return fileName.replace(/\.csproj$/i, '');
}

function findPrimarySolution(
  solutionProfiles: readonly CSharpSolutionProfile[],
  warnings: string[]
): CSharpSolutionProfile | undefined {
  if (solutionProfiles.length === 0) {
    return undefined;
  }
  if (solutionProfiles.length > 1) {
    warnings.push(
      `multiple solution files detected (${solutionProfiles.length}); using ${solutionProfiles[0].relativePath}`
    );
  }
  return [...solutionProfiles].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  )[0];
}

function buildCsprojNode(
  profile: CSharpCsprojProfile,
  solutionProjectPathSet: ReadonlySet<string>
): CSharpSolutionGraphNode {
  const projectPath = normalizeRelativePath(profile.relativePath);
  return {
    projectId: buildProjectId(projectPath),
    projectPath,
    displayName: toDisplayName(projectPath),
    source: 'csproj',
    targetFrameworks: profile.targetFrameworks,
    isTestProject: profile.isTestProject,
    includedInSolution: solutionProjectPathSet.has(projectPath),
  };
}

function dedupeEdges(edges: readonly CSharpSolutionGraphEdge[]): CSharpSolutionGraphEdge[] {
  const byKey = new Map<string, CSharpSolutionGraphEdge>();
  for (const edge of edges) {
    const key = `${edge.fromProjectId}|${edge.toProjectId}|${edge.relation}|${edge.evidence}`;
    if (!byKey.has(key)) {
      byKey.set(key, edge);
    }
  }
  return Array.from(byKey.values());
}

export function buildCSharpSolutionProjectGraph(
  repositoryRoot: string,
  projectEvidenceInput?: CSharpProjectEvidence
): CSharpSolutionProjectGraph {
  const projectEvidence = projectEvidenceInput ?? collectCSharpProjectEvidence(repositoryRoot);
  const warnings = [...projectEvidence.warnings];
  const primarySolution = findPrimarySolution(projectEvidence.solutionProfiles, warnings);
  const solutionProjectPathSet = new Set(
    (primarySolution?.projectEntries ?? []).map((entry) =>
      normalizeRelativePath(entry.projectPath)
    )
  );

  const nodesByPath = new Map<string, CSharpSolutionGraphNode>();
  for (const csprojProfile of projectEvidence.csprojProfiles) {
    const node = buildCsprojNode(csprojProfile, solutionProjectPathSet);
    nodesByPath.set(node.projectPath, node);
  }

  for (const projectPath of solutionProjectPathSet) {
    if (nodesByPath.has(projectPath)) {
      continue;
    }
    warnings.push(`solution entry project not found in filesystem: ${projectPath}`);
    nodesByPath.set(projectPath, {
      projectId: buildProjectId(projectPath),
      projectPath,
      displayName: toDisplayName(projectPath),
      source: 'solution-entry',
      targetFrameworks: [],
      isTestProject: false,
      includedInSolution: true,
    });
  }

  const nodes = Array.from(nodesByPath.values()).sort((left, right) =>
    left.projectPath.localeCompare(right.projectPath)
  );

  const edges: CSharpSolutionGraphEdge[] = [];
  if (primarySolution) {
    const solutionId = `solution:${normalizeRelativePath(primarySolution.relativePath).toLowerCase()}`;
    for (const projectPath of solutionProjectPathSet) {
      const node = nodesByPath.get(projectPath);
      if (!node) {
        continue;
      }
      edges.push({
        fromProjectId: solutionId,
        toProjectId: node.projectId,
        relation: 'solution-includes',
        evidence: primarySolution.relativePath,
      });
    }
  }

  const csprojByPath = new Map(
    projectEvidence.csprojProfiles.map((profile) => [
      normalizeRelativePath(profile.relativePath),
      profile,
    ])
  );
  for (const [projectPath, csprojProfile] of csprojByPath.entries()) {
    const sourceNode = nodesByPath.get(projectPath);
    if (!sourceNode) {
      continue;
    }
    for (const projectReference of csprojProfile.projectReferences) {
      const normalizedReference = toPosix(projectReference);
      const resolvedPath = normalizeRelativePath(
        toPosix(
          path.posix.normalize(
            path.posix.join(path.posix.dirname(projectPath), normalizedReference)
          )
        )
      );
      const targetNode = nodesByPath.get(resolvedPath);
      if (!targetNode) {
        warnings.push(
          `${projectPath}: missing project reference target ${projectReference} (resolved: ${resolvedPath})`
        );
        continue;
      }
      edges.push({
        fromProjectId: sourceNode.projectId,
        toProjectId: targetNode.projectId,
        relation: 'project-reference',
        evidence: `${projectPath} -> ${projectReference}`,
      });
    }
  }

  const dedupedEdges = dedupeEdges(edges);
  const summary: CSharpSolutionGraphSummary = {
    solutionCount: projectEvidence.solutionProfiles.length,
    projectCount: nodes.length,
    testProjectCount: nodes.filter((node) => node.isTestProject).length,
    orphanProjectCount:
      primarySolution == null ? 0 : nodes.filter((node) => !node.includedInSolution).length,
    projectReferenceCount: dedupedEdges.filter((edge) => edge.relation === 'project-reference')
      .length,
  };

  return {
    repositoryRoot,
    solutionPath: primarySolution?.relativePath,
    nodes,
    edges: dedupedEdges,
    warnings,
    summary,
  };
}
