---
doc_id: doc_arxiv_close_orch_a
task_id: TASK-COLLIDE-CLOSE-ORCH-A
title: "close-orchestration positive collision lane A"
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
  notes: "Revert the close-orchestration positive lane A patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.task-closure-map"
outOfScope:
  - "packages/cli/src/commands/taskflow/close-orchestration.ts outside buildClosebackPlan"
  - "release/atm-root-drop/**"
  - "packages/cli/src/commands/integration.ts"
nonGoals:
  - "Do not touch resolveClosebackPlanningPath"
  - "Do not edit unrelated taskflow helpers"
---
# TASK-COLLIDE-CLOSE-ORCH-A

## Goal

Create the positive same-file collision lane A patch for
`close-orchestration.ts`, constrained to `buildClosebackPlan`.

## Allowed edit surface

- `buildClosebackPlan` only
- operator-facing metadata, diagnostics wording, or governance-plan shaping
- no edits outside lines roughly 186-327 unless the function shifts slightly

## Why this exists

This task is one half of the primary layered positive case for the paper:
same file, different function, broker should admit parallel-safe work.

## Acceptance Criteria

- Patch remains confined to `buildClosebackPlan`
- Patch is small, reviewable, and semantically valid
- Patch can be combined with lane B without touching the same virtual atom
