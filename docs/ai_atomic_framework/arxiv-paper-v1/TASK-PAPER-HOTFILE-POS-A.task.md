---
doc_id: doc_paper_hotfile_pos_a
task_id: TASK-PAPER-HOTFILE-POS-A
title: "paper hotfile positive lane A"
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
  notes: "Revert the paper hotfile POS-A patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.classify-explicit-mutation-request"
proposalAdmission:
  trigger: same-file-overlap-risk
  summarySubmitted: true
  boundedRegions:
    - filePath: "packages/cli/src/commands/broker.ts"
      lineStart: 841
      lineEnd: 878
  notes: "POS-A claims the classifyExplicitMutationRequest bounded region so the broker can rearbitrate at proposal scope instead of failing closed on a shared owner atom."
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the assigned bounded region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not touch the POS-B bounded region."
---
# TASK-PAPER-HOTFILE-POS-A

## Goal

Create the positive same-file hot-file lane A patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- bounded region A only
- same file as lane B
- disjoint from POS-B bounded region

## Why this exists

This task is one half of the paper hot-file positive case:
`provisional-write-lease -> composer-routed -> applied`.

## Acceptance Criteria

- patch remains inside the lane A bounded region
- patch is compatible with POS-B on the same file
- broker should reach proposal-first same-file rearbitration and route the pair to composer/steward rather than blocked-cid-conflict
