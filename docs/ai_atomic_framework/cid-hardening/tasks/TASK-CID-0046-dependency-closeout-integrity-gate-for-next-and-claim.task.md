---
doc_id: doc_cid_0046
task_id: TASK-CID-0046
title: "Dependency closeout integrity gate for next/claim and manual-done residue"
status: done
started_at: "2026-06-12T17:50:44+08:00"
completed_at: "2026-06-12T18:08:00+08:00"
started_by_agent: "007"
owner: atm-core
priority: P0
milestone: M5
depends_on:
  - "TASK-CID-0040"
  - "TASK-CID-0041"
  - "TASK-CID-0042"
  - "TASK-CID-0043"
related_plan: docs/ai_atomic_framework/cid-hardening/agr-conflict-arbitration-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the dependency hardening if it incorrectly blocks honest tasks that already have governed closeout provenance."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-dependency-closeout-gate-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Repairing historical broken task ledgers by hand"
  - "Re-implementing TASK-CID-0040 / 0042 / 0043 feature logic"
nonGoals:
  - "Do not treat plain status=done or verified as sufficient dependency proof when governed closeout provenance is missing."
---

# TASK-CID-0046 - Dependency closeout integrity gate for next/claim and manual-done residue

## Goal

Harden ATM so downstream `next --claim` and `tasks claim` cannot proceed when an upstream dependency only looks done on paper but does not have valid governed closeout provenance.

## Context

We observed a real failure mode during CID AGR parallel execution:

- downstream work was allowed to claim and finish while an upstream dependency had not completed truthful ATM closeout;
- the current dependency gate only checks whether the dependency task status string is `done` or `verified`;
- later hooks and residue diagnostics can still notice manual-done or incomplete-closeout signals, but by then the downstream route has already been admitted.

This card fixes the admission gate, not the historical residue itself.

## Acceptance Criteria

- `node atm.mjs next --claim ...` must block when any declared dependency is `done` / `verified` but lacks valid governed closeout provenance.
- `node atm.mjs tasks claim ...` must enforce the same dependency eligibility rule.
- Eligibility must require more than a status string. At minimum, the implementation must verify a trustworthy closeout signal such as a valid local closure packet, a real close transition, or equivalent governed closure metadata that the codebase already treats as authoritative.
- A dependency with manual-done residue, missing closure packet, missing close transition, or otherwise incomplete closeout must be reported as blocked instead of silently treated as complete.
- The blocking error must identify the exact dependency task id and provide an operator command such as `node atm.mjs tasks status --task <id> --json` or `node atm.mjs tasks finalize diagnose --task <id> --json`.
- CLI regression coverage must prove the previously observed bypass can no longer happen.

## Suggested Implementation Focus

- Reuse or extract the existing closeout-truth helpers instead of inventing a second definition of "done enough to unlock dependencies".
- Align `next.ts` and `tasks.ts` so they use the same dependency eligibility contract.
- Keep hook-level advisory checks, but move the critical safety decision earlier to admission time.

## Notes

- This is a guardrail hardening card for ATM itself.
- The intended outcome is fail-closed admission, even if historical task ledgers contain stale or human-edited `done` states.
