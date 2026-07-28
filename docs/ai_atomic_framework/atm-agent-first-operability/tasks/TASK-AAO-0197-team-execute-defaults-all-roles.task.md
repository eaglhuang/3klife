---
task_id: TASK-AAO-0197
title: "Apply top-level team execute provider defaults to all roster roles"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-11-105
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/cli/src/commands/team/__tests__/team-execute-defaults.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/cli/src/commands/team/__tests__/team-execute-defaults.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/team/__tests__/team-execute-defaults.spec.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert top-level execute defaults if per-role explicit overrides regress."
atomizationImpact:
  ownerAtomOrMap: "atm.team-execute-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "release/**"
  - "Paid live provider orchestration beyond deterministic selection defaults"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-14T01:22:07.193Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T01:22:07.193Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T01-22-07-104Z-close-b62d158aec6a"
lastTransitionAt: "2026-07-14T01:22:07.193Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c7e3e81a11188c786dce62e0a95e586af0b61421"
---

# TASK-AAO-0197 Apply top-level team execute provider defaults to all roster roles

## Problem

`ATM-BUG-2026-07-11-105`: `team start --execute --provider openai --runtime-mode
real-agent` wrote an active run but executed zero roles unless every L1 role also
received an explicit `--role-provider` override. The command then reported
`ATM_TEAM_EXECUTION_BLOCKED` with `providerExecutionCount: 0`.

## Goal

- Top-level provider, SDK, model, and runtime options become the default role
  selection when role overrides are absent.
- Preflight rejects an empty execution set before writing an active run.
- Mark backlog row 105 Fixed; add regression in `team-execute-defaults.spec.ts`.
