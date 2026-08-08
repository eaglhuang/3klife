---
task_id: ATM-GOV-0283
title: Task/Lane/Broker/Close/Runner first model adapters
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
    - packages/core/src/evidence/governance-model-adapters.ts
    - packages/core/src/evidence/index.ts
  causalImpactEdges:
    - from=ATM-GOV-0283; relation=model-adapter; to=ATM-GOV-0316
  parallelFrontierInputs:
    - packages/core/src/evidence/index.ts
  validatorReferences:
    - node --strip-types tests/cli/plan4-governance-model-adapters.test.ts
    - node --strip-types tests/cli/plan4-governance-model-adapters-negative.test.ts
  phaseOwner: plan4-structural-quality
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/governance-model-adapters.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/governance-model-adapters.schema.json
  - tests/catalog/groups/test_group_plan4_governance-model-adapters.shard.json
  - tests/cli/plan4-governance-model-adapters.test.ts
  - tests/cli/plan4-governance-model-adapters-negative.test.ts
deliverables:
  - packages/core/src/evidence/governance-model-adapters.ts
  - packages/core/src/evidence/index.ts
  - schemas/evidence/governance-model-adapters.schema.json
  - tests/catalog/groups/test_group_plan4_governance-model-adapters.shard.json
  - tests/cli/plan4-governance-model-adapters.test.ts
  - tests/cli/plan4-governance-model-adapters-negative.test.ts
validators:
  - node --strip-types tests/cli/plan4-governance-model-adapters.test.ts
  - node --strip-types tests/cli/plan4-governance-model-adapters-negative.test.ts
  - npm run typecheck
  - npm run validate:cli
requiredTestCaseIds:
  - test_task_atm_gov_0283_core_6e4b2a91
  - test_task_atm_gov_0283_negative_3c7f8d20
testContributions:
  - caseId: test_task_atm_gov_0283_core_6e4b2a91
    targetGroupId: test_group_plan4_governance-model-adapters
    semanticKey: plan4_governance-model-adapters
    coversAcceptance: [ACC-1, ACC-2, ACC-5]
    coversImpactEdges: ["from=ATM-GOV-0283; relation=model-adapter; to=ATM-GOV-0316"]
    responsibility: task-required
  - caseId: test_task_atm_gov_0283_negative_3c7f8d20
    targetGroupId: test_group_plan4_governance-model-adapters
    semanticKey: plan4_governance-model-adapters_negative
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: ["from=ATM-GOV-0283; relation=model-adapter; to=ATM-GOV-0316"]
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
    - atom: atm.governance-model-adapters
      pattern: Policy Object
      source: packages/core/src/evidence/governance-model-adapters.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
completed_at: "2026-08-08T18:17:19.179Z"
completed_by_agent: "codex-captain-2026-08-09"
closedAt: "2026-08-08T18:17:19.179Z"
closedByActor: "codex-captain-2026-08-09"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-08T18-17-19-179Z-close-508349dd9a9d"
lastTransitionAt: "2026-08-08T18:17:19.179Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b012f0b1784d11f2e50a1eb1f08c087d7f07f13f"
---

# ATM-GOV-0283 Task/Lane/Broker/Close/Runner first model adapters

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
