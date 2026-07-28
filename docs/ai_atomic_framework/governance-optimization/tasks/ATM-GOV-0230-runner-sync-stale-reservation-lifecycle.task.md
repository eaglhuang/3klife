---
task_id: ATM-GOV-0230
title: Runner sync stale reservation lifecycle
status: done
owner: atm-runner-sync
priority: P0
milestone: ATM-3.0-B0.6
severity: P0
depends_on:
  - ATM-GOV-0236
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns runner-sync steward lifecycle and shared release artifact governance."
scopePaths:
  - "packages/core/src/broker/runner-sync/**"
  - "packages/core/src/broker/runner-sync-steward-queue.ts"
  - "packages/cli/src/commands/broker/runner-sync/**"
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
  - "scripts/assert-runner-sync-admission.ts"
  - "scripts/run-sealed-runner-build.ts"
  - "scripts/runner-sync-incremental-build.ts"
  - "tests/cli/runner-sync-stale-reservation-lifecycle.test.ts"
  - "tests/cli/runner-sync-head-movement.test.ts"
  - "tests/cli/runner-sync-terminal-task-parity.test.ts"
  - "tests/cli/runner-sync-build-source-preservation.test.ts"
  - "tests/cli/runner-sync-framework-temp-hotfix.test.ts"
  - "tests/cli/runner-sync-foreign-dirty-owner.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.items/**"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/core/src/broker/runner-sync/**"
  - "packages/core/src/broker/runner-sync-steward-queue.ts"
  - "packages/cli/src/commands/broker/runner-sync/**"
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
  - "scripts/assert-runner-sync-admission.ts"
  - "scripts/run-sealed-runner-build.ts"
  - "scripts/runner-sync-incremental-build.ts"
  - "tests/cli/runner-sync-stale-reservation-lifecycle.test.ts"
  - "tests/cli/runner-sync-head-movement.test.ts"
  - "tests/cli/runner-sync-terminal-task-parity.test.ts"
  - "tests/cli/runner-sync-build-source-preservation.test.ts"
  - "tests/cli/runner-sync-framework-temp-hotfix.test.ts"
  - "tests/cli/runner-sync-foreign-dirty-owner.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.items/**"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types tests/cli/runner-sync-stale-reservation-lifecycle.test.ts"
  - "node --strip-types tests/cli/runner-sync-head-movement.test.ts"
  - "node --strip-types tests/cli/runner-sync-terminal-task-parity.test.ts"
  - "node --strip-types tests/cli/runner-sync-build-source-preservation.test.ts"
  - "node --strip-types tests/cli/runner-sync-framework-temp-hotfix.test.ts"
  - "node --strip-types tests/cli/runner-sync-foreign-dirty-owner.test.ts"
  - "npm run validate:cli"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_RUNNER_SYNC_STALE_SHA"
  - "ATM_RUNNER_SYNC_ORPHAN"
  - "ATM_RUNNER_RECEIPT_MISSING"
createdByCommand: atm plan card create
evidence:
  required: multiprocess-command-backed
producer:
  - "Runner-sync cancel/expire/revalidate receipts and queue health telemetry."
consumer:
  - "ATM-GOV-0233"
missingData:
  - "Reachability policy and TTL must come from repository/config observations, not one incident timestamp."
dataDrivenStopRule:
  - "Stop if cleanup requires releasing a valid task claim or fabricating a build receipt."
  - "Stop if a stale entry can remain queue head solely because taskId matches a newer active claim."
out_of_scope:
  - "No command-rendering normalizer work; ATM-GOV-0231 owns it."
  - "No direct deletion of queue JSON."
rollback:
  strategy: queue-only-and-revert
  notes: "Disable compose publishing, preserve queue entries, and revert lifecycle code; use formal cancel/reconcile for created test entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-sync.steward"
  mapUpdates: []
  extractionCandidates: []
completed_at: "2026-07-21T06:41:18.964Z"
completed_by_agent: "codex-plan3-captain-20260721-01"
closedAt: "2026-07-21T06:41:18.964Z"
closedByActor: "codex-plan3-captain-20260721-01"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-21T06-41-18-866Z-close-46f1cb891bf6"
lastTransitionAt: "2026-07-21T06:41:18.964Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3dd569bf26050040f2ec08e8f21383a84bf5c4f9"
---

# ATM-GOV-0230 Runner sync stale reservation lifecycle

## Intent

讓 sealed-source SHA 過期的 reservation 能合法結束或轉移，不必偽造 receipt，也不因同 task 的新 claim 看似 active 而永久卡住 queue head。

## Required Work

- 分離 reservation generation/owner 與 logical task identity；健康檢查必須看 reservation base、lease與 owner heartbeat。
- 提供 cancel、expire、coalesce、revalidate 的明確 state machine 與 CLI receipt。
- HEAD 連續移動時只保留可滿足的最新相容工作，維持 aging/fairness。
- cleanup 訊息、staleReleases 與實際 mutation 必須一致。
- 將 build mutation 限定為 sealed source 與宣告 release surfaces；foreign dirty non-release files 必須保持 byte-for-byte 不變，無法安全隔離時回 canonical queue/revalidation ticket，不得 snapshot 後遺失。
- source/frozen queue inspection 必須同樣排除 terminal tasks；ghost terminal task 不得成為 queue head。live framework temp claim 可作 steward owner，普通 missing/terminal task 仍拒絕。
- B1 workers 不各自執行 shared runner build；由單一 queue-head steward 對 composed sealed source build/publish，並產生可驗證 release/advance receipt。

## Acceptance

- [ ] 同 task claim 保持 active 時，過期 reservation 仍可合法 cancel/expire。
- [ ] 不可達 SHA 不要求 build receipt；已完成 build 的 release 仍要求真 receipt。
- [ ] position 2 reservation 在 head 處置後被 single-flight 喚醒且不 starvation。
- [ ] 重複 cancel/revalidate/release 無 duplicate side effect。
- [ ] cleanup receipt 的 reported released count、`staleReleases` entries 與實際 state mutations 數量及 ids 完全一致；不允許訊息成功但明細為空。
- [ ] runner build 前後所有 foreign dirty non-release file digest 一致；故障注入與 Windows rename retry 都不造成 silent overwrite 或 WIP loss。
- [ ] source/frozen 對 terminal/open task queue view 一致；terminal ghost queue-head count = 0。
- [ ] live `ATM-FRAMEWORK-TEMP-*` claim 可合法 enqueue/build/release，missing/terminal owner 不可；same-task sequential source 可自動 advance 或輸出 digest-ready command。
- [ ] `ATM-BUG-2026-07-14-183`、`-184`、`ATM-BUG-2026-07-19-011`、`-046`、`ATM-BUG-2026-07-20-209` 各有 current source/frozen disposition 與 canonical item closeback；已修不得重寫，仍壞才由本卡修復。
- [ ] source 與 frozen `node atm.mjs` 對相同 stale-reservation lifecycle probe 的 canonical behavior projection digest 一致，runner digest 已封存。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:34.479Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0230-runner-sync-stale-reservation-lifecycle.task.md","contentDigest":"sha256:b10ae7cfaf95b3c9aed3ff6a4252b39620c059b1a0a05cb58888b7419d9fe67c"} -->
