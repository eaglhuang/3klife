---
task_id: TASK-TMP-0003
title: Temporary carrier for ATM-GOV-0204 canonical task import boundary repair
status: done
owner: codex-main
priority: P1
depends_on: []
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Temporary cleanup/implementation carrier required because ATM-GOV-0204 is dependency-gated by ATM-GOV-0203; per owner direction, emergency implementation carriers must use TMP, not CID.
scopePaths:
  - packages/cli/src/commands/tasks/**
  - scripts/validate-task-import/**
  - scripts/validate-task-import.ts
  - tests/cli/task-import-canonical-id-boundary.test.ts
deliverables:
  - packages/cli/src/commands/tasks/**
  - scripts/validate-task-import/**
  - tests/cli/task-import-canonical-id-boundary.test.ts
validators:
  - node --strip-types tests/cli/task-import-canonical-id-boundary.test.ts
  - node --strip-types scripts/validate-task-import.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the parser-boundary helper, wrapper, fixture, and focused regression; do not change CID family numbering.
completed_at: "2026-07-19T17:56:22.079Z"
completed_by_agent: "codex-main"
closedAt: "2026-07-19T17:56:22.079Z"
closedByActor: "codex-main"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T17-56-22-079Z-close-e96f688cac35"
lastTransitionAt: "2026-07-19T17:56:22.079Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6894b24ca618039edb14304460239b6b8b1b22da"
---

# TASK-TMP-0003 Temporary carrier for ATM-GOV-0204 canonical task import boundary repair

## Intent

Carry the implementation delivery for ATM-GOV-0204 without violating its dependency gate on ATM-GOV-0203.

This TMP card exists only because the parser defect blocks safe import/dry-run dogfood and the owner explicitly ruled that emergency implementation carriers must use TMP rather than CID. It must leave the CID family clean so the next CID task can still open as TASK-CID-0121.

## Required Work

- Restore the task import parser fix that rejects numeric-prefix task id fragments.
- Keep the fix generic; do not hard-code ATM-GOV-018, the 2.0 plan path, or one false-positive string.
- Add focused regression coverage for complete ids, numeric ranges, invalid suffixes, and reference-only plan fragments.
- Validate the 2.0 plan dry-run no longer imports fake ATM-GOV-018.
- Record that ATM-GOV-0204 itself remains dependency-gated until ATM-GOV-0203 is normally closed.

## Acceptance

- [ ] Focused canonical-boundary regression passes.
- [ ] `scripts/validate-task-import.ts` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run validate:cli` passes.
- [ ] 2.0 plan dry-run parses real task ids and excludes fake `ATM-GOV-018`.
- [ ] No tracked or dirty `TASK-CID-0121` artifact is introduced.
