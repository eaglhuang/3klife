---
task_id: ATM-GOV-0326
title: Reconcile planning target ledger projection and closure authority
status: planned
owner: atm-authority
priority: P0
depends_on: [ATM-GOV-0325]
causalGraph:
  causalDependencies: [ATM-GOV-0325]
  startConditions:
    - Evidence freeze digest is sealed and current HEAD still matches its declared candidate.
    - Planning authority is available at C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization.
  softRelations: [ATM-GOV-0327]
  changedPublicSeams: [atm.crossAuthorityCloseback.v1, atm.authorityReconciliationReceipt.v1]
  causalImpactEdges: [planning-source-authority, target-ledger-projection, closure-packet-authority]
  parallelFrontierInputs: [sealed-objective-matrix, target-task-ledger, planning-source-cards]
  validatorReferences: [validate-task-import, validate-taskflow-close-atomicity, validate-git-head-evidence]
  phaseOwner: correction-wave-1
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - packages/cli/src/commands/tasks/import-task.ts
  - packages/cli/src/commands/tasks/planning-root-authorship.ts
  - packages/cli/src/commands/taskflow/cross-authority-closeback.ts
  - packages/cli/src/commands/taskflow/closeback-orchestration.ts
  - schemas/governance/cross-authority-closeback.schema.json
  - scripts/validate-taskflow-close-atomicity.ts
deliverables:
  - packages/cli/src/commands/taskflow/cross-authority-closeback.ts
  - packages/cli/src/commands/taskflow/closeback-orchestration.ts
  - schemas/governance/cross-authority-closeback.schema.json
  - tests/cli/cross-authority-closeback-authority.test.ts
validators:
  - node --strip-types tests/cli/cross-authority-closeback-authority.test.ts
  - node --strip-types scripts/validate-taskflow-close-atomicity.ts --mode validate
testContributions:
  - caseId: test_cross_authority_single_source_0326
    semanticKey: cross_authority_single_source
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [planning-source-authority, target-ledger-projection, closure-packet-authority]
    expectedRedPredicate: a target shadow matrix or stale planning mirror cannot produce completion
    responsibility: task-required
    contractEdge: atm.crossAuthorityCloseback.v1
requiredTestCaseIds: [test_cross_authority_single_source_0326]
phaseTestCaseIds: [test_group_plan4_final_certification]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract, tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: revert-candidate-while-retaining-red-shadow-authority-fixture
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-cross-authority-closeback
  mapUpdates: [atomic_workbench/maps/atm-cli-command-router-map.json]
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0326 Reconcile planning target ledger projection and closure authority

## Intent

恢復「planning source 是目標矩陣真相、target ledger 是執行狀態、closure packet 是 digest-bound 結果」的單向資料流，移除任何可被 validator 消費的第二 completion authority。

## Acceptance

- [ ] ACC-1: final validator 只能讀 planning-sealed 86-row authority 或其 digest-bound imported projection；716/660-byte shadow artifact 無法宣告完成。
- [ ] ACC-2: 0313、0314、0315、0316、0317、0324 與 affected cards 經 `tasks status`／`taskflow diagnose` 得到合法 correction/reopen/reconcile disposition，禁止直接 reset。
- [ ] ACC-3: source card、target ledger、projection、closure packet 的 task ID、status、delivery SHA、validation digest、close digest 一致；任何 stale/missing/conflicting 維持 not-complete。
- [ ] ACC-4: 產生 `atm.authorityReconciliationReceipt.v1`，列出 canonical/retired authority、digest、reader paths、migration 與 rollback。

## Dispatch and stop rules

先跑 bound red case，再改 production reader；不得先改 planning source 讓測試迎合 candidate。若 reconciliation 需要 reset/rebase/merge/刪檔，停止並取得獨立 ATM route。報告必含 old/new authority reader inventory、negative-control 結果、closeback before/after、unknowns、rollback 與完整 evidence tuple。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:30.818Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0326-reconcile-planning-target-ledger-projection-and-closure-authority.task.md","contentDigest":"sha256:a9c5b5d322006ac3a6b5081acc9944b3afb175a9c0bb79a0bb1849d46a54869e"} -->
