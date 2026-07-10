---
doc_id: doc_team_0044
task_id: TASK-TEAM-0044
title: "Microsoft Foundry provider family bridge"
status: done
owner: atm-core
priority: P0
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
  - "packages/core/src/team-runtime/providers/microsoft-foundry.ts"
  - "packages/cli/src/commands/team.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/providers/microsoft-foundry.ts"
  - "packages/cli/src/commands/team.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case microsoft-foundry-bridge"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert Microsoft Foundry provider family bridge, docs, and validator coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Hard-coding a single Foundry deployment shape"
  - "Treating Foundry Agent Service and Foundry chat as one undifferentiated surface"
nonGoals:
  - "Do not collapse service-managed agents and chat inference into one config model"
  - "Do not bypass adopter repo config for project endpoints or agent references"
completed_at: "2026-07-10T07:57:16.584Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-10T07:57:16.584Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T07-57-16-584Z-close-ab740dc99f76"
lastTransitionAt: "2026-07-10T07:57:16.584Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d26ba3ba09146d73b8ad61866ea6e60f78377bd9"
---
# TASK-TEAM-0044 Microsoft Foundry provider family bridge

## Goal

Add Microsoft Foundry as a first-class Team runtime provider family, covering both project-endpoint chat/inference and service-managed agent references where appropriate.

## Why

Foundry is not just another model endpoint. It can act as both an app-owned agent path and a service-managed agent path, so the Team runtime must represent both without losing governance boundaries.

## Acceptance Criteria

- Team runtime can represent Foundry chat/inference and Foundry agent-service references distinctly.
- Foundry-specific project endpoint and agent reference config are validated through the governed-repo config surface.
- Artifact, retry, and observability contracts remain shared with other providers.

## Notes

2026-06-19 | planned | Microsoft Foundry provider-family lane opened as a distinct bridge from plain OpenAI-style direct providers.
