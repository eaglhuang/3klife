---
task_id: ATM-GOV-0236
title: Plan 3.0 shared governance state readiness gate
status: planned
owner: atm-taskflow
priority: P0
milestone: ATM-3.0-B0.5
severity: P0
depends_on:
  - ATM-GOV-0227
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns the reusable protected-governance-state and exactly-once close contracts required before a multi-card implementation wave."
scopePaths:
  - "packages/cli/src/commands/git-governance/protected-governance-state.ts"
  - "packages/cli/src/commands/git-governance/implementation.ts"
  - "packages/cli/src/commands/taskflow/close-side-effect-reconcile.ts"
  - "packages/cli/src/commands/taskflow/closeback-orchestration.ts"
  - "packages/cli/src/commands/tasks/close-orchestrator/close-write.ts"
  - "tests/cli/protected-ledger-destructive-guard.test.ts"
  - "tests/cli/taskflow-close-post-side-effect-idempotency.test.ts"
  - "tests/cli/plan3-shared-governance-state-readiness.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-19-045.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-19-015.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json"
deliverables:
  - "packages/cli/src/commands/git-governance/protected-governance-state.ts"
  - "packages/cli/src/commands/taskflow/close-side-effect-reconcile.ts"
  - "tests/cli/protected-ledger-destructive-guard.test.ts"
  - "tests/cli/taskflow-close-post-side-effect-idempotency.test.ts"
  - "tests/cli/plan3-shared-governance-state-readiness.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-19-045.json"
  - "docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-19-015.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json"
validators:
  - "node --strip-types tests/cli/protected-ledger-destructive-guard.test.ts"
  - "node --strip-types tests/cli/taskflow-close-post-side-effect-idempotency.test.ts"
  - "node --strip-types tests/cli/plan3-shared-governance-state-readiness.test.ts"
  - "node --strip-types scripts/validate-governance-projections.ts"
  - "npm run validate:cli"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_PROTECTED_GOVERNANCE_STATE_DESTRUCTIVE_WRITE"
  - "ATM_PLANNING_SOURCE_IDENTITY_DRIFT"
createdByCommand: atm plan card create
evidence:
  required: multiprocess-command-backed
producer:
  - "Protected-state rejection receipts and post-side-effect close reconciliation receipts."
consumer:
  - "ATM-GOV-0230"
  - "ATM-GOV-0231"
  - "ATM-GOV-0228"
  - "ATM-GOV-0229"
  - "ATM-GOV-0232"
missingData:
  - "The existing protected-ledger test currently fails because resolveTaskScopedCommitBundle reports ok after a tracked task-event deletion; preserve this red baseline."
  - "The close drift case must distinguish pre-side-effect source drift from drift caused by the same close transaction after all declared side effects completed."
dataDrivenStopRule:
  - "Stop if the guard is implemented as a fixed task id or one incident path instead of a schema/policy-driven protected governance path class."
  - "Stop if post-side-effect recovery can replay a commit, close, push or planning closeback that already completed."
  - "Stop if a normal shared-write conflict returns a terminal refusal instead of a canonical ticket or retryable reconcile state."
out_of_scope:
  - "No runner-sync reservation lifecycle or actor normalization; ATM-GOV-0230 and ATM-GOV-0231 own those surfaces."
  - "No legacy BCR migration or final replay performance claim."
rollback:
  strategy: revert-commit
  notes: "Trip queue-only, preserve failure receipts, and revert both extracted policy atoms together; never restore destructive access to live governance state."
atomizationImpact:
  ownerAtomOrMap: "atm.shared-governance-state-safety"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json"
  extractionCandidates:
    - atom: "atm.protected-governance-state-policy"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/git-governance/implementation.ts"
      disposition: extract
      inlineReason: null
    - atom: "atm.taskflow-close-side-effect-reconcile"
      pattern: "Result Contract Object"
      source: "packages/cli/src/commands/taskflow/closeback-orchestration.ts"
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0236 Plan 3.0 shared governance state readiness gate

## Intent

在任何多卡 implementation wave 前，先保證共用治理狀態不能被 cleanup／Git bundle 路徑刪除，且 close 已完成 side effects 後不會再回報可誘發重試的假失敗。修補必須是 path class、transaction phase 與 receipt 驅動的泛用規則，不得為 ATM-GOV-0196、0185 或單一路徑寫死。

## Required Work

- 將 task ledger、task events、task evidence 與其他 schema 宣告的 governance state 分類為 protected paths；未持有精確 disposition authority 的 destructive delete/restore/clean 必須在 mutation 前阻擋。
- 修正 `resolveTaskScopedCommitBundle`，使 staged deletion、worktree deletion、index deletion與混合狀態都使用同一 protected-state policy；保留正常 ATM lifecycle 對自身 ledger 的合法寫入。
- 為 taskflow close 建立 side-effect journal/result contract。每一步記錄 idempotency key、before/after digest、commit/ref 與 terminal result。
- 若 planning source drift 發生在 side effects 前，維持 fail closed；若相同 close transaction 已完成 live ledger、target commit 與 planning closeback，回傳 completed/reconciled receipt，不得再次執行 side effect。
- 對 backlog `ATM-BUG-2026-07-19-045` 與 `ATM-BUG-2026-07-19-015` 以 source/frozen command evidence closeback。

## Acceptance

- [ ] 現有 `protected-ledger-destructive-guard` 紅色 baseline 轉綠；task、event、evidence 任一 tracked deletion 都在 commit mutation 前被拒絕並列出 path class、owner、operation 與 recovery。
- [ ] 合法 lifecycle command 仍可更新自己任務的 ledger/evidence，不以全拒絕取得假綠燈。
- [ ] 同一 close transaction 在 target commit、planning closeback 或 response 之間注入中止後可重試；每個 side effect 實際執行最多一次。
- [ ] 已完成三項 side effect 後的 `ATM_PLANNING_SOURCE_IDENTITY_DRIFT` 被辨識為 completed/reconciled，不回傳會鼓勵重做的 failure；真正的外來 pre-side-effect drift 仍 fail closed。
- [ ] source 與 frozen `node atm.mjs` 對相同 protected-state/close-reconcile probe 的 canonical behavior projection digest 一致，runner digest 已封存。
- [ ] `-045`、`-015` canonical item shards 以 passing receipt 更新 terminal disposition，projection 由 generator 重建。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T04:31:51.007Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0236-plan-3-0-shared-governance-state-readiness-gate.task.md","contentDigest":"sha256:9ec347e008b6ca5d3672a41a79eb8e3b1061fcba5cf9eb0f9a0b1b29e0b19a53"} -->
