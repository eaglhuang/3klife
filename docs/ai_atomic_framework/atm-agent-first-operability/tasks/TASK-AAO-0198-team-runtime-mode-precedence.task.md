---
task_id: TASK-AAO-0198
title: "Honor CLI --runtime-mode over repo-default broker-only"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-11-094
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/cli/src/commands/team/__tests__/team-runtime-precedence.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/cli/src/commands/team/__tests__/team-runtime-precedence.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/team/__tests__/team-runtime-precedence.spec.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert runtime-mode precedence if repo-default broker-only selection regresses for unset CLI flags."
atomizationImpact:
  ownerAtomOrMap: "atm.team-runtime-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "release/**"
  - "Changing broker-only default policy for repos without explicit CLI overrides"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-14T01:23:40.587Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T01:23:40.587Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T01-23-40-587Z-close-4c6a0187697c"
lastTransitionAt: "2026-07-14T01:23:40.587Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c7e3e81a11188c786dce62e0a95e586af0b61421"
---

# TASK-AAO-0198 Honor CLI --runtime-mode over repo-default broker-only

## Problem

`ATM-BUG-2026-07-11-094`: A global `--runtime-mode real-agent` is ignored for the
Coordinator because `buildTeamRuntimeContract` resolves the merged selection
config first; the implicit repo default has `runtimeMode: broker-only`, so a
CLI-requested paid run silently becomes broker-only.

## Goal

- Explicit global CLI runtime/provider/model options override implicit defaults.
- Role-specific CLI overrides may then override the global selection for their
  own roles.
- Mark backlog row 094 Fixed; add regression in `team-runtime-precedence.spec.ts`.
