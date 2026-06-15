---
task_id: TASK-MAO-0024
doc_id: doc_mao_0024
title: "Wave candidate planner and DAG grouping"
status: planned
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0023"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-wave.ts"
  - "packages/core/src/broker/"
  - "packages/core/src/broker/__tests__/team-wave-planner.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team-wave.ts"
  - "packages/core/src/broker/__tests__/team-wave-planner.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/core/src/broker/__tests__/team-wave-planner.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert wave planner command surface, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-candidate-planner-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Starting or spawning Team Agents"
  - "Checkpointing wave tasks"
nonGoals:
  - "Do not reorder dependencies to make a wave look safe."
---

# TASK-MAO-0024 - Wave candidate planner and DAG grouping

## Goal

Add a deterministic planner that groups compatible task cards into candidate Team Agents waves.

## Implementation Contract

- Read candidate tasks from the same scoped queue / task family surfaces used by `next`.
- Group by dependency readiness, target repo, closure authority, validator family, and scope shape.
- Mark tasks as `same-wave`, `ordered-within-wave`, `later-wave`, or `blocked`.
- Return reasons for every exclusion.

## Acceptance Criteria

- The planner never includes a task whose dependencies are not satisfied unless it is explicitly ordered behind another same-wave task.
- Different target repos or closure authorities split into separate waves.
- The output is stable for the same task set.
