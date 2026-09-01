---
task_id: ATM-GOV-0388
title: Unify task-close validation contract consumers
status: done
owner: atm-evidence
priority: P0
depends_on: []
causalGraph:
  startConditions: [A task has fresh command-backed evidence for every validator declared by its card.]
  softRelations: [ATM-GOV-0386, ATM-GOV-0387]
  changedPublicSeams: [atm.taskCloseValidationContract.v1]
  causalImpactEdges: [task-close-contract-consumer-parity]
  parallelFrontierInputs: [task-validator-contract]
  validatorReferences: [closure-required-gates-contract]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/evidence/missing-report.ts
  - packages/cli/src/commands/tasks/close-orchestrator/closure-packet.ts
  - packages/cli/src/commands/tasks/close-orchestrator.ts
  - tests/cli/closure-required-gates-contract.test.ts
deliverables:
  - packages/cli/src/commands/evidence/missing-report.ts
  - packages/cli/src/commands/tasks/close-orchestrator/closure-packet.ts
  - tests/cli/closure-required-gates-contract.test.ts
validators:
  - node --strip-types tests/cli/closure-required-gates-contract.test.ts
  - node --strip-types packages/cli/src/commands/evidence/__tests__/missing.spec.ts
  - node --strip-types packages/cli/src/commands/framework-development/__tests__/closure-packet-schema.spec.ts
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0388_task_close_contract_consumer_parity
    targetGroupId: test_group_taskflow_close_contract
    semanticKey: declared_task_validators_are_the_only_ordinary_task_close_requirement
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [task-close-contract-consumer-parity]
    expectedRedPredicate: an unrelated framework-wide validator blocks or is embedded in an ordinary task closure packet
    contributionResourceKey: task-close-validation-contract
    responsibility: task-required
    contractEdge: atm.taskCloseValidationContract.v1
    resourceKey: task-close-validation-contract
requiredTestCaseIds: [test_atm_gov_0388_task_close_contract_consumer_parity]
tddMode: recommended
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-delivery-commit
  notes: Restore the prior shared consumer only by reverting the delivery commit; do not reintroduce a second validator selection rule.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
outOfScope: [Weakening release or phase validation policy, treating missing task validators as a pass, closing a task without its declared evidence]
nonGoals: [Changing validator execution semantics, adding task-specific allowlists]
completed_at: "2026-08-14T11:59:11.595Z"
completed_by_agent: "codex-captain-recovery"
closedAt: "2026-08-14T11:59:11.595Z"
closedByActor: "codex-captain-recovery"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-14T11-59-11-595Z-close-5cac860f78b3"
lastTransitionAt: "2026-08-14T11:59:11.595Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "82f17c1adca80cccf6ee0ccb3b9cfa9d89ff73bb"
---

# ATM-GOV-0388 Unify task-close validation contract consumers

## Problem

Ordinary task pre-close and closure-packet generation derive their required
validators from a framework-wide gate list rather than the task card. This
makes a task with fresh declared evidence fail on unrelated suites, and creates
consumer drift between the task's explicit acceptance contract and closeout.

## Acceptance

- [ ] ACC-1: Ordinary task pre-close blocks exactly missing or stale validators
  declared by that task card, while empty/malformed task contracts remain
  fail-closed.
- [ ] ACC-2: The ordinary closure packet carries the same canonical validator
  identities as the task card; historical-batch and phase/release policies
  retain their own explicit contracts.
- [ ] ACC-3: The regression test fails if either consumer again substitutes
  framework-wide required gates for the task contract.
