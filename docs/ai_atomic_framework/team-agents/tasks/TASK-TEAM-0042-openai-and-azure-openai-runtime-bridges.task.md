---
doc_id: doc_team_0042
task_id: TASK-TEAM-0042
title: "OpenAI and Azure OpenAI runtime bridges"
status: done
owner: atm-core
priority: P0
milestone: M9I
depends_on:
  - "TASK-TEAM-0037"
  - "TASK-TEAM-0038"
  - "TASK-TEAM-0041"
related_plan: "docs/ai_atomic_framework/team-agents/ATM 多廠商 Agent Runtime 與 Integration 藍圖.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "packages/core/src/team-runtime/providers/azure-openai.ts"
  - "packages/cli/src/commands/team.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "packages/core/src/team-runtime/providers/azure-openai.ts"
  - "packages/cli/src/commands/team.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case openai-azure-openai-bridges"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert OpenAI and Azure OpenAI provider bridges, docs, and validator coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Microsoft Foundry hosted-agent references"
  - "Claude Code editor bridge"
  - "Gemini execution bridge"
nonGoals:
  - "Do not assume Azure OpenAI config is identical to OpenAI config"
  - "Do not skip permission or observability enforcement for direct providers"
completed_at: "2026-07-10T07:10:18.565Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-10T07:10:18.565Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T07-10-18-479Z-close-515996e49dfc"
lastTransitionAt: "2026-07-10T07:10:18.565Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e540beb98184008657ea9ab6110237dd98080c02"
---
# TASK-TEAM-0042 OpenAI and Azure OpenAI runtime bridges

## Goal

Implement the first direct provider bridges for OpenAI and Azure OpenAI under the shared Team runtime contract.

## Why

These two bridges provide the shortest path to a practical multi-vendor Team runtime while exercising both plain provider config and Azure-specific endpoint/deployment rules.

## Acceptance Criteria

- Team runtime can launch OpenAI-backed and Azure OpenAI-backed real-agent runs through one shared provider interface.
- Azure-specific endpoint, deployment, and auth fields are validated separately from plain OpenAI config.
- Both bridges emit the same artifact and observability envelope shape.

## Notes

2026-06-19 | planned | first direct-provider implementation lane opened for OpenAI-family runtimes.
