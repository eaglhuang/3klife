---
task_id: TASK-GIT-0006
title: Git boundary evidence envelope
status: planned
milestone: G2
depends_on:
  - TASK-GIT-0004
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/core/src/evidence/**"
  - "packages/core/src/git/**"
  - "packages/cli/src/commands/git.ts"
  - "scripts/**"
deliverables:
  - "Evidence record for pre-push admission runs."
  - "Index/report generator integration."
  - "Artifact paths suitable for paper evidence archival."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No broker envelope schema change unless explicitly required by a later card."
nonGoals:
  - "No full paper rewrite."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-evidence"
  mapUpdates: []
---

# TASK-GIT-0006

## Goal

Persist Git-boundary admission decisions as replayable evidence.

## Acceptance

- Evidence includes local actor, remote virtual actor, base commit, local head, remote head, target files, conflict keys, lane, verdict, and recommendation.
- Evidence can be indexed together with existing broker evidence reports.
- Composer-routed and blocked outcomes both keep enough detail for later review.
- Evidence does not require changing `atm.brokerOperationRunRecordEnvelope.v1` in MVP.

