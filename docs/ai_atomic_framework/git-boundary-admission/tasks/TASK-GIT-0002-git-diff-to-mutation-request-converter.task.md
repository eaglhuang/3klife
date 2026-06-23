---
task_id: TASK-GIT-0002
title: Git diff to mutation request converter
status: done
milestone: G1
depends_on:
  - TASK-GIT-0001
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
completed_at: 2026-06-23T04:46:06.443Z
scopePaths:
  - "packages/core/src/git/**"
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/git.ts"
  - "tests/**"
deliverables:
  - "Git topology resolver for fetch, merge-base, local delta, and remote delta."
  - "Mutation request builder for local and remote branch diffs."
  - "Unit tests for no-remote-change, local-only, remote-only, and divergent branches."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No hook installer."
  - "No steward apply."
nonGoals:
  - "No full Git rebase engine."
atomizationImpact:
  ownerAtomOrMap: "atm.git-diff-mutation-request"
  mapUpdates: []
---

# TASK-GIT-0002

## Goal

Implement the converter that turns Git branch deltas into ATM mutation requests.

## Acceptance

- Computes `merge-base HEAD origin/<branch>` after a safe fetch/read step.
- Builds one local mutation request from `base..HEAD`.
- Builds one remote mutation request from `base..origin/<branch>`.
- Uses actor id `virtual:git-remote@<sha>` for the remote side.
- Preserves target files, added/deleted/modified state, and raw diff metadata.
