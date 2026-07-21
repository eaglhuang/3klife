---
task_id: ATM-GOV-0232
title: Task import parser and recovery boundary reconciliation
status: planned
owner: atm-task-import
priority: P1
milestone: ATM-3.0-B1
severity: P1
depends_on:
  - ATM-GOV-0231
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns the product boundary reconciliation because TASK-ERR-0002 is already closed and exact ErrorCodes already exist."
scopePaths:
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "packages/cli/src/commands/tasks/task-import-diagnostics.ts"
  - "tests/cli/task-import-diagnostic-contract.test.ts"
  - "tests/cli/task-import-canonical-id-boundary.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "docs/governance/atm-bug-and-optimization-backlog.items/**"
  - "tests/cli/next-claim-orphaned-in-progress.test.ts"
deliverables:
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "packages/cli/src/commands/tasks/task-import-diagnostics.ts"
  - "tests/cli/task-import-diagnostic-contract.test.ts"
  - "tests/cli/task-import-canonical-id-boundary.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "docs/governance/atm-bug-and-optimization-backlog.items/**"
  - "tests/cli/next-claim-orphaned-in-progress.test.ts"
validators:
  - "node --strip-types tests/cli/task-import-diagnostic-contract.test.ts"
  - "node --strip-types tests/cli/task-import-canonical-id-boundary.test.ts"
  - "node --strip-types tests/cli/next-claim-orphaned-in-progress.test.ts"
  - "npm run validate:cli"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_TASKS_PLAN_EMPTY"
  - "ATM_TASK_IMPORT_REFERENCE_ONLY_ID_FRAGMENT"
createdByCommand: atm plan card create
evidence:
  required: frozen-and-source-command-backed
producer:
  - "Parser diagnostic receipts and backlog reconciliation evidence."
consumer:
  - "ATM-GOV-0233"
missingData:
  - "Current source contains focused tests, so behavior may already be fixed while backlog remains stale."
  - "Skill projection row may already be satisfied and must be proven by integration verify rather than edited again."
dataDrivenStopRule:
  - "If frozen and source probes pass, do not rewrite parser code; close only the stale backlog status with evidence."
  - "If behavior fails, fix fence-state/token attribution generically and do not special-case shell comments."
out_of_scope:
  - "No new ErrorCode family or rename."
  - "No unrelated task-import grammar refactor."
rollback:
  strategy: revert-commit
  notes: "Revert parser changes if needed; backlog disposition must continue to reflect the latest reproducible probe."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks.import-boundary"
  mapUpdates: []
  extractionCandidates: []
---

# ATM-GOV-0232 Task import parser and recovery boundary reconciliation

## Intent

處理「TASK-ERR-0002 已 done、backlog 卻仍 Open」的分歧。先用 frozen runner 與 source runner 重現 fenced-code/diagnostic contract；已修就只做 closeback reconciliation，仍壞才修改 parser。

## Required Work

- 使用多 fence、tilde fence、語言標籤、shell `#`、task-like token 與真 heading 的資料驅動 fixture。
- 確認 fence state 在 heading detection 前完成，diagnostic sourceLine 指向真正 token。
- 驗證 `atm-framework-temp-claim` 已進 compiler minimum set、validator required ids 與 adapters；更新 backlog `-217`。
- 對 backlog `-216/-217` 寫 command evidence 與 terminal disposition。
- 對 `ATM-BUG-2026-07-19-012`／`-014` 重跑 import `in_progress + claim:null` fixture；現行 source probe 已通過時只做 frozen parity 與 closeback，不能再新增第二套 adopt lifecycle。
- 將 planning-mirror reconcile 視為可驗證交易：命令只有在宣告的 planning source 實際更新或已一致時才可成功，禁止只改 target ledger 後回報 mirror 已修復。
- 為 terminal task 提供專責 closeback repair authority；不得要求先取得只允許 open/running task 的 active work claim。

## Acceptance

- [ ] fenced 內容不會重置 task declaration context。
- [ ] 診斷 code、source line、work item id 與 recovery hint 一致。
- [ ] source 與 frozen `node atm.mjs` 對相同 parser/closeback probe 的 canonical behavior projection digest 一致，runner digest 已封存；若 stale，走正式 runner-sync，不以 source-only 綠燈關卡。
- [ ] 已完成 projection 可由 integration verify 證實，沒有重複修改或重複 backlog row。
- [ ] `done + released` 任務可冪等修復 planning mirror，無須重新 claim、偽造 transition 或手改 `.atm`。
- [ ] reconcile 的 success receipt 包含 planning path、before/after digest 與 mutation/no-op 結果；未更新宣告 mirror 時 fail closed。
- [ ] orphan imported task 可由 normal claim preparation 合法 adopt/rebind，source/frozen 結果一致；`-012/-014` 有 terminal item disposition且不需要 emergency reset。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:40.163Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0232-task-import-parser-and-recovery-boundary-reconciliation.task.md","contentDigest":"sha256:485e981bd2099f2ced9fcc723af451af511bee244ca1b7f245c637696ece40aa"} -->
