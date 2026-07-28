---
doc_id: doc_team_0040
task_id: TASK-TEAM-0040
title: "Cross-vendor observability and query log"
status: done
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
  - "packages/core/src/team-runtime/observability.ts"
  - "schemas/governance/team-agent-observability-event.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/observability.ts"
  - "schemas/governance/team-agent-observability-event.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case cross-vendor-observability"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert observability contract, schema, query log hooks, and validator coverage together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "External SIEM export pipelines"
  - "Provider-specific tracing UIs"
nonGoals:
  - "Do not let each vendor invent a separate event model"
  - "Do not log raw secrets"
completed_at: "2026-07-10T06:02:32.474Z"
completed_by_agent: "codex-captain-m8e"
closedAt: "2026-07-10T06:02:32.474Z"
closedByActor: "codex-captain-m8e"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T06-02-32-363Z-close-3fdde9bbec9f"
lastTransitionAt: "2026-07-10T06:02:32.474Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6a64b8a928626fbcca19b183cd97229f75901172"
---
# TASK-TEAM-0040 Cross-vendor observability and query log

## Goal

Create one shared observability event model and query surface for Team workers across every vendor and execution mode.

## Why

If OpenAI, Claude Code, Gemini, and Foundry each emit incompatible logs, Team runtime incidents become impossible to debug and compare.

## Acceptance Criteria

- Team runtime emits one event schema for session start, step execution, tool invocation, artifact output, and completion/failure.
- Operators can query by task, team run, provider, role, and artifact.
- Event logging preserves governance evidence boundaries and redaction policy.

## Notes

2026-06-19 | planned | observability lane opened as a first-class runtime contract, not a provider-specific afterthought.
