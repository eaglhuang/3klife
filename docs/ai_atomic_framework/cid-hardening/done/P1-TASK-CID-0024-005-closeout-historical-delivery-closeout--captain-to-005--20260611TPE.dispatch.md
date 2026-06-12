---
dispatch_id: P1-TASK-CID-0024-005
parent_task_id: TASK-CID-0024
assignee: "005"
status: done
priority: P1
milestone: P1
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
source_plan: "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
source_task: "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0024-same-file-parallel-claim-shared-delivery-closeout.task.md"
---

# P1-TASK-CID-0024-005 - Closeout only and historical-delivery close path

## Repo

C:\Users\User\3KLife

Target repo:

C:\Users\User\AI-Atomic-Framework

## Context Summary

`TASK-CID-0024` needs closeout execution to complete governance convergence:
- capture the finish route that uses `tasks close --status done --historical-delivery <shared-steward-commit>`
- keep closeout as evidence-driven and command-verified
- avoid reopening implementation scope until all closeout evidence and planner mirror requirements are clear

請 005 幫忙把 `TASK-CID-0024` 收斂到可關卡的狀態，並把 closeout 所需的關鍵證據鏈整理清楚。

## Scope

- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/task.ts`
- `packages/core/src/validators/**`（或驗收時對應 task close/claim 相關 validator）
- `scripts/validate-task-ledger-governance.ts`
- `scripts/validate-governance-commands.ts`
- `scripts/validate-task-direction-governance.ts`
- `scripts/validate-git-hooks-enforcement.ts`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0024-same-file-parallel-claim-shared-delivery-closeout.task.md`

## Deliverables

1. `TASK-CID-0024` closeout evidence package（含：close 指令輸入、delivery commit、證據文件）可直接進入 005 closeout wave。
2. 明確界定「deliverable 已落地時，後續 worker 可直接 close 而不必重提同檔」的收斂條件與風險邊界。
3. 形成 `historical-delivery` close 的 closeout checklist，含否決條件與回滾條件。

## Validation

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`
- `node --strip-types scripts/validate-governance-commands.ts --mode validate`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`
- `node --strip-types scripts/validate-git-hooks-enforcement.ts --mode validate`
- `git diff --check`

## Invariants

- Closeout 只做證據封口，不新增新的實作邏輯。
- 歷史交付 close 不能變成「跳過衝突檢查」的後門，仍須保留 scoped evidence 驗證。
- 仍維持 coordinator / captain 對 lifecycle 的唯一最終權責。

## Worker Report

- Gate Verdict: `reject`
- Blocking Findings: the historical-delivery close route exists in source, but the closeout-only / no-more-mutation claim surface is not currently exposed by the synced frozen CLI. `node atm.mjs tasks claim --help` and `node atm.mjs next --claim --actor codex-gpt-5.4-mini --prompt "TASK-CID-0024" --json` do not surface a usable `--claim-intent` path, so this dispatch cannot advance into a governed closeout-only claim. `TASK-CID-0024` is still `status: planned` in the ledger and has no active claim.
- Latest Governance Output: the most recent `next` result still resolves `TASK-CID-0024` as the selected task under `promptScope`, with `status: ready`, `matchScore: 270`, and `closureAuthority: target_repo`; however `activeClaimActorId` remains `null`, so the route is still eligible in routing but not yet claim-closed.
- Evidence Checked: `docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0024-same-file-parallel-claim-shared-delivery-closeout.task.md`; `.atm/history/tasks/TASK-CID-0024.json`; `packages/cli/src/commands/next.ts`; `packages/cli/src/commands/tasks.ts`; `packages/cli/src/commands/tasks/task-option-parsers.ts`; `packages/cli/src/commands/tasks/task-transition-helpers.ts`; `scripts/validate-task-ledger-governance.ts`; `scripts/validate-governance-commands.ts`; `docs/governance/batch-playbook.md`; `node atm.mjs tasks claim --help`.
- Scope Drift: none. This stayed on closeout evidence and claimability only; no implementation scope, runtime state, or unrelated task family was widened.
