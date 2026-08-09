---
task_id: ATM-GOV-0332
title: Build reproducible multi-layer evidence dashboards
status: planned
owner: atm-observability
priority: P0
depends_on: [ATM-GOV-0329, ATM-GOV-0331]
causalGraph:
  causalDependencies: [ATM-GOV-0329, ATM-GOV-0331]
  startConditions:
    - Validator profiles and observed evidence contracts are stable.
    - Dashboards are explicitly read-only projections and not completion authorities.
  softRelations: [ATM-GOV-0333, ATM-GOV-0334, ATM-GOV-0335, ATM-GOV-0340]
  changedPublicSeams: [atm.planCloseoutDashboard.v1, atm.fourPlanObjectiveVerdict.v1]
  causalImpactEdges: [validator-dashboard, task-close-dashboard, dogfood-replay-dashboard, objective-denominator]
  parallelFrontierInputs: [validator-receipts, task-ledger, close-receipts, replay-observations, planning-matrix]
  validatorReferences: [validate-test-facade, validate-task-view-dashboard, validate-four-plan-objectives]
  phaseOwner: correction-wave-5
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/task-view.ts
  - packages/core/src/broker/replay/dashboard.ts
  - packages/core/src/evidence/validator-lifecycle.ts
  - scripts/run-validators/implementation.ts
  - scripts/validate-four-plan-objectives.ts
  - schemas/evidence/
deliverables:
  - packages/core/src/evidence/plan-closeout-dashboard.ts
  - packages/cli/src/commands/task-view.ts
  - schemas/evidence/plan-closeout-dashboard.schema.json
  - scripts/validate-four-plan-objectives.ts
  - tests/cli/plan-closeout-dashboard-rebuild.test.ts
  - tests/cli/four-plan-objective-denominator.test.ts
validators:
  - node --strip-types tests/cli/plan-closeout-dashboard-rebuild.test.ts
  - node --strip-types tests/cli/four-plan-objective-denominator.test.ts
  - node --strip-types scripts/validate-four-plan-objectives.ts --mode validate
testContributions:
  - caseId: test_dashboard_raw_rebuild_byte_stable_0332
    semanticKey: dashboard_raw_rebuild_byte_stable
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [validator-dashboard, task-close-dashboard, dogfood-replay-dashboard]
    expectedRedPredicate: hand-authored status stale counters or missing artifacts fail rebuild
    responsibility: task-required
    contractEdge: atm.planCloseoutDashboard.v1
  - caseId: test_four_plan_denominator_exact_0332
    semanticKey: four_plan_denominator_exact
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [objective-denominator]
    expectedRedPredicate: denominator other than 17 23 29 and 17 or missing duplicate rows fails closed
    responsibility: task-required
    contractEdge: atm.fourPlanObjectiveVerdict.v1
requiredTestCaseIds: [test_dashboard_raw_rebuild_byte_stable_0332, test_four_plan_denominator_exact_0332]
phaseTestCaseIds: [test_group_plan4_final_certification]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor, tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: emit-unavailable-dashboard-and-never-reuse-stale-counters
atomizationImpact:
  ownerAtomOrMap: atm.observability-dashboard
  mapUpdates: [atomic_workbench/maps/atm-evidence-map.json]
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0332 Build reproducible multi-layer evidence dashboards

## Intent

建立 validator、task/close、dogfood/replay 三層可靠儀表，以及直接計算 86-row objective denominator 的 fail-closed gate。儀表只投影 raw receipts，不接收人工 pass/fail，也不擁有完成權。

## Acceptance

- [ ] ACC-1: 每層 schema 包含 identity、time/window/watermark、authority digest、denominator、correctness、performance、concurrency、validation、closure、backlog、governance、claims。
- [ ] ACC-2: 相同 sealed raw inputs byte-stable 重建；`artifactPaths` 非空，獨立 validator 重算 digest。
- [ ] ACC-3: unknown/unavailable/conflicting 顯式顯示，不省略、不補零、不沿用 stale counters。
- [ ] ACC-4: `validate:four-plan-objectives` 直接讀 planning-sealed matrix，固定輸出 17/23/29/17、verified/not-complete/unknown 與 sorted-row digest。
- [ ] ACC-5: missing/duplicate/縮分母、手工 overall status、shadow authority、digest mismatch 全部會紅。

## Dispatch and stop rules

先定 schema/interface，再接 adapter；不可讓 dashboard 反向改 ledger 或 certificate。任何 raw source 不可用時輸出 unavailable。報告需附 schema、adapter list、重建命令、byte-stability、negative controls、性能分布、deep-module receipt 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:43.757Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0332-build-reproducible-multi-layer-evidence-dashboards.task.md","contentDigest":"sha256:b5e11f25adea7577fe233e3a95d7e7e6a012a864fc0f08398a29664327ddca7f"} -->
