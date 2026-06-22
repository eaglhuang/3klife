---
doc_id: doc_paper_hotfile_block_a
task_id: TASK-PAPER-HOTFILE-BLOCK-A
title: "paper hotfile overlap block lane A"
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
  notes: "Revert the paper hotfile BLOCK-A patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.proposal-overlap-arbitration"
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the shared blocked region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not move to a disjoint region."
---
# TASK-PAPER-HOTFILE-BLOCK-A

## Goal

Create the overlap block lane A patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- shared blocked bounded region only
- same bounded region as BLOCK-B

## Why this exists

This task exists to produce the paper hot-file negative trace:
`proposal-submitted -> blocked-before-write`.

## Acceptance Criteria

- patch remains inside the blocked bounded region
- broker should classify the pair as blocked-before-write
