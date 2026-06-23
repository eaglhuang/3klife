---
task_id: TASK-GIT-0009
title: Post-push-fail fallback
status: planned
milestone: G3
depends_on:
  - TASK-GIT-0004
  - TASK-GIT-0006
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/git.ts"
  - "packages/core/src/git/**"
  - "docs/governance/**"
  - "tests/cli/**"
deliverables:
  - "Fallback command for non-fast-forward or rejected push cases."
  - "Guidance that reruns Git-boundary admission after push rejection."
  - "Evidence that distinguishes pre-push block from post-push recovery."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No remote mutation."
nonGoals:
  - "No automatic push retry."
atomizationImpact:
  ownerAtomOrMap: "atm.git-push-fail-fallback"
  mapUpdates: []
---

# TASK-GIT-0009

## Goal

Provide a safe recovery lane when a push fails because the remote branch moved after local admission.

## Acceptance

- Command detects likely non-fast-forward or remote-changed conditions.
- Command fetches and reruns the same admission comparison.
- Output explains whether the operator should rebase, steward-apply, or retry after no-op.
- Evidence records that this was post-push-fail recovery, not the primary pre-push hook.

