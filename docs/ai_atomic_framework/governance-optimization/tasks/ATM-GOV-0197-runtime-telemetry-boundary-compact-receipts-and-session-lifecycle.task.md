---
task_id: ATM-GOV-0197
title: Runtime telemetry boundary compact receipts and session lifecycle
status: planned
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0196
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
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

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:02.658Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0197-runtime-telemetry-boundary-compact-receipts-and-session-lifecycle.task.md","contentDigest":"sha256:de2a6d816eb8231a271f0e175455bce073e1537656f288372f778a923572ae96"} -->
