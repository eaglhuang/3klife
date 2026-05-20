import type {
  DryRunPlanReport,
  DryRunPlanRequest,
  DryRunProposalArtifact,
  DryRunReviewGate,
  DryRunRollbackPlan,
} from '../../../plugin-sdk/src/language-adapter';
import { analyzeJsProject } from './js-static-analysis';

function buildDefaultArtifacts(operation: 'atomize' | 'infect'): DryRunProposalArtifact[] {
  return [
    {
      artifactId: `${operation}-candidate-inventory`,
      kind: 'inventory-report',
      path: `artifacts/atm/candidates/js/${operation}-source-inventory.json`,
      required: true,
    },
    {
      artifactId: `${operation}-candidate-plan`,
      kind: 'dry-run-plan-report',
      path: `artifacts/atm/candidates/js/${operation}-dry-run-plan.json`,
      required: true,
    },
    {
      artifactId: `${operation}-review-envelope`,
      kind: 'review-envelope',
      path: `artifacts/atm/candidates/js/${operation}-review-envelope.json`,
      required: true,
    },
  ];
}

function buildDefaultReviewGate(operation: 'atomize' | 'infect'): DryRunReviewGate {
  return {
    gateId: `js-${operation}-dual-review`,
    gateType: 'dual-review',
    required: true,
    reason: 'js/ts dry-run requires human + police dual review',
  };
}

function buildDefaultRollback(
  operation: 'atomize' | 'infect',
  restoreTargets: string[]
): DryRunRollbackPlan {
  return {
    rollbackId: `js-${operation}-rollback-plan`,
    steps: [
      'restore original imports from snapshot',
      'remove injected shims and temporary wrappers',
      'rebuild candidate inventory and compare with baseline',
    ],
    restoreTargets,
    proofHint: `artifacts/atm/candidates/js/${operation}-rollback-proof.json`,
  };
}

function selectEntrypointFromRequest(
  request: DryRunPlanRequest,
  cliEntrypoints: readonly string[]
): string {
  if (request.entrypoint && request.entrypoint.trim().length > 0) {
    return request.entrypoint.trim();
  }
  return cliEntrypoints[0] ?? 'src/index.ts';
}

function selectRewriteCandidate(
  dependencyEdges: readonly { from: string; to: string }[]
): { filePath: string; fromImport: string; toImport: string } {
  const picked = dependencyEdges[0];
  if (!picked) {
    return {
      filePath: 'src/index.ts',
      fromImport: "import { legacyEntry } from './legacy/module'",
      toImport: "import { legacyEntryAtom } from '@atoms/legacy/module'",
    };
  }
  const specifier = picked.to.startsWith('module:') ? picked.to.slice('module:'.length) : picked.to;
  return {
    filePath: picked.from,
    fromImport: `import * as legacy from '${specifier}'`,
    toImport: `import * as legacy from '@atoms/${specifier}'`,
  };
}

export async function planJsAtomizeDryRun(request: DryRunPlanRequest): Promise<DryRunPlanReport> {
  const analysis = await analyzeJsProject({
    repositoryRoot: request.repositoryRoot,
    includeGlobs: request.includeGlobs ?? ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    excludeGlobs: request.excludeGlobs,
  });
  const entrypoint = selectEntrypointFromRequest(request, analysis.surface.cliEntrypoints);
  const rewriteCandidate = selectRewriteCandidate(analysis.inventory.dependencyEdges ?? []);
  const restoreTargets = analysis.inventory.files.map((f) => f.filePath);

  return {
    operation: 'atomize',
    executionMode: 'dry-run',
    steps: [
      { stage: 'inventory', description: `scan js/ts source inventory under ${request.repositoryRoot}` },
      { stage: 'entrypoint', description: `select entrypoint ${entrypoint} for atomize routing`, filePath: entrypoint },
      { stage: 'import-rewrite', description: `prepare import rewrite at ${rewriteCandidate.filePath}`, filePath: rewriteCandidate.filePath, subcontract: 'import-rewrite' },
      { stage: 'shim-plan', description: `prepare host shim for ${entrypoint}`, filePath: entrypoint, subcontract: 'shim' },
      { stage: 'rollback', description: 'materialize rollback plan for atomize dry-run', subcontract: 'rollback' },
      { stage: 'evidence', description: 'emit evidence envelope and review gate requirements', subcontract: 'evidence-gate' },
    ],
    evidence: {
      planKind: 'atomize',
      requiredEvidence: [
        'js-source-inventory',
        'js-import-rewrite-candidate',
        'js-shim-candidate',
        'js-rollback-plan',
      ],
      proposalArtifacts: buildDefaultArtifacts('atomize'),
      reviewGate: buildDefaultReviewGate('atomize'),
      importRewrite: {
        rewriteId: 'js-atomize-import-rewrite',
        filePath: rewriteCandidate.filePath,
        fromImport: rewriteCandidate.fromImport,
        toImport: rewriteCandidate.toImport,
        rationale: 'atomize dry-run requires import-level candidate rewrites before apply task',
      },
      shim: {
        shimId: 'js-atomize-entrypoint-shim',
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

export async function planJsInfectDryRun(request: DryRunPlanRequest): Promise<DryRunPlanReport> {
  const analysis = await analyzeJsProject({
    repositoryRoot: request.repositoryRoot,
    includeGlobs: request.includeGlobs ?? ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    excludeGlobs: request.excludeGlobs,
  });
  const entrypoint = selectEntrypointFromRequest(request, analysis.surface.cliEntrypoints);
  const rewriteCandidate = selectRewriteCandidate(analysis.inventory.dependencyEdges ?? []);
  const restoreTargets = analysis.inventory.files.map((f) => f.filePath);

  return {
    operation: 'infect',
    executionMode: 'dry-run',
    steps: [
      { stage: 'inventory', description: `scan js/ts source inventory under ${request.repositoryRoot}` },
      { stage: 'entrypoint', description: `select entrypoint ${entrypoint} for infect routing`, filePath: entrypoint },
      { stage: 'import-rewrite', description: `prepare infect import rewrite at ${rewriteCandidate.filePath}`, filePath: rewriteCandidate.filePath, subcontract: 'import-rewrite' },
      { stage: 'shim-plan', description: `prepare infect shim for ${entrypoint}`, filePath: entrypoint, subcontract: 'shim' },
      { stage: 'rollback', description: 'materialize rollback plan for infect dry-run', subcontract: 'rollback' },
      { stage: 'evidence', description: 'emit evidence envelope and review gate requirements', subcontract: 'evidence-gate' },
    ],
    evidence: {
      planKind: 'infect',
      requiredEvidence: [
        'js-source-inventory',
        'js-infect-import-rewrite-candidate',
        'js-infect-shim-candidate',
        'js-infect-rollback-plan',
      ],
      proposalArtifacts: buildDefaultArtifacts('infect'),
      reviewGate: buildDefaultReviewGate('infect'),
      importRewrite: {
        rewriteId: 'js-infect-import-rewrite',
        filePath: rewriteCandidate.filePath,
        fromImport: rewriteCandidate.fromImport,
        toImport: rewriteCandidate.toImport.replace('@atoms/', '@infected/atoms/'),
        rationale: 'infect dry-run produces candidate rewrite only; apply stays in separate task',
      },
      shim: {
        shimId: 'js-infect-entrypoint-shim',
        filePath: entrypoint,
        strategy: 'host-shim-proxy',
        preservesEntrypoint: true,
        notes: 'shim wraps runtime command path but does not execute host code',
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
