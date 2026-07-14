---
task_id: TASK-AAO-0195
title: "Add read-only team plan projection without broker side effects"
started_at: "2026-07-14T00:45:00.000Z"
started_by_agent: "cursor-grok-4.5"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-13-170
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "packages/cli/src/commands/team/__tests__/team-plan-readonly.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "packages/cli/src/commands/team/__tests__/team-plan-readonly.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/team/__tests__/team-plan-readonly.spec.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert read-only team plan projection if start-path broker admission regresses."
atomizationImpact:
  ownerAtomOrMap: "atm.team-plan-map"
  mapUpdates: []
  extractionCandidates:
    - disposition: follow-up-card
      path: packages/cli/src/commands/team.ts
      inlineReason: "Focused flag + actor-resolution change only; full team.ts extraction remains deferred while TASK-RFT-0020 owns git-governance."
outOfScope:
  - "release/**"
  - "packages/cli/src/commands/git-governance.ts"
  - "Changing team start write semantics"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-14T00:52:55.829Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T00:52:55.829Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T00-52-55-829Z-close-e2474623d717"
lastTransitionAt: "2026-07-14T00:52:55.829Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "95fc26a255fb67585b9319835e67b9d7c6f0696b"
---

# TASK-AAO-0195 Add read-only team plan projection without broker side effects

## Problem

`ATM-BUG-2026-07-13-170` (extends 106): `team plan` can fail closed on
proposal-first and still touch broker registry cleanup while the operator only
wants a read-only readiness projection such as `indexLane`. Actor resolution can
also prefer a stale env identity over the active claim actor.

## Goal

- Add `team plan --read-only` (projection mode).
- In read-only mode: do not persist broker registry cleanup; treat
  `proposal-first-required` as advisory warning so diagnostics still return.
- Prefer explicit `--actor`, else active task claim actor, else env identity.
- Mark backlog 170 Fixed; leave start-path fail-closed unchanged.
