---
task_id: ATM-GOV-0197
title: Runtime telemetry boundary compact receipts and session lifecycle
status: done
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0196
  - ATM-GOV-0205
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with runtime evidence-boundary repair work.
scopePaths:
  - .gitignore
  - packages/core/src/telemetry/**
  - packages/cli/src/commands/telemetry.ts
  - packages/cli/src/commands/lane-session/**
  - packages/cli/src/commands/framework-development/**
  - packages/cli/src/commands/next/**
  - scripts/run-sealed-runner-build.ts
  - tests/cli/runtime-telemetry-boundary.test.ts
deliverables:
  - packages/core/src/telemetry/**
  - packages/cli/src/commands/telemetry.ts
  - packages/cli/src/commands/lane-session/**
  - packages/cli/src/commands/framework-development/**
  - packages/cli/src/commands/next/**
  - scripts/run-sealed-runner-build.ts
  - tests/cli/runtime-telemetry-boundary.test.ts
validators:
  - node --strip-types tests/cli/runtime-telemetry-boundary.test.ts
  - node --strip-types tests/cli/lane-dual-session-e2e.test.ts
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore the previous receipt/session readers, disable the new runtime writer and retention job, preserve compatibility reads for already-written compact receipts, and mark removed local archives source-unavailable.
atomizationImpact:
  ownerAtomOrMap: atm.gate-telemetry
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runtime-observation-boundary
      pattern: Runtime Observation Boundary
      source: packages/core/src/telemetry/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m3-observability-repair
surfaceFamily: telemetry-storage
completed_at: "2026-07-20T10:12:26.456Z"
completed_by_agent: "codex-captain-0197"
closedAt: "2026-07-20T10:12:26.456Z"
closedByActor: "codex-captain-0197"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T10-12-26-456Z-close-686d130bc83a"
lastTransitionAt: "2026-07-20T10:12:26.456Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ba6fddb7f966c07c3391bd834bfda1744b62562c"
---

# ATM-GOV-0197 Runtime telemetry boundary compact receipts and session lifecycle

## Intent

確立「所有原始統計與 log 留硬碟，Git 只收 compact decision evidence」的可執行邊界，同時修正 stale session-event 讓 `next` 誤判需要 L3 broker 的問題。這不是刪除證據，而是把可重算原始資料與可審核摘要分層。

## Evidence Baseline

- target 目前有多筆 tracked runner-sync receipt，仍含 phase timings、incremental plan 與 cache internals 等可由 runtime 重算的細節。
- `.atm/history/session-events/**` 殘留會影響後續 delegation recommendation，即使工作已結束。
- 對應 backlog：ATM-BUG-2026-07-19-022、ATM-BUG-2026-07-19-040。

## Producer / Consumer Contract

- Producer：telemetry emitter、runner-sync/build、lane/session events、seal/retention job。
- Consumer：0201 runner benchmark、0198/0199/0200/0202 analyzer 與 `next` routing。
- Window：開工 `dataDrivenDecision` 消費 0196 observed summary 的 history/config digest 並寫 consumed receipt；本卡 close 封存 storage/lifecycle 摘要並由同卡 readback validator 驗證。
- Role：M3 storage/lifecycle treatment。
- Missing-data semantics：runtime archive 被 rotation 清除時標 `source: unavailable`，compact digest 不得假裝可展開。
- Raw-data policy：raw statistics/log/counter/session trace/detailed receipt 僅在 gitignored runtime/local log root。

## Required Work

- 建立 runtime raw root、rotation/retention、redaction 與 gitignore/validator 防線。
- tracked receipt 僅保存 window/watermark、schema、source availability、aggregates、input/output/config/decision digest、少量 anomaly snapshot 與 runtime locator。
- session event 明確 transition 為 active/closed/expired/consumed；routing 只讀有效窗口，read-only presence 不等於 write conflict。
- 提供 compact receipt rehydrate/recompute contract；不得把 runtime archive搬回 history。
- 本卡 close 前由同卡 validator 讀回 sealed storage/lifecycle summary；0201/0202 的實際跨卡 consumed receipt 改由 consumer 卡負責，不形成 producer 等待未來 consumer 的依賴環。

## Data-Driven Stop Rule

若 compact receipt 無法在不攜帶 raw trace 的情況下支援 close audit/rollback，或 session lifecycle 修正會改變既有 claim/lock 安全語義，停止並提交 owner 裁決；不得單純刪欄位換取 repo 變小。

## Acceptance

- [ ] 新產生的 raw event、counter、timing、session trace 與 detailed receipt 不出現在 tracked diff。
- [ ] compact receipt 可指回本機 runtime source，來源消失時語義明確。
- [ ] stale/closed session fixture 不再觸發 L3 broker，active conflict 仍維持原安全路由。
- [ ] 既有 tracked detailed receipt 有相容讀取或 migration strategy。
- [ ] 開工 `dataDrivenDecision` 已引用 0196 history/config digest 並留下 consumed receipt。
- [ ] 本卡 summary 已 sealed，且同卡 readback validator 可讀回 storage/lifecycle digest；0201/0202 的跨卡 consumed receipt 明確列為各 consumer 卡的 Acceptance。

## v2.1 Required Adjustment (INV-ATM-008)

- 開工除 0196 外必須消費 0205 canonical observation interface；本卡只擁有 runtime storage/session lifecycle adapter，不得另造 timing/correlation base contract。
- isolated proposal、content-anchor resolution、broker decision/ticket、queue/wakeup、compose/revalidation 的 raw trace 全留 gitignored runtime；tracked receipt 只保存 schema/config/input/output digest、aggregate counters、selected decision refs 與 missing-source 語義。
- 與 0199 共用 telemetry family 時，應以新 adapter/module 或明確 symbol ownership 分片；shared code write 交 0211 broker ticket，不能再用「預設序列化整張卡」處理。
- stale/closed session 的修復不得讓 reads、docs、private evidence 或 isolated proposal 因 foreign write lane 排隊。
- 互斥驗收分支：若0211–0213尚未sealed，本foundation close只需0205 adapter contract、runtime boundary self-readback與明確`planned-consumer` inventory；若能力已sealed，可額外讀回真compose-batch、queue/wakeup、semantic-revalidation receipts。真producer migration/readback由0199與各owner card驗收，0197不得等待未來consumer，也不得以填零取代。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:02.658Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0197-runtime-telemetry-boundary-compact-receipts-and-session-lifecycle.task.md","contentDigest":"sha256:de2a6d816eb8231a271f0e175455bce073e1537656f288372f778a923572ae96"} -->
