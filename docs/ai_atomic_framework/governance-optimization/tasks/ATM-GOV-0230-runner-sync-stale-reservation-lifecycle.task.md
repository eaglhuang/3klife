---
task_id: ATM-GOV-0230
title: Runner sync stale reservation lifecycle
status: planned
owner: atm-runner-sync
priority: P0
milestone: ATM-3.0-B
severity: P0
depends_on:
  - ATM-GOV-0226
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns runner-sync steward lifecycle and shared release artifact governance."
scopePaths:
  - "packages/core/src/broker/runner-sync/**"
  - "packages/cli/src/commands/broker/runner-sync/**"
  - "tests/cli/runner-sync-stale-reservation-lifecycle.test.ts"
  - "tests/cli/runner-sync-head-movement.test.ts"
deliverables:
  - "packages/core/src/broker/runner-sync/**"
  - "packages/cli/src/commands/broker/runner-sync/**"
  - "tests/cli/runner-sync-stale-reservation-lifecycle.test.ts"
  - "tests/cli/runner-sync-head-movement.test.ts"
validators:
  - "node --strip-types tests/cli/runner-sync-stale-reservation-lifecycle.test.ts"
  - "node --strip-types tests/cli/runner-sync-head-movement.test.ts"
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
---

# ATM-GOV-0230 Runner sync stale reservation lifecycle

## Intent

讓 sealed-source SHA 過期的 reservation 能合法結束或轉移，不必偽造 receipt，也不因同 task 的新 claim 看似 active 而永久卡住 queue head。

## Required Work

- 分離 reservation generation/owner 與 logical task identity；健康檢查必須看 reservation base、lease與 owner heartbeat。
- 提供 cancel、expire、coalesce、revalidate 的明確 state machine 與 CLI receipt。
- HEAD 連續移動時只保留可滿足的最新相容工作，維持 aging/fairness。
- cleanup 訊息、staleReleases 與實際 mutation 必須一致。

## Acceptance

- [ ] 同 task claim 保持 active 時，過期 reservation 仍可合法 cancel/expire。
- [ ] 不可達 SHA 不要求 build receipt；已完成 build 的 release 仍要求真 receipt。
- [ ] position 2 reservation 在 head 處置後被 single-flight 喚醒且不 starvation。
- [ ] 重複 cancel/revalidate/release 無 duplicate side effect。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:34.479Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0230-runner-sync-stale-reservation-lifecycle.task.md","contentDigest":"sha256:b10ae7cfaf95b3c9aed3ff6a4252b39620c059b1a0a05cb58888b7419d9fe67c"} -->
