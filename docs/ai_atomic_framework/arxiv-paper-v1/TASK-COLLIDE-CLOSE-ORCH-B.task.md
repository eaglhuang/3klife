---
doc_id: doc_arxiv_close_orch_b
task_id: TASK-COLLIDE-CLOSE-ORCH-B
title: "close-orchestration positive collision lane B"
status: planned
owner: paper-evidence
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
deliverables:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the close-orchestration positive lane B patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.closeback-route-correctness-map"
outOfScope:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts outside resolveClosebackPlanningPath"
  - "release/atm-root-drop/**"
  - "packages/cli/src/commands/integration.ts"
nonGoals:
  - "Do not touch buildClosebackPlan"
  - "Do not edit unrelated planning helpers"
---
# TASK-COLLIDE-CLOSE-ORCH-B

## Goal

Create the positive same-file collision lane B patch for
`close-orchestration.ts`, constrained to `resolveClosebackPlanningPath`.

## Allowed edit surface

- `resolveClosebackPlanningPath` only
- recovery diagnostics, fallback messages, or path-resolution clarity
- no edits outside lines roughly 472-618 unless the function shifts slightly

## Why this exists

This task is the other half of the primary layered positive case for the paper:
same file, different function, broker should admit parallel-safe work.

## Acceptance Criteria

- Patch remains confined to `resolveClosebackPlanningPath`
- Patch is small, reviewable, and semantically valid
- Patch can be combined with lane A without touching the same virtual atom
