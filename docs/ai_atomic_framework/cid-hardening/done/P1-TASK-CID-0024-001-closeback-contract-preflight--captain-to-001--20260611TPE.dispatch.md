---
dispatch_id: P1-TASK-CID-0024-001
parent_task_id: TASK-CID-0024
assignee: "001"
status: done
priority: P1
milestone: P1
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
source_plan: "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
source_task: "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0024-same-file-parallel-claim-shared-delivery-closeout.task.md"
---

# P1-TASK-CID-0024-001 - Closeback contract preflight

## Repo

C:\Users\User\3KLife

Target repo:

C:\Users\User\AI-Atomic-Framework

## Context Summary

先行盤點 `taskflow close` 的 closeback 契約形態，避免只做實作卻缺少治理契約定義。這張卡負責 `TASK-CID-0024` 的共用 closeback contract 先行定義，對齊 close 命令、證據回寫、權責界線與驗證條件。

## Scope

- `packages/cli/src/commands/taskflow.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/next.ts`
- `scripts/validate-task-ledger-governance.ts`
- `scripts/validate-governance-commands.ts`
- `scripts/validate-task-direction-governance.ts`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0024-same-file-parallel-claim-shared-delivery-closeout.task.md`

## Deliverables

1. 定義 closeback contract 的 machine field（是否可回寫、何時可回寫、回寫失敗 fallback）。
2. 建立 `tasks close --historical-delivery` 在 closeback 內容中的授權與條件清單。
3. 產出可直接做實作判斷的預檢清單（preflight），含 must-have 與 no-goal。

## Validation

- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `node --strip-types scripts/validate-governance-commands.ts --mode validate`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`
- `git diff --check`

## Invariants

- 以 contract first 方式先行收斂；不直接改主流程實作，除非已定義清楚。
- closeback 權責只承接 close/closeout 交付，不能直接新增 lifecycle 寫入權限。
## Worker Report

- 判定結論：`closeback contract` 應視為 **close-path 的預檢契約**，不是第二套 lifecycle owner；它只負責判斷既有交付是否可安全收斂成 done，不應擴張成新的寫入權威。
- 可回寫條件：`tasks close --status done --historical-delivery <commit>` 的治理邊界已存在，必須同時滿足「active claim 屬於執行者」、「target repo closure authority 成立」、「historical-delivery commit 真的包含 scope 內 deliverables」、「沒有阻擋性的 scoped tracked dirty files」。
- historical-delivery 風險：若 delivery commit 未涵蓋 task scope、或只是 mutable worktree 的假交付，close 應失敗並回到 reconcile / repair 路徑；closeback 不能替代證據，也不能成為跳過交付檢查的後門。
- close / backout 邊界：`closeback` 只負責判斷是否可安全 close，`backout` / reopen / 重新導向應屬於 task lifecycle / reconcile 機制；兩者不能互相取代，也不能形成第二套 close authority。
- 阻斷點：目前 target repo 仍有框架開發模式要求，且 `node atm.mjs next --claim --actor codex-gpt-5.4-mini --json` 顯示 `No claimable imported task is ready at the moment`，代表這張 0024 卡尚未在 target repo 形成可 claim 的 imported task；另外 `npm run build` 目前失敗於 `packages/cli/src/commands/integration-hooks.ts` 的既有型別錯誤，因此 frozen runner 也尚未同步。
- 建議下一步：先補齊 target repo 的可 claim task/import 狀態，再用既有 `tasks close --historical-delivery` / `tasks reconcile` / closeout-only claim-intent 路徑做正式實作與驗證；在那之前，這張卡應維持為 preflight judgment，不能直接往實作 close-out 推進。
