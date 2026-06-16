---
task_id: TASK-MAO-0004
title: "next route and task selector"
status: done
owner: atm-core
priority: P0
milestone: M1
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0002"
  - "TASK-MAO-0003"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-intent.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "tests/cli/next-route-selector.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/task-intent.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "tests/cli/next-route-selector.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "node --strip-types tests/cli/next-route-selector.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert next selector changes and tests; route lifecycle remains available but not integrated with next."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-next-route-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Admission conflict matrix"
  - "Automatic patch envelope generation"
completed_at: "2026-06-16T15:34:14.127Z"
completed_by_agent: "augment-code"
delivery_commit: "7e866ec41"
---

# TASK-MAO-0004 - next route and task selector

## Goal

Allow `atm next` to answer from a specific task route rather than only from global state.

## Implementation Contract

- Add `next --route <routeId>`.
- Add `next --task <taskId> --actor <actorId>` as a convenience selector when a unique route exists.
- If multiple routes exist for the same task/actor, fail with an explicit route selection diagnostic.
- If no route exists, return a required command to open one.
- Route-specific next must still consult the root router and broker state.

## Acceptance Criteria

- A route-specific `next` returns route state, task state, actor, blockers, and required command.
- Global `next` behavior remains unchanged when no route selector is provided.
- Ambiguous route selection fails closed with actionable diagnostics.
- Tests cover no route, unique route, ambiguous route, and blocked route.

