---
task_id: TASK-MAO-0003
title: "route lifecycle CLI"
status: planned
owner: atm-core
priority: P0
milestone: M1
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0002"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/route.ts"
  - "packages/cli/src/commands/index.ts"
  - "packages/cli/src/commands/command-specs/route.spec.ts"
  - "scripts/validate-governance-commands.ts"
  - "tests/cli/route-lifecycle.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/route.ts"
  - "packages/cli/src/commands/index.ts"
  - "packages/cli/src/commands/command-specs/route.spec.ts"
  - "tests/cli/route-lifecycle.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-commands.ts"
  - "node --strip-types tests/cli/route-lifecycle.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove route command registration, command spec, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-route-cli-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Task-scoped next routing"
  - "Broker admission"
  - "Patch envelope apply"
---

# TASK-MAO-0003 - route lifecycle CLI

## Goal

Add a first CLI surface for route lifecycle management: `route open`, `route status`, `route list`, `route pause`, `route resume`, and `route abandon`.

## Implementation Contract

- `route open` creates a route context for a task/actor/intent.
- `route status` prints one route context with route state and blockers.
- `route list` supports filtering by task, actor, state, and claim intent.
- Pause/resume/abandon must update route context without editing task status.
- The command must expose command specs and help examples.

## Acceptance Criteria

- Route lifecycle tests prove open/status/list/pause/resume/abandon.
- Commands return JSON envelopes consistent with existing CLI commands.
- Route commands do not mutate `.atm/history/tasks/**` directly.
- Command spec validation recognizes the new surface.

