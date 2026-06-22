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
  ownerAtomOrMap: "atm.broker.classify-explicit-mutation-request"
proposalAdmission:
  trigger: same-file-overlap-risk
  summarySubmitted: true
  boundedRegions:
    - filePath: "packages/cli/src/commands/broker.ts"
      lineStart: 841
      lineEnd: 878
  notes: "BLOCK-B intentionally collides with BLOCK-A on the same owner atom and the same bounded region so the broker must stop the second writer before any live mutation."
outOfScope:
  - "packages/cli/src/commands/broker.ts outside lines 841-878"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not move to a disjoint region or a different owner atom."
---
# TASK-PAPER-HOTFILE-BLOCK-B

## Goal

Create the overlap block lane B patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- shared blocked bounded region only
- same bounded region as BLOCK-A
- exactly lines 841-878 inside `classifyExplicitMutationRequest`

## Why this exists

This task exists to produce the paper hot-file negative trace:
`proposal-submitted -> blocked-before-write`.

## Acceptance Criteria

- patch remains inside the blocked bounded region
- broker should classify the pair as blocked-before-write
- same-owner overlap should be eligible for a split suggestion instead of composer routing
