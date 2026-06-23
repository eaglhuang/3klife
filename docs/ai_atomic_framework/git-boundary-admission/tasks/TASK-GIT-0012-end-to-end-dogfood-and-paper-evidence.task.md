---
task_id: TASK-GIT-0012
title: End-to-end dogfood and paper evidence
status: planned
milestone: G4
depends_on:
  - TASK-GIT-0008
  - TASK-GIT-0011
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/governance/**"
  - "scripts/**"
  - "tests/**"
  - ".atm/history/evidence/**"
deliverables:
  - "End-to-end dogfood run for Git-boundary admission."
  - "Paper-ready evidence archive for allow/block/composer outcomes."
  - "Final acceptance report with limitations."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No fabricated live collision claims."
  - "No paper claim without artifact paths."
nonGoals:
  - "No benchmark comparison against unrelated tools."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-dogfood-evidence"
  mapUpdates: []
---

# TASK-GIT-0012

## Goal

Produce the final dogfood and paper evidence for the GIT series.

## Acceptance

- Evidence archive contains at least one allow run, one blocked run, and one composer-routed run.
- Each run lists base commit, local actor, remote virtual actor, target files, lane, verdict, and artifact paths.
- Report clearly distinguishes deterministic fixtures from live Git-boundary dogfood.
- Final write-up states limitations: local hook bypass, no server-side enforcement in MVP, and conservative fallback for unsupported file types.

