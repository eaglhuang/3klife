---
task_id: TASK-GIT-0004
title: Git admission CLI surface
status: done
milestone: G1
depends_on:
  - TASK-GIT-0002
  - TASK-GIT-0003
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
completed_at: 2026-06-23T05:06:09.030Z
scopePaths:
  - "packages/cli/src/commands/**"
  - "packages/core/src/git/**"
  - "packages/core/src/broker/**"
  - "tests/cli/**"
deliverables:
  - "A CLI command such as `atm git admit` or equivalent."
  - "JSON output for hook and CI consumption."
  - "Human-readable output for operators."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No hook installation in this card."
nonGoals:
  - "No hidden network push."
atomizationImpact:
  ownerAtomOrMap: "atm.git-admission-cli"
  mapUpdates: []
---

# TASK-GIT-0004

## Goal

Expose Git-boundary admission through a stable CLI entry point.

## Acceptance

- Command can run before push without mutating source files by default.
- Command returns distinct outcomes for allow, block, composer-routed, no-op, and internal-error.
- `--json` is stable enough for hooks and evidence collection.
- Operator output names the remote branch, base commit, local commit, remote commit, conflicting files, and recommended next step.
