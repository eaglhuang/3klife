---
dispatch_id: P3-TASK-CID-0024-001
parent_task_id: TASK-CID-0024
assignee: "001"
status: open
priority: P1
milestone: P1
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
source_plan: "docs/ai_atomic_framework/cid-hardening/CID-0002-team-claim-parallelized-closeback.md"
source_task: "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0024-same-file-parallel-claim-shared-delivery-closeout.task.md"
---

# P3-TASK-CID-0024-001 - Closeback claim alias evidence sync

## Repo

C:\Users\User\3KLife

Target repo:

C:\Users\User\AI-Atomic-Framework

## Context Summary

接續 001 在 `--closeout-only` / `--no-more-mutation` 之間做的 parser / help / validator 對齊工作，`003` 也會補齊 `validate-governance-commands.ts` 的 closeback closeout-only 覆蓋。這張卡將 alias surface 與 evidence 語意收斂為同一治理語意。

## Scope

- `packages/cli/src/commands/tasks/task-option-parsers.ts`
- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/command-specs/tasks.spec.ts`
- `scripts/validate-governance-commands.ts`

## Deliverables

1. 將 `--claim-intent closeout-only`、`--closeout-only`、`--no-more-mutation` 的 parser / command / validator / evidence 語意對齊。
2. 修正 `validate-governance-commands.ts` 中 alias evidence 的 residual mismatch 檢查。
3. 更新 CLI help / validator fixture 的可見 surface。

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-governance-commands.ts --mode validate`
- `git diff --check`

## Invariants

- closeback claim surface 必須維持非 `write` 的 claim intent 邊界一致。
- alias 轉譯必須維持語意一致，不能出現只顯示字串差異但證據不同的落差。

## Worker Report

- 已完成 `P3-TASK-CID-0024-001` alias/evidence 收斂，將以下項目納入一致治理語意：
  - `packages/cli/src/commands/tasks/task-option-parsers.ts`：`--claim-intent` 與 `--closeout-only` / `--no-more-mutation` 三入口對齊到 `closeout-only` 意圖（含非法值檢核）。
  - `packages/cli/src/commands/command-specs/tasks.spec.ts`：更新 help text、參數說明與範例，補上 closeback-only alias 使用方式與一致錯誤訊息觀感。
  - `scripts/validate-governance-commands.ts`：補齊 TASK-CID-0024 段落驗證 `--claim-intent no-more-mutation`、`--closeout-only`、`--no-more-mutation` 三入口行為，包含 evidence claimIntent 與 ledger intent 落地。
- 驗證結果：
  - `npm run validate:cli` pass
  - `npm run typecheck` pass
  - `node --strip-types scripts/validate-governance-commands.ts --mode validate` pass
  - `git diff --check` pass
- 結論：此卡已無阻塞，可收斂為 closeout-ready，三入口與證據語意一致。
