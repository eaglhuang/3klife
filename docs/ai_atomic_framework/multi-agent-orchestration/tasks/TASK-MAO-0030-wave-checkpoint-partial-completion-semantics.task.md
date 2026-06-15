---
task_id: TASK-MAO-0030
doc_id: doc_mao_0030
title: "Wave checkpoint partial-completion semantics"
status: planned
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0029"
  - "TASK-MAO-0027"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/team-wave.ts"
  - "packages/core/src/broker/team-wave-checkpoint.ts"
  - "packages/core/src/broker/__tests__/team-wave-checkpoint.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/team-wave-checkpoint.ts"
  - "packages/core/src/broker/__tests__/team-wave-checkpoint.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/team-wave-checkpoint.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert wave checkpoint helpers, CLI integration, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-checkpoint-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Replacing batch checkpoint"
  - "Closing later tasks without per-task evidence"
nonGoals:
  - "Do not bulk-close every wave task just because the wave validator passed."
---

# TASK-MAO-0030 - Wave checkpoint partial-completion semantics

## Goal

Define how a wave can finish partially while preserving per-task lifecycle correctness.

## Implementation Contract

- Distinguish `done`, `partial`, `blocked`, `not-started`, and `needs-review`.
- Allow wave checkpoint to prepare batch checkpoint inputs only for done tasks.
- Keep partial tasks in the queue with updated diagnostics.
- Prevent direct close of later tasks outside checkpoint rules.

## Acceptance Criteria

- A mixed wave can close completed tasks without pretending blocked tasks are done.
- Failed validators block only the affected task slices when evidence supports that split.
- If split is ambiguous, the entire wave requires steward review.
