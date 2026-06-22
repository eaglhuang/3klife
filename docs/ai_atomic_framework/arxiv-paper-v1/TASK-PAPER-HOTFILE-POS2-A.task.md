---
doc_id: doc_paper_hotfile_pos2_a
task_id: TASK-PAPER-HOTFILE-POS2-A
title: "paper hotfile positive lane A v2"
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
  notes: "Revert the paper hotfile POS2-A patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.classify-explicit-mutation-request"
proposalAdmission:
  trigger: same-file-overlap-risk
  summarySubmitted: true
  boundedRegions:
    - filePath: "packages/cli/src/commands/broker.ts"
      lineStart: 841
      lineEnd: 878
  notes: "POS2-A claims the classifyExplicitMutationRequest bounded region so the broker can rearbitrate at proposal scope instead of failing closed on a shared owner atom."
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the assigned bounded region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not touch the POS2-B bounded region."
---
# TASK-PAPER-HOTFILE-POS2-A

## Goal

Create the positive same-file hot-file lane A patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- bounded region A only
- same file as lane B
- disjoint from POS2-B bounded region

## Why this exists

This task is one half of the paper hot-file positive case:
`provisional-write-lease -> composer-routed -> applied`.

## Acceptance Criteria

- patch remains inside the lane A bounded region
- patch is compatible with POS2-B on the same file
- broker should reach proposal-first same-file rearbitration and route the pair to composer/steward rather than blocked-cid-conflict
