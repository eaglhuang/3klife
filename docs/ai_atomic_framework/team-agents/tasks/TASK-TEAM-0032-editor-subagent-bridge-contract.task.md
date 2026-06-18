---
doc_id: doc_team_0032
task_id: TASK-TEAM-0032
title: "Editor subagent bridge contract"
status: done
owner: atm-core
priority: P1
milestone: M5R
depends_on:
  - "TASK-TEAM-0031"
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
  - "node --strip-types scripts/validate-team-agents.ts --case editor-subagent-bridge"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert editor bridge contract, role-envelope serialization, and validator coverage."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Editor-specific UI implementation"
  - "Auto-installing plugins or editor extensions"
  - "Replacing ATM governance with editor-native policy"
nonGoals:
  - "Do not make the editor the lifecycle owner"
  - "Do not skip lease or evidence rules for editor mode"
completed_at: "2026-06-18T17:23:41.156Z"
completed_by_agent: "codex-gpt-5.4-mini"
delivery_commit: "056181bf4b3a692f4c6d50daa899d6673fdf1d1b"
---
# TASK-TEAM-0032 Editor subagent bridge contract

## Goal

Define how Team roles can execute through editor-native subagents while still obeying ATM runtime, lease, artifact, and evidence contracts.

## Why

Some adopters will want to use Codex, Claude Code, Cursor, Gemini, or Antigravity subagents as the execution surface instead of a standalone worker process. That should be allowed without making the editor the governance authority.

## Implementation Contract

- Define an editor-subagent role envelope that carries role, scope, lease, artifact, and retry metadata.
- Keep the bridge contract neutral across supported editors.
- Preserve ATM as the lifecycle owner for claim, close, evidence, and route state.

## Acceptance Criteria

- Team runtime can represent editor-subagent execution without losing role, lease, or artifact information.
- Editor-subagent mode still respects task `allowedFiles`.
- The bridge can be disabled per run without changing Team governance semantics.

## Notes

This card defines the bridge contract only. It does not yet ship a full editor-specific implementation.
