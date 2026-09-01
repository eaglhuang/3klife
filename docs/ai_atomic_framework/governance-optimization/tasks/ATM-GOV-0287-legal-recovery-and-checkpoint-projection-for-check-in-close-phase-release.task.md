---
task_id: ATM-GOV-0287
title: legal recovery and checkpoint projection for check-in/close/phase/release
status: done
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0284
  - ATM-GOV-0271
causalGraph:
  causalDependencies:
  - ATM-GOV-0284
  - ATM-GOV-0271
  startConditions:
    - All hard dependencies are done/released.
    - Deterministic fixture inputs and a sealed baseline are available.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
  changedPublicSeams:
    - packages/core/src/evidence/legal-recovery-checkpoints.ts
    - packages/core/src/evidence/index.ts
  causalImpactEdges:
    - from=ATM-GOV-0287; relation=recovery-projection; to=ATM-GOV-0316
  parallelFrontierInputs:
    - packages/core/src/evidence/index.ts
  validatorReferences:
    - node --strip-types tests/cli/plan4-legal-recovery-checkpoints.test.ts
    - node --strip-types tests/cli/plan4-legal-recovery-checkpoints-negative.test.ts
  phaseOwner: plan4-structural-quality
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/legal-recovery-checkpoints.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/legal-recovery-checkpoints.schema.json
  - tests/catalog/groups/test_group_plan4_legal-recovery-checkpoints.shard.json
  - tests/cli/plan4-legal-recovery-checkpoints.test.ts
  - tests/cli/plan4-legal-recovery-checkpoints-negative.test.ts
deliverables:
  - packages/core/src/evidence/legal-recovery-checkpoints.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/legal-recovery-checkpoints.schema.json
  - tests/catalog/groups/test_group_plan4_legal-recovery-checkpoints.shard.json
  - tests/cli/plan4-legal-recovery-checkpoints.test.ts
  - tests/cli/plan4-legal-recovery-checkpoints-negative.test.ts
validators:
  - node --strip-types tests/cli/plan4-legal-recovery-checkpoints.test.ts
  - node --strip-types tests/cli/plan4-legal-recovery-checkpoints-negative.test.ts
  - npm run typecheck
  - npm run validate:cli
requiredTestCaseIds:
  - test_task_atm_gov_0287_core_6e4b2a91
  - test_task_atm_gov_0287_negative_3c7f8d20
testContributions:
  - caseId: test_task_atm_gov_0287_core_6e4b2a91
    targetGroupId: test_group_plan4_legal-recovery-checkpoints
    semanticKey: plan4_legal-recovery-checkpoints
    coversAcceptance: [ACC-1, ACC-2, ACC-5]
    coversImpactEdges: ["from=ATM-GOV-0287; relation=recovery-projection; to=ATM-GOV-0316"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0287_negative_3c7f8d20
    targetGroupId: test_group_plan4_legal-recovery-checkpoints
    semanticKey: plan4_legal-recovery-checkpoints_negative
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["from=ATM-GOV-0287; relation=recovery-projection; to=ATM-GOV-0316"]
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
    - atom: atm.legal-recovery-checkpoints
      pattern: Policy Object
      source: packages/core/src/evidence/legal-recovery-checkpoints.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
---

# ATM-GOV-0287 legal recovery and checkpoint projection for check-in/close/phase/release

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
