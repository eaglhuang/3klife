---
doc_id: doc_atm_gov_auto_batch_perf_plan
owner: atm-core
status: active
related_cards_root: docs/ai_atomic_framework/governance-optimization/tasks
upstream_repo: AI-Atomic-Framework
created_at: 2026-07-18T00:00:00+08:00
updated_at: 2026-07-18T00:00:00+08:00
---

# ATM 端到端自動併批與效能證明計畫

狀態更新：2026-07-18
Planning 權威來源：`C:/Users/User/3KLife`
Target 權威來源：`C:/Users/User/AI-Atomic-Framework`
閉卡權威來源：target repo ATM ledger

## 產品模型

正式產品管線為：

```text
Batch 選卡 -> Team Wave 做卡 -> Broker 併寫 -> Checkpoint 閉卡
```

本計畫不建立第四套 batch 系統，而是把既有 Batch Mode、Team Wave、Broker steward queue，以及 taskflow Checkpoint/close 整合成唯一一條端到端治理管線，並產出可證明治理工作是否比串行基線更快的證據。

## 目前事實

- `ATM-GOV-0168` 已完成 lane-aware same-task claim conflict 與 adopt rebind。它是 lane safety 前置修補，不是 unified manifest 實作。
- `ATM-GOV-0169` 已完成 foreign/unstaged WIP claim admission。它是 admission safety 前置修補。
- `ATM-GOV-0170` 已完成 oversized-file extraction claim pathway。它解除後續 claim-admission 實作的自鎖。
- `ATM-GOV-0171` 已完成 runner-sync receipt 與 clean-close pathway。它提供後續 close/build 階段需要的 runner receipt 證據。
- `ATM-GOV-0180` 是 Cursor 擁有的獨立 bug fix，不屬於本產品計畫。
- `ATM-GOV-0172` 已完成，並承接原計畫第一個缺口功能：`atm.waveManifest.v1`。
- `ATM-GOV-0173` 已完成 Batch Wave Selector。
- `ATM-GOV-0174` 已完成 Executor-Neutral Team Wave Runtime。
- `ATM-GOV-0175` 已完成 Durable Broker Scheduler。
- `ATM-GOV-0181` 已完成 abandon residue governed disposition；它是收尾安全修補，不屬於本產品計畫主線功能。

因為 0168-0171 已被前置修補佔用，剩餘計畫從 0172 起算。不要重寫已閉卡的歷史 ID 來讓舊編號看起來整齊；應記錄下方對照表，並以目前 ledger 事實繼續往下推進。

## 編號對照

| 目前任務卡 | 原計畫槽位 | 狀態 | 用途 |
|---|---:|---|---|
| ATM-GOV-0168 | prerequisite | done | Lane-aware same-task claim conflict 與 adopt rebind |
| ATM-GOV-0169 | prerequisite | done | Foreign/unstaged WIP claim admission |
| ATM-GOV-0170 | prerequisite | done | Oversized-file extraction claim pathway |
| ATM-GOV-0171 | prerequisite | done | Runner-sync receipt 與 clean-close pathway |
| ATM-GOV-0172 | 0168 | done | Unified Wave Manifest and Policy |
| ATM-GOV-0173 | 0170 | done | Batch Wave Selector |
| ATM-GOV-0174 | 0171 | done | Executor-Neutral Team Wave Runtime |
| ATM-GOV-0175 | 0172 | done | Durable Broker Scheduler |
| ATM-GOV-0176 | 0173 | done | Shared Delivery Commit Executor |
| ATM-GOV-0177 | 0174/0175 | done | Shared Build/Projection Executor plus Atomic Wave Checkpoint |
| ATM-GOV-0178 | 0176/0177 | done | Parallel Analyzer v2 plus End-to-End Failure Matrix；閉卡提交：AI-Atomic-Framework `6e95382` / `c3fda19` / `21679f0`，3KLife `92fe708` |
| ATM-GOV-0179 | 0178/0179 | planned | Strict Paired A/B Dogfood plus Default-On Circuit Breaker |
| ATM-GOV-0181 | support | done | Abandon residue governed disposition |

## 任務計畫

### ATM-GOV-0172 - 統一 Wave Manifest 與政策

狀態：done。

已在 core broker code 交付 `atm.waveManifest.v1`，包含 lifecycle states、eligibility policy、summary helpers，以及舊版 `atm.teamWaveEnvelope.v1` adapter。這是後續 executor、broker、checkpoint 任務必須共用的契約。

### ATM-GOV-0173 - Batch Wave Selector

狀態：done。

已交付 Batch Wave Selector，讓 Batch Mode 以 `atm.waveManifest.v1` 作為唯一正式 wave contract，並保留 serial fallback。

原始目標：讓 Batch Mode 能把符合條件的 ready cards 選成同一個 wave manifest。

必要行為：

- 新增 `batch current` 或等價證據，揭露 `currentWave`、`deferredReasons` 與 dispatch command。
- 從目前 queue head 加上相容 ready cards 進行選取。
- 第一版上限為 `maxWaveSize = 4`。
- 必須要求同 target repo、dependency ready、相容 surface family，以及已宣告 validators。
- 產出 `atm.waveManifest.v1` records，不新增第二套 batch structure。
- 沒有 eligible batch 時保留 serial fallback。

### ATM-GOV-0174 - Executor-Neutral Team Wave Runtime

狀態：done。

已交付 executor-neutral runtime records 與 Team Wave manifest consumption path，workers 產出 patch/evidence/timing/scope attribution，不負責 commit 或 close。

原始目標：執行 wave 時不把 core protocol 綁死在單一 editor 或 worker 機制。

必要行為：

- Team Wave 可消費 `atm.waveManifest.v1`。
- 先支援 local lanes；editor subagents/team-agents 保留為 executor options。
- Workers 回傳 `atm.patchEnvelope.v1`、validator evidence、timing，以及 scope attribution。
- Coordinator 可偵測 partial worker failure，並標記 `needs-review` 或 `failed-retryable`。
- Workers 不 commit、不 close tasks；coordinator 擁有 shared write 與 close 權責。

### ATM-GOV-0175 - Durable Broker Scheduler

狀態：done。

已交付 durable broker scheduler 與 `broker schedule` CLI，支援 ticket idempotency、state transition、same-wave compatible batch planning、cross-wave serial fallback 與 collection timeout fallback。

原始目標：讓 shared write queues 具備 durable 與 wave-aware 能力。

必要行為：

- 新增 durable broker tickets，以 `waveId`、`surfaceFamily`、task id、payload digest 為 key。
- 覆蓋 commit、runner-sync/build、projection 這些 shared surfaces。
- 追蹤狀態：`queued`、`head`、`batched`、`executing`、`released`、`failed`、`cancelled`。
- 將 ticket ids 回寫到 wave manifest。
- 為 stale ticket heads 加上 TTL、cleanup、reseal 行為。

### ATM-GOV-0176 - Shared Delivery Commit Executor

狀態：done。

已交付 `broker batch execute --surface commit` 與 `atm.sharedWriteReceipt.v1`，可驗證 same-wave compatible tickets、claim/validator evidence、stale HEAD、file slices 與 temporary-index isolation。

原始目標：允許 broker-owned shared delivery commits 處理同 wave 且相容的任務。

必要行為：

- 實作 `broker batch execute --surface commit` 或等價 executor。
- commit 前驗證 claims、sealed base、HEAD、scope、validators 與 stage set。
- 使用 temporary index，避免 shared index 污染。
- 產出 `atm.sharedWriteReceipt.v1`，包含 wave id、task ids、manifest digest、commit sha、file slices 與 payload digest。
- 即使不相關任務正在同一個 branch window 等候，也必須拒絕併入。

### ATM-GOV-0177 - Shared Build/Projection Executor 與 Atomic Wave Checkpoint

完成狀態：done（2026-07-18）

完成內容：`broker batch execute --surface build|projection`、`atm.waveGeneratedWriteReceipt.v1`、`batch checkpoint-readiness` 與 `atm.atomicWaveCheckpointReadiness.v1`，驗證測試為 `tests/cli/shared-build-projection-checkpoint.test.ts`。

目標：合併 generated writes，並在 delivery 後原子化 close wave members。

必要行為：

- 當 inputs 可證明相容時，為一個 wave 執行一次 sealed runner build 與一次 projection regeneration。
- GOV-0156 content-addressed build skip 可用時必須重用。
- 產出 build/projection receipts，並 fan out 到各 task evidence。
- 新增 `batch checkpoint --wave <id>` 作為 close integration point。
- 只有當 delivery/build/projection receipts 滿足每個 member 時，才 close member ledgers。
- planning closeback 必須 compare-and-swap safe；planning closeback 失敗時必須留下 `reconcile-required` evidence。

### ATM-GOV-0178 - Parallel Analyzer v2 與端到端失敗矩陣

完成狀態：已完成。Analyzer v2 已輸出 broker ticket waitedMs、atchRate、generated-write counts、lane intervention count、端到端 failure matrix，並在目前真實 ledger 缺 broker ticket 事件時標記 observability-gap。

目標：證明管線可量測且 failure-safe。

必要行為：

- 分析 manifests、session events、broker tickets、receipts、task events 與 commits。
- 報告 max concurrency、hard-overlap minutes、makespan、active throughput、waitedMs p50/p95、batchRate、builds/projections/commits per wave、false blocks、repair closure rate、lane intervention count，以及 executor cost。
- 新增 fixture repos，涵蓋 happy-path wave、conflict、docs-only runner skip、worker partial failure、HEAD moved、build retry、projection retry、checkpoint retry、lane conflict、kill switch、serial fallback。

### ATM-GOV-0179 - 嚴格 Paired A/B Dogfood 與 Default-On Circuit Breaker

目標：在 default-on rollout 前證明或否定效能主張。

必要行為：

- 執行 paired serial-control 與 auto-batch-treatment waves。
- 使用 AB/BA 順序降低 cache/order bias。
- 依 scope class、validator cost、LOC、build requirement、executor type 配對 task pairs。
- 驗收目標：median makespan 至少改善 25 percent、active throughput 至少改善 25 percent、eligible treatment `batchRate >= 0.70`、`buildsPerWave <= 1`、`projectionsPerWave <= 1`、validators/close audit 100 percent pass、out-of-scope 與 R1 violations 為零。
- 只有資料支持時才 default-on；否則報告 `inconclusive` 或 `regressed`。
- 新增 config/env controls：`batch.autoBatch.enabled`、`batch.autoBatch.maxWaveSize`、`batch.autoBatch.collectionTimeoutMs`、`ATM_AUTO_BATCH=0`、`--auto-batch off`、`ATM_AUTO_BATCH_CIRCUIT_OPEN`。

## 執行規則

- 僅在 main 上工作。這些 GOV 卡不使用 branch development。
- 每張卡完成後，必須讓自己的 target worktree scope 收乾淨，才能移動到下一張。
- 除非人類明確改派，否則不要觸碰 `ATM-GOV-0180` artifacts。
- Code writes 必須受 task claim 加 broker/steward rules 治理。
- Docs/planning updates 屬於 planning authority，不應直接突變 target runtime ledger。
- Runner/build/projection writes 若 task scope 含 code，必須走 runner-sync 與 broker evidence chain。

## 證據標準

每張 implementation card 都必須提供 command-backed evidence。最後的 A/B 卡必須包含 machine-readable analyzer report 與簡潔的人類摘要，說明 ATM governance cards 是變快、變慢，或證據不足。
