import {
  collectCSharpProjectEvidence,
  type CSharpCsprojProfile,
  type CSharpProjectEvidence,
} from './csharp-profile';
import {
  buildCSharpSolutionProjectGraph,
  type CSharpSolutionProjectGraph,
} from './csharp-solution-graph';

export interface CSharpCsprojRiskFinding {
  riskId: string;
  kind:
    | 'multi-target-framework'
    | 'legacy-target-framework'
    | 'warnings-as-errors-disabled'
    | 'project-not-in-solution'
    | 'missing-project-reference-target'
    | 'test-project-detected';
  severity: 'info' | 'warning' | 'error';
  projectPath: string;
  evidence: string;
}

export interface CSharpCsprojRiskSummary {
  findingCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface CSharpCsprojRiskReport {
  findings: CSharpCsprojRiskFinding[];
  warnings: string[];
  hasBlockingRisk: boolean;
  summary: CSharpCsprojRiskSummary;
}

function buildFinding(
  kind: CSharpCsprojRiskFinding['kind'],
  severity: CSharpCsprojRiskFinding['severity'],
  projectPath: string,
  evidence: string
): CSharpCsprojRiskFinding {
  return {
    riskId: `${kind}:${projectPath}:${evidence}`.toLowerCase(),
    kind,
    severity,
    projectPath,
    evidence,
  };
}

function evaluateCsprojProfile(profile: CSharpCsprojProfile): CSharpCsprojRiskFinding[] {
  const findings: CSharpCsprojRiskFinding[] = [];

  if (profile.targetFrameworks.length > 1) {
    findings.push(
      buildFinding(
        'multi-target-framework',
        'warning',
        profile.relativePath,
        `target frameworks=${profile.targetFrameworks.join(',')}`
      )
    );
  }

  for (const framework of profile.targetFrameworks) {
    if (/^net[234]\./i.test(framework) || /^net4[0-8]?$/i.test(framework)) {
      findings.push(
        buildFinding(
          'legacy-target-framework',
          'error',
          profile.relativePath,
          `legacy framework=${framework}`
        )
      );
    }
  }

  if ((profile.treatWarningsAsErrors ?? '').toLowerCase() !== 'true') {
    findings.push(
      buildFinding(
        'warnings-as-errors-disabled',
        profile.isTestProject ? 'info' : 'warning',
        profile.relativePath,
        'TreatWarningsAsErrors is not true'
      )
    );
  }

  if (profile.isTestProject) {
    findings.push(
      buildFinding(
        'test-project-detected',
        'info',
        profile.relativePath,
        'IsTestProject=true'
      )
    );
  }

  return findings;
}

export function buildCSharpCsprojRiskModel(
  repositoryRoot: string,
  projectEvidenceInput?: CSharpProjectEvidence,
  projectGraphInput?: CSharpSolutionProjectGraph
): CSharpCsprojRiskReport {
  const projectEvidence =
    projectEvidenceInput ?? collectCSharpProjectEvidence(repositoryRoot);
  const projectGraph =
    projectGraphInput ??
    buildCSharpSolutionProjectGraph(repositoryRoot, projectEvidence);

  const findings: CSharpCsprojRiskFinding[] = [];
  for (const profile of projectEvidence.csprojProfiles) {
    findings.push(...evaluateCsprojProfile(profile));
  }

  if (projectGraph.solutionPath) {
    for (const node of projectGraph.nodes) {
      if (node.source !== 'csproj' || node.includedInSolution) {
        continue;
      }
      findings.push(
        buildFinding(
          'project-not-in-solution',
          'warning',
          node.projectPath,
          `${node.projectPath} is not included in ${projectGraph.solutionPath}`
        )
      );
    }
  }

  for (const warning of projectGraph.warnings) {
    const match = warning.match(
      /^(.+?): missing project reference target (.+?) \(resolved: (.+)\)$/
    );
    if (!match) {
      continue;
    }
    const [, fromProjectPath, projectReference, resolvedPath] = match;
    findings.push(
      buildFinding(
        'missing-project-reference-target',
        'error',
        fromProjectPath,
        `${projectReference} -> ${resolvedPath}`
      )
    );
  }

  const summary: CSharpCsprojRiskSummary = {
    findingCount: findings.length,
    errorCount: findings.filter((finding) => finding.severity === 'error').length,
    warningCount: findings.filter((finding) => finding.severity === 'warning').length,
    infoCount: findings.filter((finding) => finding.severity === 'info').length,
  };

  return {
    findings,
    warnings: [
      ...projectEvidence.warnings,
      ...projectGraph.warnings,
    ],
    hasBlockingRisk: summary.errorCount > 0,
    summary,
  };
}
