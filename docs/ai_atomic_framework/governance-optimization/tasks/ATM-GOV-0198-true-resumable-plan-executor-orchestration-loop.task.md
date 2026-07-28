---
task_id: ATM-GOV-0198
title: True resumable plan executor orchestration loop
status: done
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0196
  - ATM-GOV-0188
  - ATM-GOV-0189
  - ATM-GOV-0210
  - ATM-GOV-0211
  - ATM-GOV-0214
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with the missing live orchestration loop.
scopePaths:
  - packages/cli/src/commands/batch/**
  - packages/core/src/batch/**
  - packages/cli/src/atm.ts
  - tests/cli/plan-level-executor-recovery.test.ts
  - tests/cli/plan-level-executor-live-loop.test.ts
deliverables:
  - packages/cli/src/commands/batch/**
  - packages/core/src/batch/**
  - packages/cli/src/atm.ts
  - tests/cli/plan-level-executor-recovery.test.ts
  - tests/cli/plan-level-executor-live-loop.test.ts
validators:
  - node --strip-types tests/cli/plan-level-executor-live-loop.test.ts
  - node --strip-types tests/cli/plan-level-executor-recovery.test.ts
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Open the execute-plan circuit breaker, restore the prior advisory next-command path, preserve the durable journal for diagnosis, and prove no commit/close/push side effect is replayed during rollback.
atomizationImpact:
  ownerAtomOrMap: atm.plan-level-executor
  mapUpdates: []
  extractionCandidates:
    - atom: atm.plan-phase-driver
      pattern: Resumable Phase Driver
      source: packages/cli/src/commands/batch/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m3-observability-repair
surfaceFamily: plan-executor
completed_at: "2026-07-20T10:27:01.716Z"
completed_by_agent: "codex-captain-0198"
closedAt: "2026-07-20T10:27:01.716Z"
closedByActor: "codex-captain-0198"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T10-27-01-622Z-close-9bb05f594d63"
lastTransitionAt: "2026-07-20T10:27:01.716Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4fb612d9f3ac45051ec156e8c2b3881f9b5143a4"
---

# ATM-GOV-0198 True resumable plan executor orchestration loop

## Intent

把 `batch execute-plan` 從「記 journal 並回傳下一條命令」提升成真正執行整個 phase chain 的 resumable driver。正式模型仍是 Batch 選卡、Team Wave 做卡、Broker 併寫、Checkpoint 閉卡；本卡只把既有 executors 串成單一控制迴圈。

## Evidence Baseline

- `packages/cli/src/commands/batch/plan-executor.ts` 現況只 append event、計算 decision、回傳 next claim command，未驅動完整副作用鏈。
- 對應 backlog：ATM-BUG-2026-07-19-002。

## Producer / Consumer Contract

- Producer：plan run journal、phase receipt、worker/validator/generated-write/commit/checkpoint/push/closeback executors。
- Consumer：0202 matched treatment runner 與 crash recovery operator。
- Window：開工 `dataDrivenDecision` 讀取 0196 taskflow observed summary 的 history/config digest 並寫 consumed receipt；每一個真 phase 都產生 runtime event，close 前 seal 本卡 summary並由同卡 readback validator 驗證。
- Role：M3 plan-executor treatment producer。
- Missing-data semantics：phase 無 observed/sealed event 時不能標 done；合法 skip 必須有 stable reason/input digest。
- Raw-data policy：phase trace/timing 留 runtime，history 只存 compact state/side-effect digest。

## Required Work

- 同一 command 持續推進 preflight→select→claim→workers→reconcile→validate→generated writes→commit→checkpoint→push/closeback→analyze。
- 每 phase 有 idempotency key、attempt、input/output digest、side-effect receipt、terminal/skip state；resume 找第一個未完成 phase。
- owner/action-required、approval、unsafe divergence 或 circuit-open 才可停，並只輸出一條 recovery command。
- commit、close、push、planning closeback exactly once；不得因 plan digest amendment 建第二個 run。
- close evidence 必須包含本卡 sealed summary、同卡 readback receipt 與供 0202 消費的 history/config digest；0202 的跨卡 consumed receipt 由 0202 自己負責。

## Data-Driven Stop Rule

若 0196 顯示 phase family 未 observed/sealed、既有 executor 缺 exactly-once receipt，或單命令 loop 會繞過 claim/broker/checkpoint gate，立即暫停並提出拆卡/依賴修訂；不得以 mock executor 宣稱完成 live loop。

## Acceptance

- [ ] isolated target/planning repos 真跑至少一個多卡 wave 至 terminal state。
- [ ] commit 前後、checkpoint 中、target push 後 crash 均能 resume 且不重複副作用。
- [ ] pause/adopt/recovery 僅從 durable journal 恢復，輸出唯一 action。
- [ ] phase journal 可與 0196 task summary、task/lane/batch/wave stamps join。
- [ ] mock-only test 不算 live acceptance evidence。
- [ ] 開工 `dataDrivenDecision` 已引用 0196 history/config digest 並留下 consumed receipt；本卡 close 已 seal 可由同卡 validator 讀回的 summary，供 0202 後續消費。
- [ ] circuit breaker 可退回原 advisory 路徑，且 rollback/recovery 測試證明已完成副作用不會重放。

## v2.1 Required Adjustment (Compose-first Executor)

- phase chain 在 workers 後增加 `proposal-sealed -> broker-ticketed -> composing|queued -> semantic-revalidation -> prepared -> published`；queue/revalidation 是 durable resumable 非終態，不能轉成 `failed` 或要求 operator 手動重跑整個 plan。
- 不同卡可同時進 0210 isolated proposal lane；executor 只在 shared code side effect 消費 0211 execute/queue/batch ticket，reads/docs/private work不等待。
- compose batch 必須消費 0212 composed temp tree/serializability receipt與0213 semantic result；只有0214 shared-delivery saga可更新HEAD、執行generated write、checkpoint/closeback/push。
- queue head release後由ticket wakeup自動resume；resume前重驗base/read-set/config digest，不可用stale proposal直接寫入。
- 驗收另加：至少一個same-file composable wave、一個unsafe overlap queue→wakeup wave與一個read-set stale→revalidate wave在crash/restart後exactly once到terminal；R1同卡第二lane仍hard reject。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:04.113Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0198-true-resumable-plan-executor-orchestration-loop.task.md","contentDigest":"sha256:8dc1750dc5cb71766a975764a529cada19c2c829e884547fda829c35ebdc31ea"} -->
