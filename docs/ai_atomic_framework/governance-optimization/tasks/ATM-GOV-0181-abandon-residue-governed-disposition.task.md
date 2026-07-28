---
task_id: ATM-GOV-0181
title: abandon 殘留 governed disposition — 後續卡不再繼承孤兒 residue blocker
status: done
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  本卡修 taskflow close/abandon 殘留治理行為，與 ATM-GOV-0180（scope 治理）
  同屬 governance-optimization / ATM-GOV 家族；RFT 系是模組拆分硬化，不符。
  開卡號取 3KLife 母目錄現有最大 ATM-GOV-0180 之下一號 0181。
related_bugs:
  - ATM-BUG-2026-07-12-147
scopePaths:
  - packages/cli/src/commands/taskflow/**
  - packages/cli/src/commands/tasks/**
  - packages/cli/src/commands/git-governance/**
  - tests/cli/abandon-residue-governed-disposition.test.ts
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - docs/governance/command-surface.md
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-12-147.json
  - docs/governance/atm-bug-and-optimization-backlog.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - .atm/history/evidence/ATM-GOV-0181.*
  - .atm/history/task-events/ATM-GOV-0181/**
  - .atm/history/tasks/ATM-GOV-0181.json
deliverables:
  - tests/cli/abandon-residue-governed-disposition.test.ts
validators:
  - node --strip-types tests/cli/abandon-residue-governed-disposition.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.taskflow.abandon-residue-disposition
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.taskflow.abandon-residue-disposition
      pattern: Guard
      source: packages/cli/src/commands/taskflow/
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T16:36:53.013Z"
completed_by_agent: "cursor-gov-0181"
closedAt: "2026-07-18T16:36:53.013Z"
closedByActor: "cursor-gov-0181"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T16-36-52-722Z-close-237863f34984"
lastTransitionAt: "2026-07-18T16:36:53.013Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2d3eb129bd9e97b5911917f9eda33f3ca1651aae"
---

# ATM-GOV-0181 — abandon residue governed disposition

## Phase 0 Scope

Open this planning card in 3KLife only. Phase 1 implements the fix in the
target AI-Atomic-Framework repository.

Phase 0 allowed files:

- `C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/tasks/ATM-GOV-0181-abandon-residue-governed-disposition.task.md`
- `C:/Users/User/3KLife/docs/tasks/` corresponding ATM ledger shard (if this
  family uses one; current GOV cards are markdown-authoritative and do not
  maintain a separate `tasks-atm` row)

## Background

AAF backlog item **ATM-BUG-2026-07-12-147** (High) — Taskflow close /
abandoned-task residue.

## Problem

After abandoning a malformed task (example: `TASK-AAO-0165`), its evidence,
task-event records, ledger JSON, and bundle-manifest remained in the worktree.

The **next** task (`TASK-AAO-0166`) then hit:

1. `taskflow pre-close` blocked by **foreign staged** files from the abandoned
   task
2. governed `git commit` blocked by
   `ATM_GIT_COMMIT_GENERATED_RESIDUE_BLOCKED` on the orphan
   `.atm/history/evidence/<abandoned>.bundle-manifest.json`

`--defer-foreign-staged` alone did **not** make the subsequent hook commit
admissible; operators had to locate and delete orphan generated artifacts by
hand.

## Acceptance

1. **Governed abandon disposition** — abandon produces a complete governed
   residue disposition: either commit that task's audit packet, **or** remove
   only disposable generated products, and leave remaining history explicitly
   **admissible** to later taskflow / commit lanes.
2. **No inherited blocker** — a subsequent task must not inherit an
   unresolvable foreign residue blocker from the abandoned task.
3. **Audit trail preserved** — abandon reason and records must remain; do not
   erase the audit trail.
4. **Regression** — abandon → next-task commit covering staged/untracked
   evidence, bundle-manifest cleanup, hook admission, and audit-trail
   preservation.

## Non-goals (Phase 0)

- No AAF implementation
- No status mirror commits
- No Phase 2 planning close
