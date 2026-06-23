---
task_id: TASK-GIT-0001
title: Pre-push admission architecture contract
status: planned
milestone: G0
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/governance/**"
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/**"
deliverables:
  - "A design contract for Git-boundary admission."
  - "A command contract for pre-push evaluation."
  - "A decision matrix for allow/block/composer/steward outcomes."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No source implementation beyond small contract scaffolding."
  - "No hook installation."
nonGoals:
  - "No every-commit mandatory gate."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-admission-contract"
  mapUpdates: []
---

# TASK-GIT-0001

## Goal

Lock the architecture for ATM Git-boundary admission before implementation starts.

The design must define `base`, `local`, and `remote` deltas, the virtual remote actor, verdict mapping, default no-auto-commit behavior, and how this lane reuses existing broker/composer/steward primitives.

## Acceptance

- Contract states why the MVP gates at pre-push rather than every commit.
- Contract defines the virtual actor format `virtual:git-remote@<sha>`.
- Contract defines exit codes and JSON fields for allow, block, composer-routed, and internal-error outcomes.
- Contract names the evidence path and confirms no broker envelope schema change is required for MVP.

