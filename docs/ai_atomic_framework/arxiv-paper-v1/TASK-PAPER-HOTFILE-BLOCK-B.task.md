---
doc_id: doc_paper_hotfile_block_b
task_id: TASK-PAPER-HOTFILE-BLOCK-B
title: "paper hotfile overlap block lane B"
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
  notes: "Revert the paper hotfile BLOCK-B patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.proposal-overlap-arbitration"
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the shared blocked region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not move to a disjoint region."
---
# TASK-PAPER-HOTFILE-BLOCK-B

## Goal

Create the overlap block lane B patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- shared blocked bounded region only
- same bounded region as BLOCK-A

## Why this exists

This task exists to produce the paper hot-file negative trace:
`proposal-submitted -> blocked-before-write`.

## Acceptance Criteria

- patch remains inside the blocked bounded region
- broker should classify the pair as blocked-before-write
