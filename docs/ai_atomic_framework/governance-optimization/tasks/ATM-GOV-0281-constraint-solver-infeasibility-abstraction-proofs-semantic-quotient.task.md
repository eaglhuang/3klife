---
task_id: ATM-GOV-0281
title: constraint solver, infeasibility/abstraction proofs, semantic quotient
status: done
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0280
causalGraph:
  causalDependencies:
  - ATM-GOV-0280
  startConditions:
    - All hard dependencies are done/released.
    - Deterministic fixture inputs and a sealed baseline are available.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams:
    - packages/core/src/evidence/constraint-solver.ts
    - packages/core/src/evidence/index.ts
  causalImpactEdges:
    - from=ATM-GOV-0281; relation=solver-proof; to=ATM-GOV-0316
  parallelFrontierInputs:
    - packages/core/src/evidence/index.ts
  validatorReferences:
    - node --strip-types tests/cli/plan4-constraint-solver.test.ts
    - node --strip-types tests/cli/plan4-constraint-solver-negative.test.ts
  phaseOwner: plan4-structural-quality
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/constraint-solver.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/constraint-solver.schema.json
  - tests/catalog/groups/test_group_plan4_constraint-solver.shard.json
  - tests/cli/plan4-constraint-solver.test.ts
  - tests/cli/plan4-constraint-solver-negative.test.ts
deliverables:
  - packages/core/src/evidence/constraint-solver.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/constraint-solver.schema.json
  - tests/catalog/groups/test_group_plan4_constraint-solver.shard.json
  - tests/cli/plan4-constraint-solver.test.ts
  - tests/cli/plan4-constraint-solver-negative.test.ts
validators:
  - node --strip-types tests/cli/plan4-constraint-solver.test.ts
  - node --strip-types tests/cli/plan4-constraint-solver-negative.test.ts
  - npm run typecheck
  - npm run validate:cli
requiredTestCaseIds:
  - test_task_atm_gov_0281_core_6e4b2a91
  - test_task_atm_gov_0281_negative_3c7f8d20
testContributions:
  - caseId: test_task_atm_gov_0281_core_6e4b2a91
    targetGroupId: test_group_plan4_constraint-solver
    semanticKey: plan4_constraint-solver
    coversAcceptance: [ACC-1, ACC-2, ACC-5]
    coversImpactEdges: ["from=ATM-GOV-0281; relation=solver-proof; to=ATM-GOV-0316"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0281_negative_3c7f8d20
    targetGroupId: test_group_plan4_constraint-solver
    semanticKey: plan4_constraint-solver_negative
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["from=ATM-GOV-0281; relation=solver-proof; to=ATM-GOV-0316"]
    responsibility: task-required
evidence:
  required: command-backed
  realness: fresh-sealed-and-replayable
rollback:
  strategy: revert-commit-and-remove-generated-receipts
atomizationImpact:
  ownerAtomOrMap: atom-core-evidence
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.constraint-solver
      pattern: Policy Object
      source: packages/core/src/evidence/constraint-solver.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
completed_at: "2026-08-08T17:53:39.373Z"
completed_by_agent: "codex-captain-2026-08-09"
closedAt: "2026-08-08T17:53:39.373Z"
closedByActor: "codex-captain-2026-08-09"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-08T17-53-39-373Z-close-7d6d64a474c1"
lastTransitionAt: "2026-08-08T17:53:39.373Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "34aa7ffbace8917e61d0fa986f0e4863fe5b17ec"
---

# ATM-GOV-0281 constraint solver, infeasibility/abstraction proofs, semantic quotient

## Intent

Implement the missing Plan 4.0 quality module as a deterministic deep module. Its
output must be replayable, attributable to a canonical input authority, and
consumable by the phase-exit and hostile-dogfood certificates.

## Acceptance

- [ ] ACC-1: the module emits a schema-valid, deterministic result with canonical identity and provenance.
- [ ] ACC-2: all downstream projections derive from one sealed authority; no silent omission or expansion is allowed.
- [ ] ACC-3: unsupported, stale, contradictory, or incomplete inputs fail closed with a repair command.
- [ ] ACC-4: focused tests cover success, replay, negative controls, and evidence invalidation.
- [ ] ACC-5: deep-module review records cohesion, narrow API, and no duplicate authority.
