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

| Task ID | Target file | Pattern | Status |
|---|---|---|---|
| [TASK-RFT-0001](./TASK-RFT-0001-next-ts-atomic-map-extraction.task.md) | `packages/cli/src/commands/next.ts` | Strategy Map + Policy + Result Contract + Facade | planned |
| [TASK-RFT-0002](./TASK-RFT-0002-hook-ts-phase-split.task.md) | `packages/cli/src/commands/hook.ts` | Strategy Map + Facade | planned |
| [TASK-RFT-0003](./TASK-RFT-0003-framework-development-temp-claim-lifecycle.task.md) | `packages/cli/src/commands/framework-development.ts` | Policy Object + Facade | planned |
| [TASK-RFT-0004](./TASK-RFT-0004-task-ledger-invariant-registry.task.md) | `scripts/validate-task-ledger-governance.ts` | Strategy Map + shared envelope | planned |
| [TASK-RFT-0005](./TASK-RFT-0005-captain-dispatch-mailbox-lane-split.task.md) | `scripts/captain-dispatch-mailbox.ts` | Strategy Map + Facade | planned |
| [TASK-RFT-0006](./TASK-RFT-0006-police-family-role-split.task.md) | `packages/core/src/police/family.ts` | Strategy Map + shared Result Contract | planned |
| [TASK-RFT-0007](./TASK-RFT-0007-evidence-verb-split.task.md) | `packages/cli/src/commands/evidence.ts` | Strategy Map + Facade | planned |
| [TASK-RFT-0008](./TASK-RFT-0008-taskflow-size-tripwire-and-commit-message-strategy.task.md) | `packages/cli/src/commands/taskflow.ts` | Light Strategy Map + tripwire | planned |
