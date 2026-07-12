---
task_id: TASK-AAO-0164
title: "Precommit evidence requiredCommand task id guard"
status: done
owner: atm-core
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-11-114
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "scripts/validate-governance-commands.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/hook.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "scripts/validate-governance-commands.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:git-hooks-enforcement"
  - "npm run validate:governance-commands"
  - "npm run validate:task-import"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert hook requiredCommand guard and focused validator assertions if the evidence-file task attribution contract changes."
atomizationImpact:
  ownerAtomOrMap: "atom-cli-hook"
  mapUpdates: []
outOfScope:
  - "Changing Team Agents runtime or broker scheduling behavior"
  - "Changing bulk closure manifest policy beyond the incorrect requiredCommand"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-12T12:00:01.142Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-12T12:00:01.142Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T12-00-01-142Z-close-8b023e3de682"
lastTransitionAt: "2026-07-12T12:00:01.142Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6372d8fce086a3e9434e404a869a079d02fd9f85"
---

# TASK-AAO-0164 Precommit evidence requiredCommand task id guard

## Problem

`ATM-BUG-2026-07-11-114` records that pre-commit can suggest
`node atm.mjs git commit --task <basename-of-staged-file>` when a protected
evidence file is staged without valid task context. The suggested task id may
not exist, so the copyable remediation fails with `ATM_TASK_NOT_FOUND`.

## Goal

Make hook/pre-commit remediation avoid fabricated task ids. If a staged
protected evidence file cannot be tied to an existing task ledger entry, the
message must either omit the task-specific commit command or point to a
truthful create/claim/import recovery path.

## Acceptance Criteria

- Pre-commit no longer emits a `--task` requiredCommand derived only from an
  arbitrary evidence filename.
- Existing valid task-scoped evidence guidance still points at the real task.
- A deterministic validator covers both the invalid fabricated-task case and a
  valid task evidence case.
- `ATM-BUG-2026-07-11-114` is marked fixed with the fixing task id.

## Delivery Sequence

1. Locate the hook finding that emits `evidence-file-missing-task-context`.
2. Add task-ledger existence checks before task-specific requiredCommand output.
3. Add focused regression coverage for bogus evidence basenames.
4. Update the ATM bug backlog row and close through governed taskflow.

## Context Map

### Primary
- `packages/cli/src/commands/hook.ts`

### Test Coverage
- `scripts/validate-git-hooks-enforcement.ts`
- `scripts/validate-governance-commands.ts`

