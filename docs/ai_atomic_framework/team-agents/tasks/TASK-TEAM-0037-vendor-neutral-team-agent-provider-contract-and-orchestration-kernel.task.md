---
doc_id: doc_team_0037
task_id: TASK-TEAM-0037
title: "Vendor-neutral Team agent provider contract and orchestration kernel"
status: done
owner: atm-core
priority: P0
milestone: M8I
depends_on:
  - "TASK-TEAM-0031"
  - "TASK-TEAM-0032"
  - "TASK-TEAM-0033"
  - "TASK-TEAM-0034"
  - "TASK-TEAM-0035"
  - "TASK-TEAM-0036"
related_plan: "docs/ai_atomic_framework/team-agents/ATM 多廠商 Agent Runtime 與 Integration 藍圖.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/provider-registry.ts"
  - "packages/core/src/team-runtime/execution-orchestrator.ts"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/provider-registry.ts"
  - "packages/core/src/team-runtime/execution-orchestrator.ts"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case vendor-neutral-runtime-contract"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the provider contract, registry, orchestration kernel, and validator coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Vendor-specific SDK bridge implementation"
  - "Adopter repo secret values"
  - "Direct worker git write or self-close authority"
nonGoals:
  - "Do not hard-code any one vendor into the Team runtime core"
  - "Do not bypass broker or permission lease enforcement"
completed_at: "2026-06-20T15:50:06.742Z"
completed_by_agent: "codex-gpt-5.4-mini"
delivery_commit: "86b51db32d9078b3d941d450d617096b2d088961"
---
# TASK-TEAM-0037 Vendor-neutral Team agent provider contract and orchestration kernel

## Goal

Create the vendor-neutral Team runtime contract and orchestration kernel that all future provider bridges must use.

## Why

Without a shared provider contract, every SDK integration would invent its own session, permission, artifact, and retry semantics, making the Team runtime impossible to govern consistently.

## Implementation Contract

- Define provider, session, step-result, artifact, and orchestrator interfaces.
- Keep provider selection metadata vendor-neutral.
- Make the orchestration kernel responsible for session lifecycle, retries, cancellation, and role dispatch coordination.

## Acceptance Criteria

- Team runtime core can register multiple providers without vendor-specific conditionals leaking into role orchestration.
- Provider metadata is sufficient to support OpenAI, Azure OpenAI, Claude Code, Gemini, and Microsoft Foundry without changing the core interface shape.
- Worker authority boundaries remain coordinator-owned.

## Notes

2026-06-19 | planned | foundation card for the multi-vendor Team runtime lane opened from the integration blueprint.
