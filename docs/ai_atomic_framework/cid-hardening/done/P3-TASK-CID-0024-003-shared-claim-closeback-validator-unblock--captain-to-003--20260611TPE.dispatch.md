---
dispatch_id: P3-TASK-CID-0024-003
parent_task_id: TASK-CID-0024
assignee: "003"
status: in-progress
started_at: 2026-06-11T00:00:00.000Z
started_by_agent: 003
priority: P1
milestone: P1
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
source_plan: "docs/ai_atomic_framework/cid-hardening/CID蝖砍?閮??md"
source_task: "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0024-same-file-parallel-claim-shared-delivery-closeout.task.md"
---

# P3-TASK-CID-0024-003 - Shared claim closeback validator unblock

## Repo

C:\Users\User\3KLife

Target repo:

C:\Users\User\AI-Atomic-Framework

## Context Summary

蝚砌?頛?`003` 撌脰???shared claim / hook / historical closeback ?蜓頝舐?憭扯甇?Ⅱ嚗??桀???拙憛?

- `validate-task-direction-governance.ts` ??fixture flow ??`git add` ?挾銝 git repository
- `validate-governance-commands.ts` 撠?`--no-more-mutation` ?????芸??游?銝?`closeout-only`

??頛芾? `003` ?湔??validator/hook 頝臬??嗆??啣??
## Scope

- `scripts/validate-task-direction-governance.ts`
- `scripts/validate-governance-commands.ts`
- `scripts/validate-git-hooks-enforcement.ts`
- `packages/cli/src/commands/hook.ts`
- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/tasks.ts`

## Deliverables

1. 靽格迤 task-direction fixture flow嚗蝙 shared claim / closeback ???臬?? git repo 璇辣銝?霅?2. 鋆? `--no-more-mutation` / `closeout-only` ?迤鞎?瘝餌?撽???3. 蝬剜? hook gate ?斗隞?ownership / steward evidence ?箔蜓嚗?????????扎?
## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`
- `node --strip-types scripts/validate-governance-commands.ts --mode validate`
- `node --strip-types scripts/validate-git-hooks-enforcement.ts --mode validate`
- `git diff --check`

## Invariants

- 銝? fixture ??蝖祆?? pass嚗???霈祥??靘頝?- validator 靽株?銝蝔??closeback / historical-delivery ????瘙?

## Worker Report

本卡執行 focus：
1. unblock `validate-task-direction-governance.ts` fixture 的 git repo 問題
2. 檢查 `--no-more-mutation` / `closeout-only` 在 `validate-governance-commands.ts` 的正向與反向用例

結果：
- 已核對 `validate-task-direction-governance.ts` fixture 流程，目前在本地可完整通過，`git add` 失敗已不再出現（屬於先前臨時 working directory 狀態殘留；目前各 fixture 區段皆可在 fixture repo 下完成 `git` 動作）。
- `--no-more-mutation` 的 claim intent 已與 `closeout-only` 成對斷言齊全，`tasks claim --claim-intent no-more-mutation` 與 `tasks claim --no-more-mutation` 都可正常回傳並落到 `claimIntent=closeout-only`，同時 alias `--closeout-only` 亦有對應覆核。
- `scripts/validate-git-hooks-enforcement.ts` 一併維持 pass，未見 hook gate regression。

Validators:
- `npm run typecheck`：PASS
- `npm run validate:cli`：PASS
- `node --strip-types scripts/validate-task-direction-governance.ts --mode validate`：PASS
- `node --strip-types scripts/validate-governance-commands.ts --mode validate`：PASS
- `node --strip-types scripts/validate-git-hooks-enforcement.ts --mode validate`：PASS
- `git diff --check`：PASS

Closeout：
- 結論：**done**（需求已補齊且驗證器全部 pass）
