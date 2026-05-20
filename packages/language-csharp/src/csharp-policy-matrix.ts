import type { CSharpProjectEvidence } from './csharp-profile';

export interface CSharpRuntimePolicyRow {
  policyId: string;
  appliesWhen:
    | 'solution-root'
    | 'csproj-root'
    | 'test-project-detected'
    | 'multi-target-framework'
    | 'risky-request';
  tags: string[];
}

export interface CSharpDiagnosticsPolicyRow {
  policyId: string;
  source: 'dotnet-build-log' | 'sarif' | 'sarif-variant' | 'default';
  tags: string[];
}

export const CSHARP_RUNTIME_POLICY_MATRIX: readonly CSharpRuntimePolicyRow[] = [
  {
    policyId: 'csharp-runtime-solution-root',
    appliesWhen: 'solution-root',
    tags: ['solution-target', 'dotnet-sln-preferred', 'non-executing'],
  },
  {
    policyId: 'csharp-runtime-csproj-root',
    appliesWhen: 'csproj-root',
    tags: ['csproj-target', 'dotnet-csproj-fallback', 'non-executing'],
  },
  {
    policyId: 'csharp-runtime-test-project-detected',
    appliesWhen: 'test-project-detected',
    tags: ['test-target-route', 'dotnet-test-advisory'],
  },
  {
    policyId: 'csharp-runtime-multi-target-framework',
    appliesWhen: 'multi-target-framework',
    tags: ['multi-tfm-detected', 'publish-advisory', 'format-advisory'],
  },
  {
    policyId: 'csharp-runtime-risky-request',
    appliesWhen: 'risky-request',
    tags: ['risky-planning-only', 'mutating-command-listed'],
  },
] as const;

export const CSHARP_DIAGNOSTICS_POLICY_MATRIX: readonly CSharpDiagnosticsPolicyRow[] = [
  {
    policyId: 'csharp-diagnostics-dotnet-build-log',
    source: 'dotnet-build-log',
    tags: ['parse-location', 'normalize-code-uppercase', 'dedupe-exact-entry', 'trim-message'],
  },
  {
    policyId: 'csharp-diagnostics-sarif',
    source: 'sarif',
    tags: ['parse-sarif', 'normalize-code-uppercase', 'dedupe-exact-entry', 'trim-message'],
  },
  {
    policyId: 'csharp-diagnostics-sarif-variant',
    source: 'sarif-variant',
    tags: ['parse-sarif', 'normalize-code-uppercase', 'dedupe-exact-entry', 'trim-message'],
  },
  {
    policyId: 'csharp-diagnostics-default',
    source: 'default',
    tags: ['parse-fallback', 'normalize-code-uppercase', 'dedupe-exact-entry', 'trim-message'],
  },
] as const;

export interface CSharpRuntimePolicyResult {
  policyIds: string[];
  tags: string[];
}

function hasMultiTargetFramework(projectEvidence: CSharpProjectEvidence): boolean {
  return projectEvidence.csprojProfiles.some((profile) => profile.targetFrameworks.length > 1);
}

function hasTestProject(projectEvidence: CSharpProjectEvidence): boolean {
  return projectEvidence.csprojProfiles.some((profile) => profile.isTestProject);
}

export function resolveCSharpRuntimePolicy(
  projectEvidence: CSharpProjectEvidence,
  includeRisky: boolean
): CSharpRuntimePolicyResult {
  const conditions = new Set<CSharpRuntimePolicyRow['appliesWhen']>();
  if (projectEvidence.solutionProfiles.length > 0) {
    conditions.add('solution-root');
  } else if (projectEvidence.csprojProfiles.length > 0) {
    conditions.add('csproj-root');
  }
  if (hasTestProject(projectEvidence)) {
    conditions.add('test-project-detected');
  }
  if (hasMultiTargetFramework(projectEvidence)) {
    conditions.add('multi-target-framework');
  }
  if (includeRisky) {
    conditions.add('risky-request');
  }

  const matched = CSHARP_RUNTIME_POLICY_MATRIX.filter((row) => conditions.has(row.appliesWhen));
  const tags = Array.from(new Set(matched.flatMap((row) => row.tags))).sort((left, right) =>
    left.localeCompare(right)
  );
  return {
    policyIds: matched.map((row) => row.policyId),
    tags,
  };
}

export interface CSharpDiagnosticsPolicyResult {
  policyId: string;
  source: string;
  tags: string[];
}

export function resolveCSharpDiagnosticsPolicy(source?: string): CSharpDiagnosticsPolicyResult {
  const normalizedSource = (source ?? '').trim().toLowerCase();
  const matched =
    CSHARP_DIAGNOSTICS_POLICY_MATRIX.find((row) => row.source === normalizedSource) ??
    CSHARP_DIAGNOSTICS_POLICY_MATRIX.find((row) => row.source === 'default');

  if (!matched) {
    return {
      policyId: 'csharp-diagnostics-default',
      source: normalizedSource || 'default',
      tags: ['parse-fallback', 'normalize-code-uppercase', 'dedupe-exact-entry', 'trim-message'],
    };
  }

  return {
    policyId: matched.policyId,
    source: normalizedSource || 'default',
    tags: [...matched.tags].sort((left, right) => left.localeCompare(right)),
  };
}

