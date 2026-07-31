---
task_id: ATM-GOV-0285
title: Validator catalog selection bridge and resumable probe scheduler
status: done
owner: unassigned
priority: P0
milestone: ATM-GOV-PLAN4-R1
amendment_epoch: 1
depends_on:
  - ATM-GOV-0284
  - ATM-GOV-0269
causalGraph:
  causalDependencies:
    - ATM-GOV-0284
    - ATM-GOV-0269
  startConditions:
    - ATM-GOV-0284 is done and exposes QualityGauntlet / ClosureAssuranceMachine events.
    - ATM-GOV-0269 is done and validation-plan observability is stable enough to schedule probes.
  softRelations:
    - governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
    - scripts/test-catalog.config.json
    - packages/core/src/evidence/test-case-catalog.ts
  changedPublicSeams:
    - atm.validatorCatalogSelection.v1
    - atm.resumableProbeSchedule.v1
    - atm.validationPlanOrchestrator.v1
  causalImpactEdges:
    - task acceptance/test ids -> catalog query inputs
    - impact cone -> selected validator/test groups
    - probe cursor -> resumable validation execution
    - unavailable probe data -> fail-closed evidence request
  parallelFrontierInputs:
    - Plan 3.2 ATM-GOV-0269 validation plan progress seam
    - Plan 4.0 QualityGauntlet event stream
  validatorReferences:
    - node --strip-types tests/cli/plan4-validator-catalog-selection.test.ts
    - node --strip-types tests/cli/plan4-resumable-probe-scheduler.test.ts
    - npm run typecheck
  phaseOwner: plan4-validator-selection
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v4.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/validator-catalog-selection.ts
  - packages/core/src/evidence/test-case-catalog.ts
  - packages/core/src/evidence/index.ts
  - packages/cli/src/commands/test-catalog.ts
  - scripts/lib/test-catalog.ts
  - scripts/test-catalog.config.json
  - tests/catalog/groups/test_group_plan4_validator_selection.shard.json
  - tests/cli/plan4-validator-catalog-selection.test.ts
  - tests/cli/plan4-resumable-probe-scheduler.test.ts
deliverables:
  - packages/core/src/evidence/validator-catalog-selection.ts
  - packages/core/src/evidence/index.ts
  - tests/catalog/groups/test_group_plan4_validator_selection.shard.json
  - tests/cli/plan4-validator-catalog-selection.test.ts
  - tests/cli/plan4-resumable-probe-scheduler.test.ts
validators:
  - node --strip-types tests/cli/plan4-validator-catalog-selection.test.ts
  - node --strip-types tests/cli/plan4-resumable-probe-scheduler.test.ts
  - npm run typecheck
  - npm run validate:cli
testContributions:
  - caseId: test_atm_gov_0285_catalog_selection_by_impact_cone_b4a67e10
    targetGroupId: test_group_plan4_validator_selection
    semanticKey: plan4_catalog_selection_by_impact_cone
    coversAcceptance:
      - ACC-1
      - ACC-2
      - ACC-4
    coversImpactEdges:
      - task acceptance/test ids -> catalog query inputs
      - impact cone -> selected validator/test groups
    expectedRedPredicate: Selector ignores required test ids or impact cone and returns unrelated or empty validators.
    responsibility: task-required
    contractEdge: plan4-validator-catalog-selection
  - caseId: test_atm_gov_0285_resumable_probe_cursor_91d4c7e2
    targetGroupId: test_group_plan4_validator_selection
    semanticKey: plan4_resumable_probe_cursor
    coversAcceptance:
      - ACC-3
      - ACC-5
    coversImpactEdges:
      - probe cursor -> resumable validation execution
      - unavailable probe data -> fail-closed evidence request
    expectedRedPredicate: A resumed probe duplicates completed work, skips pending work, or passes without unavailable-data evidence.
    responsibility: task-required
    contractEdge: plan4-resumable-probe-scheduler
requiredTestCaseIds:
  - test_atm_gov_0285_catalog_selection_by_impact_cone_b4a67e10
  - test_atm_gov_0285_resumable_probe_cursor_91d4c7e2
tddMode: required
evidence:
  required: command-backed-selector-and-resume-receipts
rollback:
  strategy: revert-commit-and-disable-plan4-validator-selection-adapter
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.validator-catalog-selection
      pattern: Strategy
      source: packages/core/src/evidence/validator-catalog-selection.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-07-31T13:00:30.852Z"
completed_by_agent: "claude-006"
closedAt: "2026-07-31T13:00:30.852Z"
closedByActor: "claude-006"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-31T13-00-30-852Z-close-e6a5659bd03e"
lastTransitionAt: "2026-07-31T13:00:30.852Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c00b9875aed0507856e91b3b8924f20bf638c648"
---

# ATM-GOV-0285 Validator catalog selection bridge and resumable probe scheduler

## Intent

Create the Plan 4.0 bridge from task-card test ids and causal impact data to a
focused validator/test-case selection, with resumable probe scheduling. This is
the "which pipes need pressure tests?" layer: it must select enough evidence to
prove the task boundary without taxing unrelated families.

## Acceptance

- [ ] ACC-1: selection consumes task `requiredTestCaseIds`, validator
      references, public seams, and causal impact edges.
- [ ] ACC-2: unrelated validators/tests are omitted with explicit reason codes.
- [ ] ACC-3: probe schedule is resumable and records completed, pending,
      unavailable, and failed probes.
- [ ] ACC-4: missing catalog mapping fails closed with a repair command.
- [ ] ACC-5: validators cover both fresh execution and resume behavior.

## Non-goals

- Do not create the regression family store; `ATM-GOV-0305` owns it.
- Do not implement semantic fingerprinting; `ATM-GOV-0293` owns it.
- Do not implement causal factor expansion; `ATM-GOV-0294` owns it.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-30T21:14:00.000Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0285-validator-catalog-selection-bridge-and-resumable-probe-scheduler.task.md"} -->
