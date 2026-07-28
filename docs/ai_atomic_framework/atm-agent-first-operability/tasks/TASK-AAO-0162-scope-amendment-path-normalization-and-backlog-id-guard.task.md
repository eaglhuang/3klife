---
task_id: TASK-AAO-0162
title: "Scope amendment path normalization and backlog ID guard"
status: done
owner: atm-core
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-125
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "scripts/validate-governance-commands.ts"
  - "scripts/validate-task-import.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "scripts/validate-governance-commands.ts"
  - "scripts/validate-task-import.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "npm run typecheck"
  - "npm run validate:governance-commands"
  - "npm run validate:task-import"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert scope parser normalization and backlog duplicate guard together; do not hand-edit historical scope-amendment events."
atomizationImpact:
  ownerAtomOrMap: "atm.task-lifecycle"
  mapUpdates: []
outOfScope:
  - "Repairing historical TASK-TEAM-0075 scope-amendment event display"
  - "Changing Team Agents implementation or role-provider behavior"
  - "Manual edits under .atm/history outside governed import/claim/close artifacts"
completed_at: "2026-07-12T10:50:47.555Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-12T10:50:47.555Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T10-50-47-471Z-close-0da3d0bd4c34"
lastTransitionAt: "2026-07-12T10:50:47.555Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "708a3e42437f0047388e2654ecf74759a02debca"
---

# TASK-AAO-0162 Scope amendment path normalization and backlog ID guard

## Problem

`ATM-BUG-2026-07-12-125`: `tasks scope add --add` can preserve shell-level
outer quotation marks in the immutable `scope-amendment` audit payload when a
CSV path list arrives as one quoted argument. The effective runtime lock can be
normalized while the recorded event remains misleading.

The same backlog row observed that the canonical ATM bug backlog can contain
duplicate IDs without a validator failing, which makes later closeback and
triage ambiguous.

## Goal

Normalize user-provided scope amendment paths before runtime and audit
recording, and add a deterministic guard that rejects duplicate ATM backlog
IDs in the canonical backlog.

## Acceptance Criteria

- `tasks scope add --add "\"docs/a.md,packages/a.ts\""` records
  `addedPaths` without leading or trailing shell quote characters.
- `tasks scope repair --add` receives the same path normalization.
- Scope amendment command reconstruction remains readable and copyable.
- The canonical ATM backlog validator rejects duplicate `ATM-BUG-*` IDs with a
  clear finding that names the duplicate ID.
- Existing normal scope amendment behavior remains unchanged for unquoted CSV
  paths.
- Focused validation covers quoted CSV normalization and duplicate backlog ID
  rejection.

## Delivery Sequence

1. Locate scope option parsing and scope amendment event persistence.
2. Normalize CSV path tokens before allowed-file comparison and event writing.
3. Add duplicate canonical backlog ID validation.
4. Run typecheck, governance command validation, task import validation, and
   whitespace checks.

## Context Map

### Primary
- `packages/cli/src/commands/tasks/task-option-parsers.ts`
- `packages/cli/src/commands/tasks/legacy-impl.ts`

### Secondary
- `scripts/validate-governance-commands.ts`
- `scripts/validate-task-import.ts`
- `docs/governance/atm-bug-and-optimization-backlog.md`

### Test Coverage
- Governance command validator for quoted scope amendment paths.
- Task/backlog import or governance validator for duplicate ATM backlog IDs.
