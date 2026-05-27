---
doc_id: doc_other_aao_0054
task_id: TASK-AAO-0054
title: "非任務協作流與 git hook pre-push 隔離優化"
status: done
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "優化非任務協作流與 pre-push 的平行協作隔離，防止 features 分支被 pre-push hooks 誤殺，並避免 natural language 誤判為 path hints。"
milestone: M16
depends_on:
  - "TASK-AAO-0040"
  - "TASK-AAO-0046"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "scripts/validate-prompt-scoped-next.ts"
deliverables:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-git-hooks-enforcement.ts"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "git diff --check"
evidence:
  required: command-backed
  closedAt: "2026-05-27T08:58:39.000Z"
  closedByActor: "Codex"
  closureCommit: "a343188a033b12dcf474bf7f5254ae69798029e4"
rollback:
  strategy: revert-commit
  notes: "Revert commit a343188"
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "手動 reserve/promote/claim/close 繞過 batch lifecycle"
  - "手改 .atm/runtime/**"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不建立第二套 task lifecycle"
  - "不繞過 ATM evidence gate"
---
# TASK-AAO-0054 — 非任務協作流與 git hook pre-push 隔離優化

## Goal

修復並優化非任務協作流與 pre-push 的平行協作隔離（isolate non-task collaboration flows），防止 feature 分支推送時被 pre-push hooks 誤攔截，並避免自然語言 prompt 中的一般操作敘述被 next --prompt 誤解為路徑提示（path hints）。

## Why

在多 Agent 協作場景下，兩個常見的流程摩擦點會拖慢工作流：
1. **Git hook pre-push 誤殺**：本地處於 `main` 等 protected 分支，但將變更推送到遠端非 protected 特徵分支（如 `feature` / `codex/*`）時，pre-push hook 誤以本地分支作為標的進行了嚴格的 governance check 阻擋。
2. **Next 自然語言提示路徑誤判**：自然語言 prompt 中如包含 docs-only 或不含 ATM task/evidence 的一般 commit/push 敘述，`next --prompt` 的 `isLikelyPromptPathHint` 機制會誤將其讀取為 path hint 並發起 scope 搜尋，導致回傳找不到任務範疇。

此卡為 Codex 實作 commit `a343188a` 的規劃落地與 evidence 補全。

## Deliverables

- `packages/cli/src/commands/hook.ts` (優化 pre-push 目標分支解析，從 push refs 判定 remote branch targets，非 protected 降級為 warn-only)
- `packages/cli/src/commands/next.ts` (修正 `isLikelyPromptPathHint`，避免將無意義的關鍵字或非標準路徑誤判為 path hints)
- 測試覆蓋：
  - `scripts/validate-git-hooks-enforcement.ts` (新增 `protected-local-to-feature-remote` 的 pre-push hook 測試)
  - `scripts/validate-prompt-scoped-next.ts` (新增 `collaborationIsolationPrompt` 的意圖排除測試)

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-git-hooks-enforcement.ts`
- `node --strip-types scripts/validate-prompt-scoped-next.ts`
- `git diff --check`

## Acceptance Criteria

1. **Pre-push 隔離**：
   - 驗證 pre-push hook 當本地分支為 `main` (或其他 protected 本地)，但實際推送的遠端目標為非 protected feature 分支時，必須能自 remote push refs 正確解析，且不可 hard-block 推送（應降級為 warn-only）。
2. **Next Prompt 路徑誤判排除**：
   - 驗證當自然語言 prompt 描述非任務協作流（例如 `修正 git hook 的平行協作隔離...`）時，`next --prompt` 不可回報 `ATM_NEXT_TASK_SCOPE_NOT_FOUND`，且 `taskScopeMentioned` 應正確為 `false`。
3. **品質與回歸測試**：
   - validators 順利通過，沒有任何 syntax 或是 runtime error。
   - 與此無關的 `TASK-AAO-0052` 與 `TASK-AAO-0053` 狀態不受影響。

## Rollback

Revert commit `a343188a033b12dcf474bf7f5254ae69798029e4`.

## Atomization Impact

- **Owner atom/map**: `atm.git-governance-map`
- **Map updates**:
  - `atomic_workbench/atomization-coverage/path-to-atom-map.json`
