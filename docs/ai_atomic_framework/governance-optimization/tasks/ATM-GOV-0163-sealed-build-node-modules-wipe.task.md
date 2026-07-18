---
task_id: ATM-GOV-0163
title: Prevent sealed runner build from wiping host node_modules via junction cleanup
status: planned
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  build/治理基礎設施 bug 屬 governance-optimization 家族（ATM-GOV 現行母目錄），
  沿用下一號 0163。合法判準：docs/ai_atomic_framework/governance-optimization/tasks/ 存在。
related_backlog:
  - ATM-BUG-2026-07-17-002
  - ATM-BUG-2026-07-17-003
  - ATM-BUG-2026-07-17-004
notes: >
  TASK-SYNC 前綴為違規私建系列（3KLife 無母目錄），禁止再沿用。
  TASK-SYNC-0001 已由 ATM-GOV-0155 supersede；本卡修復 sealed-build junction wipe，不是重開 SYNC 工作。
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - tests/cli/sealed-runner-build-junction-cleanup.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  - .atm/history/evidence/ATM-GOV-0163.*
  - .atm/history/task-events/ATM-GOV-0163/**
  - .atm/history/tasks/ATM-GOV-0163.json
  - .atm/history/tasks/TASK-SYNC-0001.json
deliverables:
  - scripts/run-sealed-runner-build.ts
  - tests/cli/sealed-runner-build-junction-cleanup.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - node --strip-types tests/cli/sealed-runner-build-junction-cleanup.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.sealed-runner-build
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.sealed-runner-build.junction-safe-cleanup
      pattern: Adapter
      source: scripts/run-sealed-runner-build.ts
      disposition: inline
      inlineReason: Helper stays under 600 lines in the sealed-build script; extract only if a second caller appears.
---

# ATM-GOV-0163 - Sealed Runner Build Must Not Wipe Host node_modules

## Series Selection

build/治理基礎設施 bug 屬 `governance-optimization` 家族（ATM-GOV 現行母目錄），沿用下一號 **0163**。

## Context

今日兩度重現：執行 `ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build`（sealed runner build）後，主 repo `node_modules` 被清空；一次連帶約 1055 個 tracked 檔被刪。恢復需要 `npm ci` 加上逐檔 `git restore`。

根因方向在 `scripts/run-sealed-runner-build.ts`：

- pre-build `rmSync(worktreeRoot, { recursive: true, force: true })`
- `linkNodeModules` 以 Windows junction / Unix symlink 把 worktree `node_modules` 指回主 repo
- `git worktree remove --force` 失敗時的 `rmSync` fallback 會沿著 junction 遞迴刪進主 repo

平行治理背景可引用 `ATM-BUG-2026-07-17-002/003/004`（shared git index / record-commit）；本卡交付範圍僅 sealed-build junction-aware 清理。

## Required Behavior

- Worktree 清理前若路徑是 reparse point / symlink / junction，只 `unlink`，不 `rmSync recursive`。
- 對整個 sealed worktree 目錄使用 junction-aware 遞迴清理，確保永不跟隨指向主 repo 的 `node_modules` link。
- 新增 fixture/regression：建立主 repo 假 `node_modules` + worktree junction 後執行清理，主 repo `node_modules` 內容必須完整。
- `package.json` build script 仍指向 sealed runner；修好後 release/atm-onefile 產物路徑不需為此卡改契約。
- TASK-SYNC 除污：禁止再沿用 `TASK-SYNC` 前綴；AAF ledger 上的 `TASK-SYNC-0001` 補 abandoned / supersede 註記指向本卡（或確認已由 ATM-GOV-0155 terminal 收斂）。

## Acceptance Criteria

- Junction/symlink 情境下，清理 sealed worktree 後主 repo `node_modules` marker 檔仍存在。
- 普通目錄（非 link）仍可被完整移除。
- Focused test 全綠；`npm run typecheck` 全綠。
- 在 0163 驗證通過前，任何真實 sealed build 後仍建議 `npm ci` 自保；通過後才可宣稱 runner-sync rebuild 安全。

## Validation

```shell
node --strip-types tests/cli/sealed-runner-build-junction-cleanup.test.ts
npm run typecheck
```

## Rollback

Revert the delivery commit. Operators continue treating sealed build as unsafe for host `node_modules` until a later fix lands.
