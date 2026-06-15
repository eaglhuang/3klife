---
task_id: TASK-MAO-0034
doc_id: doc_mao_0034
title: "Operator docs and migration guide for Team Agents Wave Mode"
status: planned
owner: atm-core
priority: P1
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0033"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "docs/TEAM_AGENTS_WAVE_MODE.md"
  - "docs/AGENT_PACK_ONBOARDING.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/TEAM_AGENTS_WAVE_MODE.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert operator docs and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-operator-docs-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing public install flow behavior"
  - "Documenting unimplemented external agent spawning as available"
nonGoals:
  - "Do not tell users to bypass batch checkpoint."
  - "Do not modify benchmark scripts, fixtures, or evidence validation output."
---

# TASK-MAO-0034 - Operator docs and migration guide for Team Agents Wave Mode

## Goal

Document when and how operators should use Team Agents Wave Mode.

## Implementation Contract

- Explain the difference between normal single-task flow, batch queue-head flow, Team Agents advisory mode, and Team Agents Wave Mode.
- Include safe and unsafe examples.
- Document coordinator-only lifecycle, broker admission, worker reports, validators, evidence slicing, and checkpoint.
- Keep public docs English-only and repository-neutral.

## Implementation Scope Guard
- This task only updates operator-facing docs and onboarding guides; it must not touch benchmark fixtures, scripts, or evidence test outputs.

## Acceptance Criteria

- Operators can tell when a set of tasks is eligible for wave execution.
- Docs state that Team Agents Wave Mode is not a shortcut around task closeout.
- Docs include recovery advice for partial waves and blocked worker reports.


