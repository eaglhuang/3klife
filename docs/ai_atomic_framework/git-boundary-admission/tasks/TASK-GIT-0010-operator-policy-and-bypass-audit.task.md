---
task_id: TASK-GIT-0010
title: Operator policy and bypass audit
status: done
milestone: G3
depends_on:
  - TASK-GIT-0005
  - TASK-GIT-0009
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
completed_at: 2026-06-23T06:46:31.991Z
scopePaths:
  - "docs/governance/**"
  - "packages/cli/src/commands/git.ts"
  - "packages/core/src/git/**"
  - "tests/cli/**"
deliverables:
  - "Policy for `--no-verify`, manual bypass, and protected branches."
  - "Audit record for hook bypass or disabled hook state where detectable."
  - "Operator-facing guidance for emergency push situations."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No attempt to make Git hooks tamper-proof."
nonGoals:
  - "No centralized server-side enforcement in this card."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-policy"
  mapUpdates: []
---

# TASK-GIT-0010

## Goal

Define realistic operator policy for bypass and emergency paths.

## Acceptance

- Documentation explicitly states that local hooks can be bypassed.
- CLI can report hook missing/disabled state when asked to verify.
- Emergency push policy preserves manual authority while recording risk.
- Protected-branch/server-side enforcement is named as future deployment policy, not MVP behavior.
