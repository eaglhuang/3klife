---
doc_id: doc_paper_hotfile_park_a
task_id: TASK-PAPER-HOTFILE-PARK-A
title: "paper hotfile parked-first-writer lane A"
status: planned
owner: paper-evidence
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/broker.ts"
deliverables:
  - "packages/cli/src/commands/broker.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the paper hotfile PARK-A patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.governed-writer-handoff"
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the provisional writer region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not provide fully precise bounded-region detail on first registration."
---
# TASK-PAPER-HOTFILE-PARK-A

## Goal

Create the parked-first-writer lane A setup for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- provisional writer region only
- first writer enters with incomplete bounded-region detail

## Why this exists

This task exists to produce the paper hot-file rearbitration trace:
`proposal-submitted -> parked-for-rearbitration`.

## Acceptance Criteria

- first writer enters proposal-first mode
- bounded-region detail is intentionally incomplete
- late joiner should be able to force parked-for-rearbitration
