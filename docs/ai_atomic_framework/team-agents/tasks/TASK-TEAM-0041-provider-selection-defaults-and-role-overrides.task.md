---
doc_id: doc_team_0041
task_id: TASK-TEAM-0041
title: "Provider selection defaults and role overrides"
status: planned
owner: atm-core
priority: P0
milestone: M8I
depends_on:
  - "TASK-TEAM-0037"
  - "TASK-TEAM-0038"
  - "TASK-TEAM-0039"
related_plan: "docs/ai_atomic_framework/team-agents/ATM 多廠商 Agent Runtime 與 Integration 藍圖.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case provider-selection-overrides"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert provider-selection defaults, role override parsing, and validator coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Automatic cost optimization heuristics"
  - "Multi-provider self-routing without an explicit policy"
nonGoals:
  - "Do not force all Team roles onto the same provider"
  - "Do not remove a simple repo default path"
---
# TASK-TEAM-0041 Provider selection defaults and role overrides

## Goal

Let Team runs choose a repo default provider while still allowing role-level overrides for implementer, reviewer, validator, planner, or other roles.

## Why

Mixed-vendor execution is a feature, but it must remain deterministic and debuggable. A clear selection policy is the difference between useful flexibility and runtime chaos.

## Acceptance Criteria

- Repo-level defaults can be declared once.
- Individual roles can override provider, SDK, model, and runtime mode.
- Selection decisions are recorded in the runtime contract and observability output.

## Notes

2026-06-19 | planned | provider-selection lane opened to support mixed-vendor role assignments with deterministic fallback.
