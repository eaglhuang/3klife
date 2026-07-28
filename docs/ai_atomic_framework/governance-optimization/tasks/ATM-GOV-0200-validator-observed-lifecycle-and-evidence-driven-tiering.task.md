---
task_id: ATM-GOV-0200
title: Validator observed lifecycle and evidence driven tiering
status: done
owner: atm-governance
priority: P1
depends_on:
  - ATM-GOV-0196
  - ATM-GOV-0205
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with validator lifecycle governance.
scopePaths:
  - packages/core/src/evidence/**
  - packages/cli/src/commands/evidence/**
  - scripts/run-validators/**
  - scripts/run-validators.ts
  - scripts/validators.config.json
  - tests/cli/validator-observed-lifecycle.test.ts
deliverables:
  - packages/core/src/evidence/**
  - packages/cli/src/commands/evidence/**
  - scripts/run-validators/**
  - scripts/run-validators.ts
  - scripts/validators.config.json
  - tests/cli/validator-observed-lifecycle.test.ts
validators:
  - node --strip-types tests/cli/validator-observed-lifecycle.test.ts
  - node --strip-types tests/cli/validator-dag-shared-cache.test.ts
  - node --strip-types tests/cli/validator-run-resume-and-status.test.ts
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore the prior validator ordering/tier configuration, invalidate treatment cache entries, disable the optimizationId, and retain the compact rollback receipt plus runtime traces for audit.
atomizationImpact:
  ownerAtomOrMap: atm.validator-dag-cache
  mapUpdates: []
  extractionCandidates:
    - atom: atm.validator-lifecycle-observation
      pattern: Validator Lifecycle Observation
      source: packages/core/src/evidence/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m3-observability-repair
surfaceFamily: validator-runtime
completed_at: "2026-07-20T11:01:10.687Z"
completed_by_agent: "codex-captain-0200"
closedAt: "2026-07-20T11:01:10.687Z"
closedByActor: "codex-captain-0200"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T11-01-10-576Z-close-4fb51def0cfc"
lastTransitionAt: "2026-07-20T11:01:10.687Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "708b984f6a5dcce48d4e61f6417960a93b6d239b"
---

# ATM-GOV-0200 Validator observed lifecycle and evidence driven tiering

## Intent

讓每一個 validator/check 都有使用與效果計數，才能判斷哪些應留在 fast/default/full、哪些只是 archive-candidate。啟動少不等於無效；安全關鍵與低頻 validator 必須經歷史 replay 與 owner 裁決。

## Evidence Baseline

- 0195 coverage 明列 validator queue/execution/cache/fan-out 為 not-yet-covered。
- 目前愈加愈多 validation，但缺 eligible、duration、unique block、readback 與 escaped incident，無法證明預設層是否值得成本。
- 對應 backlog：ATM-BUG-2026-07-19-010。

## Producer / Consumer Contract

- Producer：validator registry、queue/executor/cache/fan-out、block/classification/readback。
- Consumer：0202 cost/safety analyzer、doctor/default/full profile 與後續 gate optimization。
- Window：開工 `dataDrivenDecision` 消費 0196 validator coverage 的 history/config digest並寫 consumed receipt；本卡至少完成一個 baseline→reversible treatment window，close 時 seal summary並由同卡 readback validator 驗證。
- Role：M3 validator treatment producer。
- Missing-data semantics：未達 eligible opportunity 或觀察週期時標 `insufficient-observation`，不列為零使用。
- Raw-data policy：per-run timing/cache trace 留 runtime；tracked 只存 tier proposal、aggregate digest、optimization/rollback receipt。

## Required Work

- 穩定 identity/version 下量 eligible、invoke、skip、cache hit/miss、fan-out、duration、failure、block、unique block、readback、escaped incident。
- 依 workload strata 產生 fast/default/full/archive-candidate 建議；mode-specific/dynamic findings 也有可比 identity。
- 先做一項 ordering/cache/tier 可回復實驗，保留 config digest、optimizationId、啟用時間與 rollback。
- frequency-aware：eligible>=500 或完整四週合理機會；低頻/安全關鍵另需 replay+owner，禁止自動刪除。
- close evidence 保存本卡 sealed lifecycle/tier summary、同卡 readback receipt 與供 0202 消費的 history/config digest；0202 的跨卡 consumed receipt 由 0202 負責。

## Data-Driven Stop Rule

若 0196 仍無 observed validator opportunity、stable identity 無法跨 runner version 對齊、或 tier 變更會降低安全 gate 覆蓋，停止並維持原配置；不得以「跑得慢」單一訊號降頻。

## Acceptance

- [ ] 每個執行/skip/cache/fan-out 路徑都有 observed lifecycle event。
- [ ] default/full 前後 outcome parity，安全違規為零。
- [ ] 至少一個 canonical duplicate evaluator parity case 與一個 shared cache/fan-out case。
- [ ] tier proposal 使用真 runtime window，資料不足項明示 insufficient-observation。
- [ ] rollback 可恢復原 ordering/tier 並留下 compact receipt。
- [ ] 開工 `dataDrivenDecision` 已引用 0196 history/config digest並留下 consumed receipt；本卡 sealed summary 可由同卡 validator 讀回並供 0202 後續消費。
- [ ] rollback 會失效 treatment cache、恢復原 config digest／ordering／tier，且 parity validator 通過。

## v2.1 Required Adjustment

- validator lifecycle event必須使用0205 canonical observation interface；本卡不得另建validator timing schema或writer。
- 將content-anchor resolver、structured-overlap、ticket transition、composer serial oracle/permutation、semantic revalidation與shared-delivery saga validators納入observed lifecycle inventory；尚未實作的producer標`planned-consumer`。
- compose publish的safety gate至少區分text applicability、serializability、semantic revalidation與downstream invariant，不得把單一typecheck當成全部正確性。
- validator cache key包含sealed base、composition group/member digests、semantic config與validator version；不同proposal tree不可誤用cache。
- tiering仍由observed counter與歷史事故決定；低頻但阻止silent overwrite/lost update/duplicate publish的validator不可因invocation少而降階。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:07.299Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0200-validator-observed-lifecycle-and-evidence-driven-tiering.task.md","contentDigest":"sha256:17df20ff2bdee6fb88641a215c8900330618478871b3fd2cc7105ed2f0dd4fee"} -->
