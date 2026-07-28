---
task_id: ATM-GOV-0201
title: Runner incremental dogfood and dominant phase optimization
status: done
owner: atm-governance
priority: P1
depends_on:
  - ATM-GOV-0194
  - ATM-GOV-0197
  - ATM-GOV-0205
  - ATM-GOV-0211
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with real runner performance proof.
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - scripts/runner-sync-incremental-build.ts
  - scripts/build-package-dist.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-onefile-release.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/framework-development/**
  - tests/cli/runner-sync-incremental-build-dogfood.test.ts
deliverables:
  - scripts/run-sealed-runner-build.ts
  - scripts/runner-sync-incremental-build.ts
  - scripts/build-package-dist.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-onefile-release.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/framework-development/**
  - tests/cli/runner-sync-incremental-build-dogfood.test.ts
validators:
  - node --strip-types tests/cli/runner-sync-incremental-build.test.ts
  - node --strip-types tests/cli/runner-sync-incremental-build-dogfood.test.ts --mode live-isolated --require-real-cache-miss
  - npm run typecheck
  - npm run validate:runner-build-scope
  - npm run validate:internal-release-sync
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Disable persistent incremental cache, remove only the optimizationId-scoped runtime cache entry, restore the fullRebuild circuit-breaker path, and emit a compact recovery receipt.
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-build-surface-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runner-incremental-benchmark
      pattern: Runner Incremental Benchmark
      source: scripts/runner-sync-incremental-build.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m4-proof-and-ux
surfaceFamily: runner-build
completed_at: "2026-07-20T11:16:57.907Z"
completed_by_agent: "codex-captain-0201"
closedAt: "2026-07-20T11:16:57.907Z"
closedByActor: "codex-captain-0201"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T11-16-57-813Z-close-be08032a416d"
lastTransitionAt: "2026-07-20T11:16:57.907Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "23bbefa0bf18b1ca997f56768e6408ac8c6f8fa9"
---

# ATM-GOV-0201 Runner incremental dogfood and dominant phase optimization

## Intent

用真實 source input 變動證明 ATM-GOV-0194 的 `incrementalBuild` path，而不是把「完全沒變的 cache hit」誤當增量。量出 worktree、TypeScript、root-drop、onefile、artifact sync 的主要成本後，只優化真正 dominant phase。

## Evidence Baseline

- 0194 focused test 已通過，但現場沒有 real runtime `incrementalBuild` record。
- 0194 full rebuild 約 43.127 秒；0195 約 41.377 秒，其中 worktree 8.884、TypeScript 15.368、root-drop 7.477、artifact sync 7.943 秒。
- 對應 backlog：ATM-BUG-2026-07-19-035。

## Producer / Consumer Contract

- Producer：incremental planner、sealed build、package dist、release assembly、artifact sync、0197 runtime receipt store。
- Consumer：0202 speed/cost analyzer 與 runner-sync admission policy。
- Window：開工先讀 0194 implementation evidence 與 0197 sealed storage summary/config digest，將 consumed receipt 與 `dataDrivenDecision` 寫入 0201 history；AB/BA benchmark close 後 seal compact result，並以同卡 readback 驗證。
- Role：M4 runner treatment producer。
- Missing-data semantics：cache hit、unsafe full fallback、incremental attempt/failure 分開計；不存在增量事件不得推論零成本。
- Raw-data policy：每次 phase timing/manifest 留 runtime；Git 只放 baseline/treatment aggregate 與 reproducibility digest。

## Required Work

- dogfood validator 必須在隔離 repository 建立已提交 baseline，再產生真實 package-only source cache miss，直接呼叫 sealed runner entry `scripts/run-sealed-runner-build.ts`；fixture、預注入 `buildDecision`、只測 planner 或無 source 變更的 cache hit 均不得計入證據。
- 真實測試 package-only、script-only、unsafe root-config changes，證明三種 receipt category 互斥且理由正確，並驗證 receipt、artifact digest 與實際輸出一致。
- package-only 僅重建 affected package/依賴閉包，persistent `.tsbuildinfo`/sealed cache 可驗證且可失效。
- root-drop/onefile/artifact sync 採 hash-based copy/reuse，輸出 parity 與 removed/unchanged 摘要。
- package-only incremental 與 full baseline 各至少五次、AB/BA 交錯；分析 median/p95 與各 phase contribution。
- rollback 必須可執行：停用 persistent cache、只清除該 optimizationId 的 `.atm/runtime/runner-sync-build-cache/**` runtime entry、切回 `fullRebuild` circuit breaker，並產生 recovery command/receipt；不得刪除其他 session 或 tracked evidence。

## Data-Driven Stop Rule

若分類無法安全判斷、增量輸出不 reproducible、或規劃/持久 cache 成本抵銷收益，立即回退 full rebuild 並提出 owner 裁決；不可為了報告變快放寬 unknown/root-config fallback。

## Acceptance

- [ ] package-only cache miss 實際產生 `incrementalBuild`，不是 cache hit。
- [ ] live-isolated dogfood 由已提交 baseline 加真實 source 變更觸發 sealed runner，且拒絕 fixture／預注入 decision；receipt 與 artifact digest 可重算。
- [ ] unsafe root/build-config 仍走 `fullRebuild` 並列 decisionReason。
- [ ] AB/BA 各至少五次，輸出 total 與 phase median/p95。
- [ ] incremental/full 產物 digest、typecheck、release sync parity 通過。
- [ ] 至少一個 dominant phase 有改善，否則以有證據的 inconclusive 收口。
- [ ] 0194/0197 history 與 config digests 已被 opening `dataDrivenDecision` 消費；0201 sealed summary 已完成同卡 readback，供 0202 另寫 cross-card consumed receipt。
- [ ] cache invalidation、circuit breaker 與 recovery command 在隔離環境實際通過，compact rollback receipt 可驗證。
- [ ] 至少一筆真 cache-miss runner/build phase timing 經 0205 canonical interface 寫入 0197 runtime boundary並完成 readback；fixture-only adapter sample 不算。

## v2.1 Required Adjustment (Build as Shared Surface)

- runner/build是INV-ATM-008 shared-write surface：build guidance先判cacheHitSkip，再incrementalBuild，最後fullRebuild；artifact/release sync必須消費0211 execute/queue/batch ticket，不能以`ATM_RUNNER_SYNC_QUEUE_HEAD_REQUIRED`裸拒絕結束。
- compatible related tasks可batch共用sealed build window；unrelated tasks不可因省build而共用commit或混淆attribution。
- cache/incremental/full decision與所有phase timing使用0205 canonical interface並遵守0197 runtime boundary；raw stdout/session trace不進Git。
- waiting ticket時不阻止reads/docs/private evidence；release後自動wakeup並重驗sealed source/config/artifact manifest。
- AB/BA除cache-miss incremental/full比較外，另報ticket waitedMs、batch saved builds與queue fallback reason；性能不足可`inconclusive`，不可放鬆reproducibility或unknown→full安全分流。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:08.803Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0201-runner-incremental-dogfood-and-dominant-phase-optimization.task.md","contentDigest":"sha256:dfbaf26b606d918eb274a00f4688ac9404f4fcb80dab760370c3f5d7eea5505f"} -->
