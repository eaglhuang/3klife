---
task_id: ATM-GOV-0270
title: Evidence freshness engine for incremental close validation
status: planned
owner: unassigned
priority: P0
depends_on:
  - ATM-GOV-0269
causalGraph:
  causalDependencies:
    - ATM-GOV-0269
  startConditions:
    - Validation plan receipts expose child validator command identity and content fingerprints.
  softRelations:
    - ATM-BUG-2026-07-30-275
    - ATM-BUG-2026-07-30-279
  changedPublicSeams:
    - atm.evidenceFreshnessVerdict.v1
    - atm.closeValidatorRerunPlan.v1
  causalImpactEdges:
    - close-incremental-freshness
    - heavyweight-validator-avoidance
    - ignored-artifact-deliverable-freshness
  parallelFrontierInputs:
    - Plan 3.1 close evidence avalanche and measured validator timings
  validatorReferences:
    - node --strip-types packages/cli/src/commands/evidence/__tests__/validators.spec.ts
    - node --strip-types packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
    - npm run typecheck
  phaseOwner: evidence-freshness
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/evidence/verbs/validators.ts
  - packages/cli/src/commands/evidence/missing-report.ts
  - packages/cli/src/commands/evidence/validator-classification.ts
  - packages/cli/src/commands/evidence/evidence-store.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/auto-evidence-mapper.ts
  - packages/cli/src/commands/evidence/__tests__/validators.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
deliverables:
  - packages/cli/src/commands/evidence/verbs/validators.ts
  - packages/cli/src/commands/evidence/missing-report.ts
  - packages/cli/src/commands/evidence/validator-classification.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/auto-evidence-mapper.ts
  - packages/cli/src/commands/evidence/__tests__/validators.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
validators:
  - node --strip-types packages/cli/src/commands/evidence/__tests__/validators.spec.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/close-gates-focused.spec.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert freshness verdict and taskflow consumers together; stale evidence must remain fail-closed on rollback.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-freshness
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.evidence-freshness-engine
      pattern: Policy Object / Deep Module
      source: packages/cli/src/commands/evidence/missing-report.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0270 Evidence freshness engine for incremental close validation

## Intent

Make close validation incremental. A close should rerun only validators whose
evidence is stale for the current delivery commit, touched content, command
identity, validator tier, or declared impact edge.

## Deep-module contract

Public interface:

```ts
assessEvidenceFreshness({
  taskId,
  deliveryCommit,
  touchedFiles,
  validatorReceipts
})
```

Adapters:

- `evidence validators/missing` adapter for operator diagnostics.
- `taskflow close/pre-close` adapter for close-time rerun planning.

Deletion test: deleting this module would push freshness rules back into
evidence, taskflow, validator classification, and git-head callers.

Dependency classes:

- in-process: task ledger reader, evidence bundle reader, validator classifier.
- local-substitutable: git content hash provider and artifact stat provider.
- remote-owned: planning repo source identity when closeback participates.

## Acceptance

- [ ] Freshness verdict reports `fresh`, `stale`, `partially-stale`, or
      `missing` with path/command/hash reasons.
- [ ] Close path receives an explicit rerun plan instead of a blanket validator
      list.
- [ ] Heavyweight validators are not closure-required unless their causal impact
      edge is touched or the task declares them as release-lane evidence.
- [ ] Ignored declared artifacts can be freshness-checked and included by an
      explicit deliverable policy instead of disappearing from close bundles.
- [ ] The implementation is data-driven and contains no card-specific shortcut.
