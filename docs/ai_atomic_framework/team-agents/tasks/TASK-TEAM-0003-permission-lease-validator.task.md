---
task_id: TASK-TEAM-0003
title: permission lease validator
status: planned
owner: atm-core
priority: P0
milestone: M2
depends_on:
  - TASK-TEAM-0001
related_plan: docs/ai_atomic_framework/team-agents/
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/team.ts
deliverables:
  - packages/cli/src/commands/team.ts
validators:
  - npm run typecheck
  - node atm.mjs team validate --task TASK-AAO-0041 --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: []
---

# TASK-TEAM-0003: permission lease validator

## Goal

Validate exclusive permission uniqueness and scoped lease safety before team runtime is written.

## Why

This is part of the second Team Agents phase. The goal is to create a usable prototype without adding hooks, spawning subagents, or changing closure gates.

## Implementation Contract

- Keep the implementation small and CLI-local.
- Do not add pre-tool or pre-commit enforcement in this task.
- Do not spawn any subagent runtime.
- Preserve the Coordinator as the only lifecycle and git owner.

## Deliverables

  - packages/cli/src/commands/team.ts

## Validators

  - npm run typecheck
  - node atm.mjs team validate --task TASK-AAO-0041 --json

## Acceptance Criteria

- The command behavior is machine-readable JSON.
- Permission ownership is explicit and validated.
- Runtime writes, if any, are limited to .atm/runtime/team-runs/**.
- No hook integration is introduced in this phase.

## Rollback

Revert the framework implementation commit for Team Agents phase 2 and rebuild/sync the ATM runner.

## Notes

This card is intentionally short. It exists to keep the second phase testable and reviewable.