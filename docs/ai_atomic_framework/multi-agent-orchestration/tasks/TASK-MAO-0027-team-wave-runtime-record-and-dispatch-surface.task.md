---
task_id: TASK-MAO-0027
doc_id: doc_mao_0027
title: "Team wave runtime record and dispatch surface"
status: planned
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0025"
  - "TASK-MAO-0026"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-wave.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team-wave.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert team wave runtime/start/status surface, validator updates, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-runtime-record-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Actually spawning external agents"
  - "Granting worker lifecycle authority"
nonGoals:
  - "Do not make Team Agents mandatory for ordinary single-task work."
---

# TASK-MAO-0027 - Team wave runtime record and dispatch surface

## Goal

Add a Team Agents wave runtime record and CLI surface for plan, validate, start, status, and collect-ready states.

## Implementation Contract

- Extend Team Agents without breaking existing `team plan`, `team validate`, `team start`, and `team status`.
- Wave start writes only managed runtime state.
- Preserve `agentsSpawned: false` unless a future explicit external dispatch capability exists.
- Surface role briefs for planner, writer, validator, reviewer, evidence, and coordinator.

## Acceptance Criteria

- `team wave start` refuses unadmitted waves.
- Runtime state records wave id, tasks, roles, envelope hash, admission verdict, and coordinator.
- Existing single-task Team Agents behavior remains unchanged.
