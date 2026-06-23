---
task_id: TASK-GIT-0007
title: Neutral steward Git apply dry-run
status: planned
milestone: G2
depends_on:
  - TASK-GIT-0004
  - TASK-GIT-0006
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/**"
  - "packages/core/src/steward/**"
  - "packages/core/src/git/**"
  - "packages/cli/src/commands/**"
  - "tests/**"
deliverables:
  - "Dry-run steward plan for composer-routed Git-boundary cases."
  - "Optional apply-to-working-tree mode guarded by explicit flag."
  - "Evidence of no auto-commit default."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No auto-commit by default."
  - "No force push."
nonGoals:
  - "No full rebase replacement."
atomizationImpact:
  ownerAtomOrMap: "atm.git-steward-apply"
  mapUpdates: []
---

# TASK-GIT-0007

## Goal

Let ATM produce a neutral steward plan for mergeable local-vs-remote changes and optionally apply it to the working tree under explicit operator control.

## Acceptance

- Dry-run produces a merge plan without changing files.
- Explicit apply mode writes only scoped files and records evidence.
- Apply mode leaves commit creation to the operator.
- Failed apply leaves a recoverable diagnostic and does not continue to push.

