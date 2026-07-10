---
doc_id: doc_rft_index_tasks_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-13
updated_at: 2026-07-10
---

# RFT (Refactor Tracking) Task Index

Related plan: [../atm-cli-oversized-module-refactor-plan.md](../atm-cli-oversized-module-refactor-plan.md)
Related skill: `.agents/skills/atm-atom-map-refactor` in the target repo.

## Task Card Contract

Every `TASK-RFT-*` card follows the ATM task-card authoring contract:

- machine-readable frontmatter is required;
- `planning_repo` (3KLife) carries intent;
- `target_repo` (AI-Atomic-Framework) carries source-write authority;
- validators, rollback, and `atomizationImpact` are declared before implementation starts;
- scopePaths AND deliverables list every file the executor will touch, INCLUDING new atom files, new test specs, new validators, and any snapshot/fixture that has to be regenerated;
- closing the card uses `taskflow open --write` / `taskflow close --write`, not raw `git commit` or backend `tasks close` / `tasks reconcile`.

## Cards

Post-delivery facade sizes are measured in `AI-Atomic-Framework` on 2026-07-10.

| Task ID | Target file | Latest size | Pattern | Status |
|---|---|---|---|---|
| [TASK-RFT-0001](./TASK-RFT-0001-next-ts-atomic-map-extraction.task.md) | `packages/cli/src/commands/next.ts` | ~4,958 lines (still oversized; card closed with partial extraction) | Strategy Map + Policy + Result Contract + Facade | done |
| [TASK-RFT-0002](./TASK-RFT-0002-hook-ts-phase-split.task.md) | `packages/cli/src/commands/hook.ts` | ~82-line facade | Strategy Map + Facade | done |
| [TASK-RFT-0003](./TASK-RFT-0003-framework-development-temp-claim-lifecycle.task.md) | `packages/cli/src/commands/framework-development.ts` | delivered; follow-up size pressure now sits in `framework-development/closure-packet-schema.ts` | Policy Object + Facade | done |
| [TASK-RFT-0004](./TASK-RFT-0004-task-ledger-invariant-registry.task.md) | `scripts/validate-task-ledger-governance.ts` | ~14-line facade | Strategy Map + shared envelope | done |
| [TASK-RFT-0005](./TASK-RFT-0005-captain-dispatch-mailbox-lane-split.task.md) | `scripts/captain-dispatch-mailbox.ts` | ~112-line facade | Strategy Map + Facade | done |
| [TASK-RFT-0006](./TASK-RFT-0006-police-family-role-split.task.md) | `packages/core/src/police/family.ts` | ~337-line facade | Strategy Map + shared Result Contract | done |
| [TASK-RFT-0007](./TASK-RFT-0007-evidence-verb-split.task.md) | `packages/cli/src/commands/evidence.ts` | ~49-line facade | Strategy Map + Facade | done |
| [TASK-RFT-0008](./TASK-RFT-0008-taskflow-size-tripwire-and-commit-message-strategy.task.md) | `packages/cli/src/commands/taskflow.ts` / `taskflow-dryrun.spec.ts` | validation card closed | Light Strategy Map + tripwire | done |
| [TASK-RFT-0009](./TASK-RFT-0009-taskflow-production-close-atom-split.task.md) | `packages/cli/src/commands/taskflow.ts` | production close atoms delivered | Facade + close production atoms | done |
| [TASK-RFT-0010](./TASK-RFT-0010-tasks-ts-thin-facade-recovery.task.md) | `packages/cli/src/commands/tasks.ts` | ~103-line facade after Lane B | Facade + Policy + Strategy + Result Contract | done |
| [TASK-RFT-0017](./TASK-RFT-0017-tasks-claim-lifecycle-orchestrator.task.md) | `packages/cli/src/commands/tasks.ts` | claim lifecycle atoms delivered | Claim lifecycle + claim preparation atoms + Facade | done |
| [TASK-RFT-0018](./TASK-RFT-0018-tasks-reconcile-repair-deliver-close.task.md) | `packages/cli/src/commands/tasks.ts` | reconcile / repair / deliver-close atoms delivered | Reconcile / repair / deliver-close orchestrators + Facade | done |
| [TASK-RFT-0019](./TASK-RFT-0019-tasks-card-parser-scope-queue-final-facade.task.md) | `packages/cli/src/commands/tasks.ts` | card parser + scope/queue + final facade delivered | Card parser + scope/queue atoms + final Facade | done |

## 2026-07-10 delivery wave (0002 / 0007 / 0004 / 0006 / 0005)

Serial delivery completed in target repo `AI-Atomic-Framework` and mirrored here via `taskflow close` planning bundles:

| Task | Target delivery | Planning close commit | Notes |
|---|---|---|---|
| TASK-RFT-0002 | `b5229d64` | `f381ef33` | hook phase modules + atomic-map validator |
| TASK-RFT-0007 | evidence verb split delivery | `9b27cb12` | evidence verb modules + atomic-map validator |
| TASK-RFT-0004 | `d16e18b2` | `5c407ce0` | task-ledger invariant registry |
| TASK-RFT-0006 | `f1fcd2bb` | `7b0a918a` | police family role registry |
| TASK-RFT-0005 | `9457a002` | `877c4e8d` | captain-dispatch mailbox lane split |

## Active Parallel Lanes (historical 2026-07-09)

Lane A / Lane B for `next.ts` and `tasks.ts` are closed. Keep the note only as coordination history:

| Lane | Task(s) | Scope | Coordination note |
|---|---|---|---|
| Lane A | [TASK-RFT-0001](./TASK-RFT-0001-next-ts-atomic-map-extraction.task.md) | `packages/cli/src/commands/next.ts` and `next/**` | Closed; `next.ts` remains oversized and may need a follow-up card. |
| Lane B | [TASK-RFT-0017](./TASK-RFT-0017-tasks-claim-lifecycle-orchestrator.task.md) -> [TASK-RFT-0018](./TASK-RFT-0018-tasks-reconcile-repair-deliver-close.task.md) -> [TASK-RFT-0019](./TASK-RFT-0019-tasks-card-parser-scope-queue-final-facade.task.md) | `packages/cli/src/commands/tasks.ts`, `tasks/**` | Closed; facade is now thin. |

## Latest Open Priority Board (2026-07-10)

Primary oversized RFT cards from the original 0001–0007 / 0010 / 0017–0019 wave are closed. Remaining pressure is uncovered follow-up surfaces and any new card for residual `next.ts` size.

Current ranking by actual file size in `AI-Atomic-Framework`:

1. `packages/cli/src/commands/next.ts` (~4,958) — residual after TASK-RFT-0001; needs an explicit follow-up card before more extraction
2. `packages/cli/src/commands/team.ts` (~2,966)
3. `packages/cli/src/commands/framework-development/closure-packet-schema.ts` (~2,879)
4. `packages/cli/src/commands/git-governance.ts` (~1,822)

## Governed Hardening Follow-ups (2026-07-09)

These are not primary oversized-file cards. They are narrowly scoped framework
hardening follow-ups created after a real weak-agent boundary failure exposed
gaps in ATM's operator governance.

| Task ID | Focus | Why it exists | Status |
|---|---|---|---|
| [TASK-AAO-0154](./TASK-AAO-0154-cross-task-mutation-incident-safe-mode.task.md) | Cross-task restore/reset/remove incident-safe mode | Stop dangerous cleanup behavior before it damages another active task's evidence or ownership state. | done |
| [TASK-AAO-0155](./TASK-AAO-0155-next-active-task-divergence-guard.task.md) | `next --prompt` active-task divergence guard | Prevent new bug prompts from being silently attached to the wrong active task. | done |
| [TASK-AAO-0156](./TASK-AAO-0156-protected-atm-history-and-staged-ownership-fencing.task.md) | `.atm` history + staged-ownership fencing | Block weak-agent self-cleanup of protected ATM history and another lane's staged evidence. | done |

## Uncovered Follow-up Pressure

These files are still above several planned RFT targets:

1. `packages/cli/src/commands/next.ts` -> ~4,958 lines (residual after 0001)
2. `packages/cli/src/commands/team.ts` -> 2,966 lines
3. `packages/cli/src/commands/framework-development/closure-packet-schema.ts` -> 2,879 lines
4. `packages/cli/src/commands/git-governance.ts` -> 1,822 lines

Any next RFT expansion should prefer these uncovered surfaces rather than reopening closed facade cards.
