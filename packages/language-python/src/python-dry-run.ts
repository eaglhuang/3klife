import type {
  DryRunPlanReport,
  DryRunPlanRequest,
  DryRunProposalArtifact,
  DryRunReviewGate,
  DryRunRollbackPlan,
} from '../../../plugin-sdk/src/language-adapter';
import { analyzePythonProject } from './python-static-analysis';

function buildDefaultArtifacts(operation: 'atomize' | 'infect'): DryRunProposalArtifact[] {
  return [
    {
      artifactId: `${operation}-candidate-inventory`,
      kind: 'inventory-report',
      path: `artifacts/atm/candidates/python/${operation}-source-inventory.json`,
      required: true,
    },
    {
      artifactId: `${operation}-candidate-plan`,
      kind: 'dry-run-plan-report',
      path: `artifacts/atm/candidates/python/${operation}-dry-run-plan.json`,
      required: true,
    },
    {
      artifactId: `${operation}-review-envelope`,
      kind: 'review-envelope',
      path: `artifacts/atm/candidates/python/${operation}-review-envelope.json`,
      required: true,
    },
  ];
}

function buildDefaultReviewGate(operation: 'atomize' | 'infect'): DryRunReviewGate {
  return {
    gateId: `python-${operation}-dual-review`,
    gateType: 'dual-review',
    required: true,
    reason: 'python dry-run 需要 human + police 雙重審核',
  };
}

function buildDefaultRollback(
  operation: 'atomize' | 'infect',
  restoreTargets: string[]
): DryRunRollbackPlan {
  return {
    rollbackId: `python-${operation}-rollback-plan`,
    steps: [
      'restore original imports from snapshot',
      'remove injected shims and temporary wrappers',
      'rebuild candidate inventory and compare with baseline',
    ],
    restoreTargets,
    proofHint: `artifacts/atm/candidates/python/${operation}-rollback-proof.json`,
  };
}

function selectEntrypointFromRequest(
  request: DryRunPlanRequest,
  cliEntrypoints: readonly string[]
): string {
  if (request.entrypoint && request.entrypoint.trim().length > 0) {
    return request.entrypoint.trim();
  }
  return cliEntrypoints[0] ?? 'main.py';
}

function selectRewriteCandidate(dependencyEdges: readonly { from: string; to: string }[]): {
  filePath: string;
  fromImport: string;
  toImport: string;
} {
  const picked = dependencyEdges[0];
  if (!picked) {
    return {
      filePath: 'main.py',
      fromImport: 'from legacy.module import legacy_entry',
      toImport: 'from atoms.legacy.module import legacy_entry_atom',
    };
  }
  const toModule = picked.to.startsWith('module:') ? picked.to.slice('module:'.length) : picked.to;
  return {
    filePath: picked.from,
    fromImport: `from ${toModule} import *`,
    toImport: `from atoms.${toModule} import *`,
  };
}

export async function planPythonAtomizeDryRun(
  request: DryRunPlanRequest
): Promise<DryRunPlanReport> {
  const analysis = await analyzePythonProject({
    repositoryRoot: request.repositoryRoot,
    includeGlobs: request.includeGlobs ?? ['**/*.py'],
    excludeGlobs: request.excludeGlobs,
  });
  const entrypoint = selectEntrypointFromRequest(request, analysis.surface.cliEntrypoints);
  const rewriteCandidate = selectRewriteCandidate(analysis.inventory.dependencyEdges ?? []);
  const restoreTargets = analysis.inventory.files.map((file) => file.filePath);

  return {
    operation: 'atomize',
    executionMode: 'dry-run',
    steps: [
      {
        stage: 'inventory',
        description: `scan python source inventory under ${request.repositoryRoot}`,
      },
      {
        stage: 'entrypoint',
        description: `select entrypoint ${entrypoint} for atomize routing`,
        filePath: entrypoint,
      },
      {
        stage: 'import-rewrite',
        description: `prepare import rewrite at ${rewriteCandidate.filePath}`,
        filePath: rewriteCandidate.filePath,
        subcontract: 'import-rewrite',
      },
      {
        stage: 'shim-plan',
        description: `prepare host shim for ${entrypoint}`,
        filePath: entrypoint,
        subcontract: 'shim',
      },
      {
        stage: 'rollback',
        description: 'materialize rollback plan for atomize dry-run',
        subcontract: 'rollback',
      },
      {
        stage: 'evidence',
        description: 'emit evidence envelope and review gate requirements',
        subcontract: 'evidence-gate',
      },
    ],
    evidence: {
      planKind: 'atomize',
      requiredEvidence: [
        'python-source-inventory',
        'python-import-rewrite-candidate',
        'python-shim-candidate',
        'python-rollback-plan',
      ],
      proposalArtifacts: buildDefaultArtifacts('atomize'),
      reviewGate: buildDefaultReviewGate('atomize'),
      importRewrite: {
        rewriteId: 'python-atomize-import-rewrite',
        filePath: rewriteCandidate.filePath,
        fromImport: rewriteCandidate.fromImport,
        toImport: rewriteCandidate.toImport,
        rationale: 'atomize dry-run requires import-level candidate rewrites before apply task',
      },
      shim: {
        shimId: 'python-atomize-entrypoint-shim',
        filePath: entrypoint,
        strategy: 'entrypoint-wrapper',
        preservesEntrypoint: true,
        notes: 'shim is advisory only; runtime patching is out of scope for dry-run',
      },
      rollback: buildDefaultRollback('atomize', restoreTargets),
      mutates: [],
    },
    warnings: [
      'dry-run mode only: no files are modified',
      ...analysis.surface.sideEffectWarnings,
    ],
  };
}

export async function planPythonInfectDryRun(
  request: DryRunPlanRequest
): Promise<DryRunPlanReport> {
  const analysis = await analyzePythonProject({
    repositoryRoot: request.repositoryRoot,
    includeGlobs: request.includeGlobs ?? ['**/*.py'],
    excludeGlobs: request.excludeGlobs,
  });
  const entrypoint = selectEntrypointFromRequest(request, analysis.surface.cliEntrypoints);
  const rewriteCandidate = selectRewriteCandidate(analysis.inventory.dependencyEdges ?? []);
  const restoreTargets = analysis.inventory.files.map((file) => file.filePath);

  return {
    operation: 'infect',
    executionMode: 'dry-run',
    steps: [
      {
        stage: 'inventory',
        description: `scan python source inventory under ${request.repositoryRoot}`,
      },
      {
        stage: 'entrypoint',
        description: `select entrypoint ${entrypoint} for infect routing`,
        filePath: entrypoint,
      },
      {
        stage: 'import-rewrite',
        description: `prepare infect import rewrite at ${rewriteCandidate.filePath}`,
        filePath: rewriteCandidate.filePath,
        subcontract: 'import-rewrite',
      },
      {
        stage: 'shim-plan',
        description: `prepare infect shim for ${entrypoint}`,
        filePath: entrypoint,
        subcontract: 'shim',
      },
      {
        stage: 'rollback',
        description: 'materialize rollback plan for infect dry-run',
        subcontract: 'rollback',
      },
      {
        stage: 'evidence',
        description: 'emit evidence envelope and review gate requirements',
        subcontract: 'evidence-gate',
      },
    ],
    evidence: {
      planKind: 'infect',
      requiredEvidence: [
        'python-source-inventory',
        'python-infect-import-rewrite-candidate',
        'python-infect-shim-candidate',
        'python-infect-rollback-plan',
      ],
      proposalArtifacts: buildDefaultArtifacts('infect'),
      reviewGate: buildDefaultReviewGate('infect'),
      importRewrite: {
        rewriteId: 'python-infect-import-rewrite',
        filePath: rewriteCandidate.filePath,
        fromImport: rewriteCandidate.fromImport,
        toImport: rewriteCandidate.toImport.replace('atoms.', 'infected.atoms.'),
        rationale: 'infect dry-run produces candidate rewrite only; apply stays in separate task',
      },
      shim: {
        shimId: 'python-infect-entrypoint-shim',
        filePath: entrypoint,
        strategy: 'host-shim-proxy',
        preservesEntrypoint: true,
        notes: 'shim wraps runtime command path but does not execute python host code',
      },
      rollback: buildDefaultRollback('infect', restoreTargets),
      mutates: [],
    },
    warnings: [
      'dry-run mode only: no files are modified',
      ...analysis.surface.sideEffectWarnings,
    ],
  };
}

