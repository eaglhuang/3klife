---
task_id: TASK-AAO-0196
title: "Fail-closed team start --execute when zero providers run"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-11-095
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team/team-execution-lane.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team/__tests__/team-execute-fail-closed.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/team/team-execution-lane.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team/__tests__/team-execute-fail-closed.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/team/__tests__/team-execute-fail-closed.spec.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert execute fail-closed gate if legitimate state-only team starts regress."
atomizationImpact:
  ownerAtomOrMap: "atm.team-execute-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "release/**"
  - "Changing team plan read-only projection behavior from TASK-AAO-0195"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-14T01:18:00.033Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T01:18:00.033Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T01-17-59-948Z-close-65875a5926b1"
lastTransitionAt: "2026-07-14T01:18:00.033Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c7e3e81a11188c786dce62e0a95e586af0b61421"
---

# TASK-AAO-0196 Fail-closed team start --execute when zero providers run

## Problem

`ATM-BUG-2026-07-11-095`: `team start --execute` can return exit code 0 and
`ATM_TEAM_STARTED` when provider execution is blocked and `providerExecutionCount`
is zero. The success envelope can be mistaken for a completed paid live test.

## Goal

- When `--execute` is requested and zero providers run, fail closed with
  non-success severity before or instead of reporting a completed start.
- Distinguish a state-only Team run from executed provider orchestration in the
  message and envelope.
- Mark backlog row 095 Fixed; add focused regression in
  `team-execute-fail-closed.spec.ts`.
