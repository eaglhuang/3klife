---
task_id: ATM-GOV-0226
title: ATM 3.0 divergence census and replay contract
status: planned
owner: atm-governance
priority: P0
milestone: ATM-3.0-A
severity: P0
depends_on:
  - TASK-ERR-0003
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns cross-gate governance census and replay contracts; this is not a new task or error-code family."
scopePaths:
  - "packages/core/src/broker/census/**"
  - "packages/core/src/broker/replay/**"
  - "packages/core/src/schemas/parallel-replay-scenario.ts"
  - "schemas/atm.parallel-replay-scenario.v1.schema.json"
  - "packages/cli/src/commands/broker/census/**"
  - "tests/cli/atm-3-divergence-census.test.ts"
  - "tests/cli/parallel-replay-scenario-contract.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json"
deliverables:
  - "packages/core/src/broker/census/**"
  - "packages/core/src/broker/replay/**"
  - "schemas/atm.parallel-replay-scenario.v1.schema.json"
  - "tests/cli/atm-3-divergence-census.test.ts"
  - "tests/cli/parallel-replay-scenario-contract.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json"
validators:
  - "node --strip-types tests/cli/atm-3-divergence-census.test.ts"
  - "node --strip-types tests/cli/parallel-replay-scenario-contract.test.ts"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_BROKER_STATE_DIVERGENCE"
  - "ATM_EVIDENCE_SEAL_REQUIRED"
createdByCommand: atm plan card create
evidence:
  required: command-backed
  historicalInputs:
    - "Three BCR receipts for three shared paths."
    - "Observed publish order differs from stored release order."
    - "Closed tasks retain stale currentAllowedTaskId projections."
producer:
  - "atm.sharedWriteGateCoverage.v1 census and replay scenario seal."
consumer:
  - "ATM-GOV-0227"
  - "ATM-GOV-0229"
  - "ATM-GOV-0230"
  - "ATM-GOV-0231"
  - "ATM-GOV-0232"
missingData:
  - "Historical waitedMs, overlap window and wakeup counts are unavailable and must receive explicit unavailable receipts."
  - "Backlog rows may describe code already fixed; current behavior must be probed before editing."
dataDrivenStopRule:
  - "Stop if a mutable BCR/queue/runtime file would need direct editing; emit a divergence record instead."
  - "Stop if a replay assertion depends on a fixed task id, actor id or path rather than a resource-graph role."
out_of_scope:
  - "No broker state mutation or legacy migration in this card."
  - "No performance verdict from historical evidence alone."
rollback:
  strategy: revert-commit
  notes: "Revert source/schema changes; retain the immutable evidence digest and never delete runtime history manually."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.census"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
    - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json"
  extractionCandidates:
    - atom: "atm.atom-map-owner-registration"
      pattern: "Metadata-derived ownership registration in an existing shard"
      source: "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json"
      disposition: "inline"
      inlineReason: "This card only registers Plan 3.0 ownership derived from task metadata; restructuring the canonical shard would expand scope without reducing the census implementation complexity."
---

# ATM-GOV-0226 ATM 3.0 divergence census and replay contract

## Intent

把 Plan 2.2 的 `done` 宣告、現場 runtime、Git delivery、backlog 與 sealed evidence 重新對帳，建立 Plan 3.0 唯一的機器可讀問題基線。歷史 0014／0015 只作輸入資料，不得成為控制流程特例。

## Required Work

- 逐一 census canonical ticket、BCR、queue、freeze、direction lock、claim、scope amendment、runner-sync reservation、task terminal state 與 closeback。
- 每個 producer/consumer 記錄 authority、generation/digest、terminal status、recovery command、observed/unavailable 與 evidence reference。
- 將 0014／0015 故障形狀表達成通用 replay scenario schema。
- census closure packet 的 task-owned changed-files、tree、parent、command-run 與 git-head evidence 是否同源；pre-push 才發現的不一致必須保留為 replay assertion。
- 從已匯入卡片的 `scopePaths` 與 `ownerAtomOrMap` 資料預配置本計畫新增路徑的 atom-map ownership；後續平行卡不得各自重寫 shared map shard。
- 對 `ATM-BUG-2026-07-20-214`、`-216`、`ATM-BUG-2026-07-21-217`、`-218` 重跑 probe；已修項以證據關閉，未修項維持 Open 並映射到唯一 owner card。

## Acceptance

- [ ] Coverage matrix 對所有 shared-write producer/consumer 有唯一 authority 判定，沒有 unknown owner。
- [ ] 三張歷史 BCR、兩張 task terminal state 與實際 delivery order 被封成 compact digest。
- [ ] 0014 closure packet 的 changed-files/tree/parent/command-run mismatch 有獨立 compact digest、重現命令與唯一 owner card。
- [ ] 不可取得的歷史 timing 欄位有 explicit unavailable receipt，不得填 0 或推測值。
- [ ] replay schema 不含固定 task/actor/path/date 分支。
- [ ] 0227–0234 的新增路徑在平行施工前已有 atom-map owner；預配置由 task metadata 推導，不維護人工 incident 清單。
- [ ] 每個 Open backlog row 有可重現 probe、owner card 與 recovery；已修 row 只在 probe 通過後關閉。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:23.150Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0226-atm-3-0-divergence-census-and-replay-contract.task.md","contentDigest":"sha256:e1effb8723a064a5187248185d7aaf4da93c3f561a3a477ec511f1c7b35964f2"} -->
