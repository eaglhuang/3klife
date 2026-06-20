---
doc_id: doc_team_0038
task_id: TASK-TEAM-0038
title: "Permission broker and configurable policy layer"
status: planned
owner: atm-core
priority: P0
milestone: M8I
depends_on:
  - "TASK-TEAM-0037"
related_plan: "docs/ai_atomic_framework/team-agents/ATM 多廠商 Agent Runtime 與 Integration 藍圖.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/permission-broker.ts"
  - "schemas/governance/team-agent-permission-policy.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/permission-broker.ts"
  - "schemas/governance/team-agent-permission-policy.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case provider-permission-broker"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert permission broker logic, schema additions, and validator coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Provider-specific credential storage"
  - "Giving workers direct lifecycle authority"
nonGoals:
  - "Do not couple policy decisions to one SDK implementation"
  - "Do not let provider bridges self-authorize writes"
---
# TASK-TEAM-0038 Permission broker and configurable policy layer

## Goal

Introduce a provider-neutral permission broker so Team workers always run under ATM-managed policy and lease boundaries.

## Why

Multi-vendor execution is only safe if every provider bridge asks one shared policy layer before any write, tool, or network action is attempted.

## Acceptance Criteria

- File, tool, network, and vendor permissions are checked through one broker contract.
- Policy can be configured per adopter repo without changing the framework runtime code.
- Provider bridges cannot grant themselves elevated rights.

## Notes

2026-06-19 | planned | policy lane opened alongside the vendor-neutral runtime kernel.
