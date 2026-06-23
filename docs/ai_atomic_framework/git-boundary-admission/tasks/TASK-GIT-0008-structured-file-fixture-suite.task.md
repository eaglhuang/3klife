---
task_id: TASK-GIT-0008
title: Structured file fixture suite
status: planned
milestone: G3
depends_on:
  - TASK-GIT-0007
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "tests/**"
  - "scripts/**"
  - "fixtures/**"
  - "packages/core/src/git/**"
deliverables:
  - "Fixture suite for allow, block, composer-routed, and fallback cases."
  - "Structured JSON and atom-map fixtures."
  - "Regression command added to validate the Git-boundary lane."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No live remote service dependency in deterministic fixtures."
nonGoals:
  - "No benchmark claims without archived evidence."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-fixtures"
  mapUpdates: []
---

# TASK-GIT-0008

## Goal

Prove the Git-boundary admission path with deterministic fixtures before relying on live pushes.

## Acceptance

- At least one allow case where local and remote touch disjoint files.
- At least one same-file structured mergeable case routed through composer.
- At least one same-file overlapping case blocked before push.
- At least one unknown-file fallback case using conservative text ranges.
- Fixture output writes evidence records that the report generator can index.

