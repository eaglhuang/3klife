---
doc_id: doc_paper_hotfile_park_b
task_id: TASK-PAPER-HOTFILE-PARK-B
title: "paper hotfile parked-first-writer lane B"
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
  notes: "Revert the paper hotfile PARK-B patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.governed-writer-handoff"
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the explicit rearbitration request region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not downgrade this case into a simple overlap block."
---
# TASK-PAPER-HOTFILE-PARK-B

## Goal

Create the parked-first-writer lane B joiner for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- explicit rearbitration request region only
- same file as PARK-A
- provide more explicit bounded-region detail than PARK-A

## Why this exists

This task exists to force the rearbitration trace:
`proposal-submitted -> parked-for-rearbitration`.

## Acceptance Criteria

- patch remains inside the PARK-B bounded region
- late joiner should trigger parked-for-rearbitration instead of direct apply
