---
doc_id: doc_paper_hotfile_pos_b
task_id: TASK-PAPER-HOTFILE-POS-B
title: "paper hotfile positive lane B"
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
  notes: "Revert the paper hotfile POS-B patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.parse-broker-args"
proposalAdmission:
  trigger: same-file-overlap-risk
  summarySubmitted: true
  boundedRegions:
    - filePath: "packages/cli/src/commands/broker.ts"
      lineStart: 989
      lineEnd: 1142
  notes: "POS-B claims the parseBrokerArgs bounded region so the broker can compare disjoint proposals on the same hot file."
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the assigned bounded region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not touch the POS-A bounded region."
---
# TASK-PAPER-HOTFILE-POS-B

## Goal

Create the positive same-file hot-file lane B patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- bounded region B only
- same file as lane A
- disjoint from POS-A bounded region

## Why this exists

This task is the other half of the paper hot-file positive case:
`provisional-write-lease -> composer-routed -> applied`.

## Acceptance Criteria

- patch remains inside the lane B bounded region
- patch is compatible with POS-A on the same file
- broker should reach proposal-first same-file rearbitration and route the pair to composer/steward rather than blocked-cid-conflict
