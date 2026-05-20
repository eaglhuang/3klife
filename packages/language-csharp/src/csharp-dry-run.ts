import type {
  DryRunPlanReport,
  DryRunPlanRequest,
  DryRunProposalArtifact,
  DryRunReviewGate,
  DryRunRollbackPlan,
} from '../../../plugin-sdk/src/language-adapter';
import { buildCSharpInventory } from './csharp-inventory';
import { buildCSharpRiskModel } from './csharp-risk-model';

function buildDefaultArtifacts(operation: 'atomize' | 'infect'): DryRunProposalArtifact[] {
  return [
    {
      artifactId: `csharp-${operation}-inventory`,
      kind: 'inventory-report',
      path: `artifacts/atm/candidates/csharp/${operation}-source-inventory.json`,
      required: true,
    },
    {
      artifactId: `csharp-${operation}-plan`,
      kind: 'dry-run-plan-report',
      path: `artifacts/atm/candidates/csharp/${operation}-dry-run-plan.json`,
      required: true,
    },
    {
      artifactId: `csharp-${operation}-risk`,
      kind: 'risk-report',
      path: `artifacts/atm/candidates/csharp/${operation}-risk-report.json`,
      required: true,
    },
  ];
}

function buildReviewGate(operation: 'atomize' | 'infect', hasBlockingRisk: boolean): DryRunReviewGate {
  if (hasBlockingRisk) {
    return {
      gateId: `csharp-${operation}-generated-code-review`,
      gateType: 'dual-review',
      required: true,
      reason: 'generated or auto-generated C# sources require human + police review before apply',
    };
  }
  return {
    gateId: `csharp-${operation}-feasibility-review`,
    gateType: 'human-review',
    required: true,
    reason: 'C# adapter is future feasibility only and remains dry-run',
  };
}

function buildRollback(operation: 'atomize' | 'infect', restoreTargets: string[]): DryRunRollbackPlan {
  return {
    rollbackId: `csharp-${operation}-rollback`,
    steps: [
      'discard dry-run proposal artifacts',
      'confirm host project files were never modified',
      'rerun inventory and risk baseline for deterministic comparison',
    ],
    restoreTargets,
    proofHint: `artifacts/atm/candidates/csharp/${operation}-rollback-proof.json`,
  };
}

function selectEntrypoint(request: DryRunPlanRequest, filePaths: readonly string[]): string {
  if (request.entrypoint && request.entrypoint.trim().length > 0) {
    return request.entrypoint.trim();
  }
  const programFile = filePaths.find((filePath) => /program\.cs$/i.test(filePath));
  return programFile ?? filePaths[0] ?? 'src/Program.cs';
}

function selectRewriteCandidate(
  dependencyEdges: readonly { from: string; to: string }[]
): { filePath: string; fromImport: string; toImport: string } {
  const picked = dependencyEdges[0];
  if (!picked) {
    return {
      filePath: 'src/Program.cs',
      fromImport: 'using Legacy.Adapter;',
      toImport: 'using Atoms.Legacy.Adapter;',
    };
  }
  const target = picked.to.startsWith('module:') ? picked.to.slice('module:'.length) : picked.to;
  return {
    filePath: picked.from,
    fromImport: `using ${target};`,
    toImport: `using Atoms.${target};`,
  };
}

function buildDryRunReport(operation: 'atomize' | 'infect', request: DryRunPlanRequest): DryRunPlanReport {
  const inventoryReport = buildCSharpInventory({
    repositoryRoot: request.repositoryRoot,
    includeGlobs: request.includeGlobs ?? ['**/*.cs'],
    excludeGlobs: request.excludeGlobs,
  });
  const riskReport = buildCSharpRiskModel(inventoryReport.moduleAnalyses);
  const files = inventoryReport.inventory.files.map((entry) => entry.filePath);
  const entrypoint = selectEntrypoint(request, files);
  const rewriteCandidate = selectRewriteCandidate(inventoryReport.inventory.dependencyEdges ?? []);

  return {
    operation,
    executionMode: 'dry-run',
    steps: [
      {
        stage: 'profile',
        description: 'load solution/project profile evidence without running dotnet or msbuild',
      },
      {
        stage: 'inventory',
        description: `scan C# inventory under ${request.repositoryRoot}`,
      },
      {
        stage: 'risk',
        description: 'evaluate partial declarations and generated file risk',
        subcontract: 'evidence-gate',
      },
      {
        stage: 'entrypoint',
        description: `select C# entrypoint ${entrypoint}`,
        filePath: entrypoint,
      },
      {
        stage: 'import-rewrite',
        description: `prepare advisory using rewrite for ${rewriteCandidate.filePath}`,
        filePath: rewriteCandidate.filePath,
        subcontract: 'import-rewrite',
      },
      {
        stage: 'rollback',
        description: 'prepare rollback proof and no-mutation evidence',
        subcontract: 'rollback',
      },
    ],
    evidence: {
      planKind: operation,
      requiredEvidence: [
        'csharp-project-profile',
        'csharp-source-inventory',
        'csharp-risk-model',
        'csharp-dry-run-proposal',
      ],
      proposalArtifacts: buildDefaultArtifacts(operation),
      reviewGate: buildReviewGate(operation, riskReport.hasBlockingRisk),
      importRewrite: {
        rewriteId: `csharp-${operation}-using-rewrite`,
        filePath: rewriteCandidate.filePath,
        fromImport: rewriteCandidate.fromImport,
        toImport: operation === 'infect' ? rewriteCandidate.toImport.replace('Atoms.', 'Infected.Atoms.') : rewriteCandidate.toImport,
        rationale: 'advisory rewrite for dry-run planning only',
      },
      rollback: buildRollback(operation, files),
      mutates: [],
    },
    warnings: [
      'C# dry-run planner does not edit source files',
      'dotnet/msbuild execution is out of scope for this adapter stage',
      ...riskReport.warnings,
    ],
  };
}

export async function planCSharpAtomizeDryRun(request: DryRunPlanRequest): Promise<DryRunPlanReport> {
  return buildDryRunReport('atomize', request);
}

export async function planCSharpInfectDryRun(request: DryRunPlanRequest): Promise<DryRunPlanReport> {
  return buildDryRunReport('infect', request);
}
