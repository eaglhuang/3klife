---
doc_id: doc_team_0043
task_id: TASK-TEAM-0043
title: "Claude Code and Gemini execution bridges"
status: done
owner: atm-core
priority: P1
milestone: M9I
depends_on:
  - "TASK-TEAM-0037"
  - "TASK-TEAM-0038"
  - "TASK-TEAM-0039"
  - "TASK-TEAM-0041"
related_plan: "docs/ai_atomic_framework/team-agents/ATM 多廠商 Agent Runtime 與 Integration 藍圖.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/providers/claude-code.ts"
  - "packages/core/src/team-runtime/providers/gemini.ts"
  - "packages/cli/src/commands/team.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/providers/claude-code.ts"
  - "packages/core/src/team-runtime/providers/gemini.ts"
  - "packages/cli/src/commands/team.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case claude-gemini-bridges"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert Claude Code and Gemini bridges, docs, and validator coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Replacing ATM governance with editor-native policy"
  - "Vendor-specific UI or IDE packaging work"
nonGoals:
  - "Do not assume Claude Code and Gemini share the same execution surface"
  - "Do not skip role-envelope normalization for editor-subagent mode"
completed_at: "2026-07-10T07:37:32.854Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-10T07:37:32.854Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T07-37-32-763Z-close-4c1ac22b8d0a"
lastTransitionAt: "2026-07-10T07:37:32.854Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a9c60757dc4b996a8820ecd65078683c5bee2d73"
---
# TASK-TEAM-0043 Claude Code and Gemini execution bridges

## Goal

Add Team runtime bridges for Claude Code and Gemini while preserving the same permission, artifact, retry, and observability contracts as other providers.

## Why

Claude Code and Gemini are likely to arrive through different execution surfaces than direct OpenAI-style providers. They still need to look uniform from the Team runtime's point of view.

## Acceptance Criteria

- Team runtime can map Claude Code and Gemini runs into the shared provider contract.
- Editor-subagent or CLI-style execution envelopes still preserve ATM governance metadata.
- Cross-vendor observability and artifact normalization stay unchanged.

## Notes

2026-06-19 | planned | execution-bridge lane opened for Claude Code and Gemini.
