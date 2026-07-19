---
task_id: ATM-GOV-0191
title: Runner-sync cache-miss 增量 Build Executor
status: planned
owner: atm-release
priority: P0
depends_on:
  - ATM-GOV-0187
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: runner-sync build/projection executor 的 cache-miss 增量加速屬於治理效能與 shared build surface 工作，沿用 ATM-GOV governance-optimization 家族；不使用 CID，因本卡不是 CID/衝突單號治理，而是 runner builder 能力。
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - scripts/build-package-dist.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-onefile-release.ts
  - tests/cli/runner-sync-incremental-build.test.ts
  - tests/cli/runner-build-scope.test.ts
deliverables:
  - cache-miss 時的 diff-aware incremental runner-sync build planner
  - package-level incremental dist builder，不再無條件刪除所有 package dist
  - root-drop hash-based copy-if-changed assembly
  - onefile payload input-manifest hash 與可重用 payload assembly
  - runner-sync receipt decision taxonomy：cacheHitSkip / incrementalBuild / fullRebuild
validators:
  - node --strip-types tests/cli/runner-sync-incremental-build.test.ts
  - npm run typecheck
  - npm run validate:runner-build-scope
  - npm run validate:internal-release-sync
evidence:
  required: command-backed
rollback:
  strategy: disable incremental planner and fall back to full sealed rebuild
errorCodes:
  - code: ATM_RUNNER_SYNC_QUEUE_HEAD_REQUIRED
    disposition: reuse
    trigger: runner-sync build 仍缺 broker queue-head admission
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-build-executor
  mapUpdates: []
  extractionCandidates:
    - atom: atm.runner-incremental-build-planner
      pattern: Diff-aware Build Planner
      source: scripts/run-sealed-runner-build.ts
      disposition: extract
      inlineReason: null
    - atom: atm.package-dist-incremental-builder
      pattern: Package-level Builder
      source: scripts/build-package-dist.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: runner-sync
---

# ATM-GOV-0191 - Runner-sync cache-miss 增量 Build Executor

## 問題描述

現有 runner-sync build 只有「同一 input hash 完全 skip」與「cache miss 全量 rebuild」兩種路徑。當 source input 有小幅變動時，`npm run build` 仍會建立全新 sealed worktree、跑完整 `tsc -p tsconfig.build.json`、重建所有 package dist、重拷 root-drop、重包 onefile payload。這不能證明真正的 incremental build，也會讓 TypeScript build、worktree setup、release assembly 在每次 cache miss 都維持 40 秒級成本。

本卡把 cache miss 拆成可觀測、可回退的增量 build treatment：只針對 diff 影響的 package / scripts / templates / schemas 做必要更新，並以 receipt 明確區分 `cacheHitSkip`、`incrementalBuild`、`fullRebuild`。

## INPUT_CONTRACT

- 前一個 sealed source SHA、目前 HEAD、runner-sync broker queue-head admission。
- `git diff --name-only <last-sealed-source>..HEAD` 的 changed paths。
- package ownership map、build input manifest、package-lock/toolchain digest。
- 0185 validator telemetry 與 0193 sealed duration report，用於比較 incremental treatment 是否真的改善。

## OUTPUT_CONTRACT

- `atm.runnerIncrementalBuildPlan.v1`：affected package、changed inputs、unsafe/full-rebuild reasons、expected phases。
- package-level dist incremental build output；未受影響 package 不應被刪除或重寫。
- root-drop hash-based copy-if-changed report。
- onefile payload input manifest/hash 與 reuse/new-pack decision。
- runner-sync receipt 增加 decision taxonomy 與 phase timings：`cacheHitSkip`、`incrementalBuild`、`fullRebuild`，不可再把有變動增量與無變動 cache hit 混為同一類。

## Telemetry Contract

- Produces：changedPathCount、affectedPackageCount、incrementalEligible、unsafeReason、phaseSkipped、fileCopied/unchanged、distRebuiltPackageCount、payloadReuse、worktreeSetupMs、typescriptBuildMs、rootDropAssemblyMs、onefileAssemblyMs、artifactSyncMs、totalElapsedMs。
- Consumes：0185 validator/cache telemetry、0193 sealed duration/check report、0187 runner-sync executor receipts。
- 若 diff planner 資料不足、package ownership 不可判定、或 release payload manifest 不可驗證，必須走 `fullRebuild` 並標 `observability-missing` / `unsafe-incremental-key`，不得聲稱 incremental。

## 必要行為

1. 在 `scripts/run-sealed-runner-build.ts` cache miss 後新增 incremental planner：
   - 使用 `git diff --name-only <last-sealed-source>..HEAD` 判斷 changed inputs。
   - 將 changes 分成 packages、scripts、templates、schemas、root config、unknown。
   - root config、package-lock、tsconfig、build scripts 或 unknown changes 觸發 `fullRebuild`。
   - 可安全映射到單一或多個 package 時，進 `incrementalBuild`。
2. TypeScript build 支援 persistent incremental cache：
   - 使用 `.tsbuildinfo` 或 sealed build cache root，不能依賴一次性 worktree 內的短命狀態。
   - receipt 必須記錄 tsbuildinfo/cache digest 與 hit/miss。
3. `scripts/build-package-dist.ts` 改成 package-level incremental：
   - 支援由 planner 傳入 affected packages。
   - 不再對所有 package 無條件 `rmSync(distRoot)`。
   - 只重建 affected package；未受影響 package 維持既有 dist，或從上次 sealed artifact cache 恢復。
4. `scripts/build-root-drop-release.ts` 改成 hash-based copy-if-changed：
   - 不再無條件刪除整個 `release/atm-root-drop`。
   - 寫入 copy report：copied / unchanged / removed。
5. `scripts/build-onefile-release.ts` 改成 input manifest hash + payload reuse：
   - 若 payload file manifest 未變，reuse payload。
   - 若只有部分 payload 檔變更，重用未變檔案的 encoded entry，避免整包重讀/重 gzip 的不可觀測成本。
6. runner-sync receipt taxonomy：
   - `cacheHitSkip`：無 input 變動，跳過 build。
   - `incrementalBuild`：有 input 變動，但 diff-aware treatment 安全生效。
   - `fullRebuild`：有 input 變動且因安全/未知理由全量重建。
   - 每種 decision 都要有 `decisionReason` 與 phase timings，不可只用 `cache-miss-build`。

## 以戰養戰決策點

- 開工前：讀取 0187 runner-sync receipt 與 0193 sealed duration，建立 cache-miss full rebuild baseline。
- 實作中：若任何 diff classifier 無法保證 release parity，停止並把該分類標 fullRebuild；不得為了速度放鬆 reproducibility。
- 收口前：至少用一個 package-only change 與一個 unsafe root-config change 驗證：前者走 incrementalBuild 且總耗時低於 full baseline；後者走 fullRebuild 並明確列出 unsafe reason。
- 若 incremental treatment 讓 release manifest、onefile payload 或 root-drop parity 失真，立即回退 fullRebuild，並把失真案例寫入 backlog。

## VALIDATION_CMD

```shell
node --strip-types tests/cli/runner-sync-incremental-build.test.ts
npm run typecheck
npm run validate:runner-build-scope
npm run validate:internal-release-sync
```

## ROLLBACK_HINT

保留 planner 但設定 default disabled，或移除 incremental branch 回到 full sealed rebuild；receipt taxonomy 可保留作為 fullRebuild evidence。
