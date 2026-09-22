---
task_id: TASK-PRF-0124
title: Eliminate false close blocks from validator canonicalization and empty-batch routing
status: done
owner: codex-product-proof
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - TASK-PRF-0123 delivery commit 2bd31cb323e988d323b8d634df0916fb8342ccc3 remains reachable
    - no active claim overlaps the listed source files
  softRelations: []
  changedPublicSeams:
    - evidence-validation-contract
    - prompt-batch-playbook
  causalImpactEdges:
    - false-close-block
    - empty-batch-routing
    - runner-source-delivery-parity
  parallelFrontierInputs:
    - TASK-PRF-0123 real replay receipt
  validatorReferences:
    - tests/cli/evidence-bundle-manifest.test.ts
    - tests/cli/batch-repair-route-no-active-batch.test.ts
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/validation-contract.ts
  - packages/cli/src/commands/evidence/verbs/run.ts
  - packages/cli/src/commands/evidence/bundle-io/implementation.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/next/playbook-projection/channel-playbook.ts
  - packages/cli/src/commands/next/prompt-result-contracts.ts
  - tests/cli/evidence-bundle-manifest.test.ts
  - tests/cli/batch-repair-route-no-active-batch.test.ts
deliverables:
  - packages/core/src/evidence/validation-contract.ts
  - packages/cli/src/commands/evidence/verbs/run.ts
  - packages/cli/src/commands/evidence/bundle-io/implementation.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/next/playbook-projection/channel-playbook.ts
  - packages/cli/src/commands/next/prompt-result-contracts.ts
  - tests/cli/evidence-bundle-manifest.test.ts
  - tests/cli/batch-repair-route-no-active-batch.test.ts
validators:
  - node --strip-types tests/cli/evidence-bundle-manifest.test.ts
  - node --strip-types tests/cli/batch-repair-route-no-active-batch.test.ts
  - npm run typecheck
  - node atm.mjs next --prompt "TASK-PRF-0124 eliminate false close blocks" --json
testContributions:
  - caseId: test_prf0124_validator_command_round_trip_4d9a1c7e
    targetGroupId: null
    semanticKey: validator_command_round_trip
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [false-close-block]
    expectedRedPredicate: a validator containing spaces and repeated arguments is stored and matched as one canonical command
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: evidence-validation-contract
    contractEdge: validator-command-canonicalization
    resourceKey: null
  - caseId: test_prf0124_empty_batch_has_no_repair_command_8e3b6f20
    targetGroupId: null
    semanticKey: empty_batch_no_repair
    coversAcceptance: [ACC-3]
    coversImpactEdges: [empty-batch-routing]
    expectedRedPredicate: a route with no active batch emits batch repair-required or a repair command
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: prompt-batch-playbook
    contractEdge: empty-batch-routing
    resourceKey: null
  - caseId: test_prf0124_frozen_source_delivery_parity_72c4e9a1
    targetGroupId: null
    semanticKey: frozen_source_delivery_parity
    coversAcceptance: [ACC-4]
    coversImpactEdges: [runner-source-delivery-parity]
    expectedRedPredicate: frozen runner accepts a route that source tests prove but the published runner rejects
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: runner-source-delivery-parity
    contractEdge: frozen-runner-parity
    resourceKey: null
requiredTestCaseIds:
  - test_prf0124_validator_command_round_trip_4d9a1c7e
  - test_prf0124_empty_batch_has_no_repair_command_8e3b6f20
  - test_prf0124_frozen_source_delivery_parity_72c4e9a1
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
errorCodes: []
rollback:
  strategy: revert-commit
  notes: Revert the single canonicalization/routing commit and retain failed receipts for diagnosis.
atomizationImpact:
  ownerAtomOrMap: atm.evidence-validation-contract
  mapUpdates: []
  extractionCandidates:
    - disposition: inline
      inlineReason: The affected modules are below the extraction threshold and the fix is one cohesive contract boundary.
      atom: atm.evidence-validation-contract
      pattern: Policy Object
      source: packages/core/src/evidence/validation-contract.ts
createdByCommand: atm plan card create
completed_at: "2026-09-22T16:25:49.303Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-22T16:25:49.303Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T16-25-49-303Z-close-eb21293292b0"
lastTransitionAt: "2026-09-22T16:25:49.303Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a2eba0f6e09c0973d691aba71c2ea7ff947ba196"
---

# TASK-PRF-0124 Eliminate false close blocks from validator canonicalization and empty-batch routing

## Intent

修正兩個會直接浪費人工時間的 false block：

1. evidence run / taskflow pre-close 必須把完整 validator 命令視為一個不可分割的 canonical 字串，不能因空白、參數或重複執行而拆成路徑片段。
2. 沒有 active batch 時，next 不得輸出 batch repair-required 或一個必然失敗的 batch repair command。

本卡不新增治理層、不調整產品成功門檻、不修改既有 CI／npm／benchmark 策略；只修正現有契約的 round-trip 與 frozen runner 交付一致性。

## Acceptance

- [ ] ACC-1：帶空白與多個參數的 validator 命令，在 evidence ledger、bundle manifest、pre-close 比對中保持同一個 canonical command identity。
- [ ] ACC-2：相同命令重跑不產生新的錯誤 validator token，也不把已通過 evidence 判成 stale；不同命令仍必須分開。
- [ ] ACC-3：`batch status` 顯示無 active batch 時，prompt route 不得回傳 `batch-state-repair-required`，也不得建議 `batch repair`。
- [ ] ACC-4：source regression 與 frozen `node atm.mjs` 對同一個無 active batch 情境給出一致結果；若 runner 未同步，驗收必須 FAIL 而不是默認通過。

## Stop rules

若修正需要新增第二份 validator registry、改動跨任務 ledger、放寬 typecheck、或以移除 batch 能力換取綠燈，立即停止並保留反證。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T15:54:36.741Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0124-eliminate-false-close-blocks-from-validator-canonicalization-and-empty-batch-routing.task.md","contentDigest":"sha256:5ebd7fc09ea9f4d59aaf848dfe7a7d6c7ad81d38412779cc2cf08879e59ba778"} -->
