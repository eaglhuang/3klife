---
doc_id: doc_team_0031
task_id: TASK-TEAM-0031
title: "Team runtime mode and adapter contract"
status: done
owner: atm-core
priority: P0
milestone: M5R
depends_on:
  - "TASK-TEAM-0011"
  - "TASK-TEAM-0012"
  - "TASK-TEAM-0030"
related_plan: "docs/ai_atomic_framework/team-agents/ATM多語言WorkerAdaptor方案.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case runtime-mode-contract"
  - "node atm.mjs team start --task TASK-TEAM-0031 --runtime-mode broker-only --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert runtime mode parsing, adapter contract wiring, and validator coverage."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Vendor-specific SDK implementation"
  - "Actual editor subagent bridge execution"
  - "Full worker spawn pipeline"
nonGoals:
  - "Do not create a second scheduler"
  - "Do not bind Team Agents to a single editor"
completed_at: "2026-06-18T17:03:33.224Z"
completed_by_agent: "codex-gpt-5.4-mini"
closed_by_agent: "codex-gpt-5.4-mini"
delivery_commit: "08f0ea8e56643b99ee0caafeeda52c288e030e75"
---
# TASK-TEAM-0031 Team runtime mode and adapter contract

## Goal

Define the runtime contract that lets a Team run declare whether it will use `real-agent`, `editor-subagent`, or `broker-only`, and how an adapter is selected for that run.

## Why

ATM needs one neutral execution contract before it can support true workers, editor subagents, or no-agent governance mode without fragmenting Team runtime semantics.

## Implementation Contract

- Extend Team runtime state and CLI contract to record `runtimeMode`, `runtimeLanguage`, `runtimeAdapterId`, `providerId`, `sdkId`, and `modelId`.
- `real-agent`, `editor-subagent`, and `broker-only` must be first-class runtime modes.
- `runtimeLanguage=node` must remain the default when no override is supplied.
- The adapter contract must stay vendor-neutral and editor-neutral.

## Acceptance Criteria

- Team runtime supports the three runtime modes with deterministic parsing and validation.
- Default runtime is Node.js when no language override is provided.
- Adapter metadata is recorded even when broker-only mode disables actual agent spawn.
- CLI and validator output explain which execution surface was selected and why.

## Notes

This card creates the neutral runtime contract that later adapter and rework-loop cards build on.
