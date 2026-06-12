---
started_at: 2026-06-11T00:00:00.000Z
started_by_agent: 003
dispatch_id: P2-TASK-CID-0024-003
parent_task_id: TASK-CID-0024
assignee: "003"
status: in-progress
priority: P1
milestone: P1
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
source_plan: "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
source_task: "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0024-same-file-parallel-claim-shared-delivery-closeout.task.md"
---

# P2-TASK-CID-0024-003 - Shared claim, hook, and closeback validation

## Repo

C:\Users\User\3KLife

Target repo:

C:\Users\User\AI-Atomic-Framework

## Context Summary

第一輪 preflight 已把 implementation 切成 Slice-B/C/D：shared same-file claim 放行條件、pre-commit ownership proof gate、以及 closeback 正負向驗證。這一輪請 003 直接把這三塊收成 validator-driven implementation。

## Scope

- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/hook.ts`
- `scripts/validate-task-direction-governance.ts`
- `scripts/validate-task-ledger-governance.ts`
- `scripts/validate-governance-commands.ts`
- `scripts/validate-git-hooks-enforcement.ts`

## Deliverables

1. same-file CID-disjoint / steward-proven closeback-only claim 可放行，不再被檔名重疊一律阻擋。
2. pre-commit 只在 staged ownership / steward evidence 不足時拒絕，而不是只看 shared claim 同檔。
3. 補齊 closeback/historical-delivery 的正向與負向 validators。

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `node --strip-types scripts/validate-governance-commands.ts --mode validate`
- `node --strip-types scripts/validate-git-hooks-enforcement.ts --mode validate`
- `git diff --check`

## Invariants

- `historical-delivery` 不能成為免證據放行。
- hook 與 claim gate 要用 ownership / steward proof 判斷，而不是退回粗粒度 file overlap。

## Worker Report

Scope and evidence check:
- 已確認 `P2-TASK-CID-0024-003` 未延展超出指定範圍，卡片對應 scope 仍是：
  - `packages/cli/src/commands/next.ts`
  - `packages/cli/src/commands/tasks.ts`
  - `packages/cli/src/commands/hook.ts`
  - `scripts/validate-task-direction-governance.ts`
  - `scripts/validate-task-ledger-governance.ts`
  - `scripts/validate-governance-commands.ts`
  - `scripts/validate-git-hooks-enforcement.ts`
- 目前版本可對應卡片要求（同檔 shared claim / pre-commit staged ownership / historical closeback gate）已在現行實作中出現，不需新增額外實作修改。

Validators:
- `npm run typecheck`：PASS
- `npm run validate:cli`：PASS
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`：PASS
- `node --strip-types scripts/validate-git-hooks-enforcement.ts --mode validate`：PASS
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`：BLOCKED（fixture flow 在本機 run 中因 `git add` 無法定位 .git，為執行環境/fixture 工作目錄一致性問題）
- `node --strip-types scripts/validate-governance-commands.ts --mode validate`：BLOCKED（輸出顯示 `tasks claim --no-more-mutation` 與 `claimIntent=closeout-only` 斷言未同時成立）
- `git diff --check`：PASS

Closeout:
- 結論：**blocked (validation-environment / residual contract mismatch)**。功能面向需求已具備，但本輪無法宣告 fully done，需先處理上述兩項驗證阻塞再回收。
- 建議：
  - 協調修正 `validate-task-direction-governance.ts` 的 fixture 工作目錄到可正確觸發 `git add`。
  - 追查 `validate-governance-commands.ts` 對 `--no-more-mutation` 的 evidence 斷言是否仍需接受 `closeout-only` 的新別名映射。
