---
doc_id: doc_rft_index_tasks_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-13
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

| Task ID | Target file | Latest size | Pattern | Status |
|---|---|---|---|
| [TASK-RFT-0001](./TASK-RFT-0001-next-ts-atomic-map-extraction.task.md) | `packages/cli/src/commands/next.ts` | 3,936 lines | Strategy Map + Policy + Result Contract + Facade | planned |
| [TASK-RFT-0002](./TASK-RFT-0002-hook-ts-phase-split.task.md) | `packages/cli/src/commands/hook.ts` | 3,429 lines | Strategy Map + Facade | planned |
| [TASK-RFT-0003](./TASK-RFT-0003-framework-development-temp-claim-lifecycle.task.md) | `packages/cli/src/commands/framework-development.ts` | delivered; follow-up size pressure now sits in `framework-development/closure-packet-schema.ts` (2,879 lines) | Policy Object + Facade | done |
| [TASK-RFT-0004](./TASK-RFT-0004-task-ledger-invariant-registry.task.md) | `scripts/validate-task-ledger-governance.ts` | 2,714 lines | Strategy Map + shared envelope | planned |
| [TASK-RFT-0005](./TASK-RFT-0005-captain-dispatch-mailbox-lane-split.task.md) | `scripts/captain-dispatch-mailbox.ts` | 2,009 lines | Strategy Map + Facade | planned |
| [TASK-RFT-0006](./TASK-RFT-0006-police-family-role-split.task.md) | `packages/core/src/police/family.ts` | 1,803 lines | Strategy Map + shared Result Contract | planned |
| [TASK-RFT-0007](./TASK-RFT-0007-evidence-verb-split.task.md) | `packages/cli/src/commands/evidence.ts` | 2,822 lines | Strategy Map + Facade | planned |
| [TASK-RFT-0008](./TASK-RFT-0008-taskflow-size-tripwire-and-commit-message-strategy.task.md) | `packages/cli/src/commands/taskflow.ts` / `taskflow-dryrun.spec.ts` | validation card closed; broad spec still 1,798 lines | Light Strategy Map + tripwire | done |
| [TASK-RFT-0009](./TASK-RFT-0009-taskflow-production-close-atom-split.task.md) | `packages/cli/src/commands/taskflow.ts` | 1,295 lines after split (from 2,574) | Facade + close production atoms | done |
| [TASK-RFT-0010](./TASK-RFT-0010-tasks-ts-thin-facade-recovery.task.md) | `packages/cli/src/commands/tasks.ts` | 7,085 lines | Facade + Policy + Strategy + Result Contract | planned |
| [TASK-RFT-0017](./TASK-RFT-0017-tasks-claim-lifecycle-orchestrator.task.md) | `packages/cli/src/commands/tasks.ts` | 5,796 lines before Lane B; target <4,800 | Claim lifecycle + claim preparation atoms + Facade | planned |
| [TASK-RFT-0018](./TASK-RFT-0018-tasks-reconcile-repair-deliver-close.task.md) | `packages/cli/src/commands/tasks.ts` | post-0017 target: <4,800 lines | Reconcile / repair / deliver-close orchestrators + Facade | planned |
| [TASK-RFT-0019](./TASK-RFT-0019-tasks-card-parser-scope-queue-final-facade.task.md) | `packages/cli/src/commands/tasks.ts` | post-0018 target: <3,900 lines | Card parser + scope/queue atoms + final Facade | planned |

## Active Parallel Lanes (2026-07-09)

The 2026-07-09 measurement found `packages/cli/src/commands/tasks.ts` at 5,796
lines and still carrying several separable clusters. Lane B owns the remaining
`tasks.ts` shrink work while Lane A owns `next.ts`.

| Lane | Task(s) | Scope | Coordination note |
|---|---|---|---|
| Lane A | [TASK-RFT-0001](./TASK-RFT-0001-next-ts-atomic-map-extraction.task.md) | `packages/cli/src/commands/next.ts` and `next/**` | Run by a separate agent; Lane B must not touch these files. |
| Lane B | [TASK-RFT-0017](./TASK-RFT-0017-tasks-claim-lifecycle-orchestrator.task.md) -> [TASK-RFT-0018](./TASK-RFT-0018-tasks-reconcile-repair-deliver-close.task.md) -> [TASK-RFT-0019](./TASK-RFT-0019-tasks-card-parser-scope-queue-final-facade.task.md) | `packages/cli/src/commands/tasks.ts`, `tasks/**`, targeted validators, and `docs/reports/tasks-command-atomic-map.md` | Serial within Lane B; do not overlap the three cards against the same facade. |

## Latest Open Priority Board (2026-07-09)

Current open-card ranking by actual file size in `AI-Atomic-Framework`:

1. [TASK-RFT-0017](./TASK-RFT-0017-tasks-claim-lifecycle-orchestrator.task.md) -> `packages/cli/src/commands/tasks.ts` claim lifecycle + claim preparation cluster -> 5,796-line facade, target <4,800
2. [TASK-RFT-0018](./TASK-RFT-0018-tasks-reconcile-repair-deliver-close.task.md) -> `packages/cli/src/commands/tasks.ts` reconcile / repair / deliver-close cluster -> target <3,900
3. [TASK-RFT-0019](./TASK-RFT-0019-tasks-card-parser-scope-queue-final-facade.task.md) -> `packages/cli/src/commands/tasks.ts` card parser + scope/queue cluster -> target near 1,000
4. [TASK-RFT-0001](./TASK-RFT-0001-next-ts-atomic-map-extraction.task.md) -> `packages/cli/src/commands/next.ts` -> Lane A hot path split
5. [TASK-RFT-0002](./TASK-RFT-0002-hook-ts-phase-split.task.md) -> `packages/cli/src/commands/hook.ts` -> remaining oversized command surface
6. [TASK-RFT-0007](./TASK-RFT-0007-evidence-verb-split.task.md) -> `packages/cli/src/commands/evidence.ts` -> remaining oversized command surface
7. [TASK-RFT-0004](./TASK-RFT-0004-task-ledger-invariant-registry.task.md) -> `scripts/validate-task-ledger-governance.ts` -> validator split

## Uncovered Follow-up Pressure

These files are still above several planned RFT targets:

1. `packages/cli/src/commands/team.ts` -> 2,966 lines
2. `packages/cli/src/commands/framework-development/closure-packet-schema.ts` -> 2,879 lines
3. `packages/cli/src/commands/git-governance.ts` -> 1,822 lines

Any next RFT expansion should prefer these uncovered surfaces after TASK-RFT-0010 rather than opening lower-pressure follow-ups on already-shrunk modules.
