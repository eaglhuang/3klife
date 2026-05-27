---
doc_id: doc_other_aao_0034
task_id: TASK-AAO-0034
title: "next explicit selector 與 routing memory"
status: done
owner: atm-core
priority: P0
earlyUnblocker: true
unblockerReason: "Keeps next/intent routing scoped and prevents unrelated task selection or premature batch advance."
milestone: M11
depends_on:
  - "TASK-AAO-0001"
  - "TASK-AAO-0003"
  - "TASK-AAO-0024"
  - "TASK-AAO-0026"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-intent.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-intent.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "新增 script / CLI / validator 時，同卡必須更新 atomization ownership map，不把 ownership 留給後續卡。"
outOfScope:
  - "手改 .atm/runtime/**"
  - "把 .atm/history/** 當作功能交付物"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不在本卡完成整個 AAO 計畫"
  - "不建立第二套 task lifecycle"
  - "不繞過 ATM evidence gate"
---
# TASK-AAO-0034 — next explicit selector 與 routing memory

## Goal

把 next 從會自作主張的全域搜尋器，收斂成 selector-first 的治理導航；使用者明確指定 task / tasks / plan / family / batch 時必須優先。

## Why

next 的推薦很好用，但不該成為性能瓶頸，也不該把 unrelated 半成品或別人的卡塞給當前使用者。使用者的明確 selector 應該高於 prompt 猜測。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/task-intent.ts`
- `packages/cli/src/commands/command-specs/next.spec.ts`
- `scripts/validate-prompt-scoped-next.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-prompt-scoped-next.ts`

## Acceptance Criteria

- 新增或強化 `next --task`, `next --tasks`, `next --plan`, `next --family`, `next --batch` selector。
- 沒有 explicit selector 時才使用 prompt resolver；低信心或 unrelated fallback 必須回 selection-required / scope-not-found。
- 只有 active claim/batch/staged scope conflict/dependency/evidence/protected state 這類硬治理理由可以阻止切任務。
- 新增可追蹤 routing feedback memory，例如 accepted/rejected family 或 prompt alias，不用黑盒模型學習。
- next 使用 task index/cache，避免每次大範圍掃 repo 成為性能瓶頸。


<!-- AAO-feedback-0034-routing-learning -->
## Feedback Reinforcement Acceptance

- This card owns the “next is not smart enough yet” issue. It must add selector-first routing that respects explicit task, task list, plan path, plan name, family/root, and batch id.
- If the user prompt names a plan but no matching plan/task can be found, `next` must return scope-not-found or selection-required; it must not fall back to unrelated open tasks.
- Task shorthand in prompts must normalize before lookup: `AAO-0011`, `AAO-0030`, `ASA-0005`, and similar family-number forms must resolve to their canonical `TASK-*` task ids when matching cards exist.
- If a prompt mentions multiple valid shorthand task ids, `next` must return a multi-task/selection route instead of `ATM_NEXT_TASK_SCOPE_NOT_FOUND`; scope-not-found is only valid when the normalized ids truly do not exist.
- Regression evidence must include the observed failure mode: prompt text containing `AAO-0011` and `AAO-0030/0046` must discover the matching AAO cards or ask for selection, never report no scope while those cards exist.
- Routing memory/cache may learn accepted aliases and rejected false matches, but it must remain inspectable and resettable.
- Routing must be performance-conscious: prefer indexed task metadata and explicit selectors over broad repo scans on every `next` call.
<!-- /AAO-feedback-0034-routing-learning -->


<!-- AAO-feedback-0034-active-batch-claim-idempotency -->
## Throughput Reinforcement Acceptance

- `next --claim` must be idempotent while an active batch has an uncheckpointed queue head: repeated claim calls return the current head and current lock state.
- `next --claim` must not advance to or claim the next task until `batch checkpoint` succeeds or the batch is explicitly held/skipped/repaired.
- If request prompt names a later task while the batch head has checkpoint debt, ATM must return `ATM_BATCH_QUEUE_HEAD_REQUIRED` with the current head and checkpoint command.
- Regression evidence must cover the observed failure mode: active batch head is `TASK-AAO-0004`, but repeated `next --claim` must not create a `TASK-AAO-0005` claim.
<!-- /AAO-feedback-0034-active-batch-claim-idempotency -->

<!-- AAO-feedback-0034-next-claim-compact-json -->
## Throughput Reinforcement Acceptance: Compact Next Claim

- `next --claim --compact --json` must return an agent-facing summary instead of the full queue/debug payload.
- Compact claim output must include only the selected task, channel, playbook summary, `targetWork.allowedFiles`, validators, direction lock id/path, and the next required command.
- Full queue records, integration bootstrap details, runtime adapter details, and unrelated open tasks must move behind an explicit verbose/debug flag.
- If the route is ambiguous, compact output must still include enough selection diagnostics to let the user choose a task or task range manually.
<!-- /AAO-feedback-0034-next-claim-compact-json -->

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.next-router-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

ATM 可以推薦工作順序，但不能擁有工作順序。它是導航，不是替使用者硬派任務的排程器。
