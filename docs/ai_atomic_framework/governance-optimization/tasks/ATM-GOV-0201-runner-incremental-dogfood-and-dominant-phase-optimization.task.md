---
task_id: ATM-GOV-0201
title: Runner incremental dogfood and dominant phase optimization
status: planned
owner: atm-governance
priority: P1
depends_on:
  - ATM-GOV-0194
  - ATM-GOV-0197
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
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
  - real cache-miss incremental dogfood benchmark
  - dominant-phase optimization with reproducibility proof
  - compact baseline/treatment runner build receipt
  - tests/cli/runner-sync-incremental-build-dogfood.test.ts
validators:
  - node --strip-types tests/cli/runner-sync-incremental-build.test.ts
  - node --strip-types tests/cli/runner-sync-incremental-build-dogfood.test.ts
  - npm run typecheck
  - npm run validate:runner-build-scope
  - npm run validate:internal-release-sync
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
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
- Window：先讀 0194 implementation evidence 與 0197 storage summary；AB/BA benchmark close 後 seal compact result。
- Role：M4 runner treatment producer。
- Missing-data semantics：cache hit、unsafe full fallback、incremental attempt/failure 分開計；不存在增量事件不得推論零成本。
- Raw-data policy：每次 phase timing/manifest 留 runtime；Git 只放 baseline/treatment aggregate 與 reproducibility digest。

## Required Work

- 真實測試 package-only、script-only、unsafe root-config changes，證明三種 receipt category 互斥且理由正確。
- package-only 僅重建 affected package/依賴閉包，persistent `.tsbuildinfo`/sealed cache 可驗證且可失效。
- root-drop/onefile/artifact sync 採 hash-based copy/reuse，輸出 parity 與 removed/unchanged 摘要。
- package-only incremental 與 full baseline 各至少五次、AB/BA 交錯；分析 median/p95 與各 phase contribution。

## Data-Driven Stop Rule

若分類無法安全判斷、增量輸出不 reproducible、或規劃/持久 cache 成本抵銷收益，立即回退 full rebuild 並提出 owner 裁決；不可為了報告變快放寬 unknown/root-config fallback。

## Acceptance

- [ ] package-only cache miss 實際產生 `incrementalBuild`，不是 cache hit。
- [ ] unsafe root/build-config 仍走 `fullRebuild` 並列 decisionReason。
- [ ] AB/BA 各至少五次，輸出 total 與 phase median/p95。
- [ ] incremental/full 產物 digest、typecheck、release sync parity 通過。
- [ ] 至少一個 dominant phase 有改善，否則以有證據的 inconclusive 收口。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:08.803Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0201-runner-incremental-dogfood-and-dominant-phase-optimization.task.md","contentDigest":"sha256:dfbaf26b606d918eb274a00f4688ac9404f4fcb80dab760370c3f5d7eea5505f"} -->
