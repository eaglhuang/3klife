---
doc_id: doc_team_0078
task_id: TASK-TEAM-0078
title: "Atomize next claim admission and queue observability"
status: done
owner: atm-core
priority: P1
milestone: "Team Broker Maintainability"
depends_on:
  - "TASK-TEAM-0079"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/next/broker-queue-admission.ts"
  - "packages/cli/src/commands/next/claim-conflict-log.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "packages/core/src/broker/__tests__/team-lane.test.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "docs/governance/team-agents/broker-shared-surface-coordination.md"
deliverables:
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/next/claim-conflict-log.ts"
  - "packages/cli/src/commands/next/broker-queue-admission.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "docs/governance/team-agents/broker-shared-surface-coordination.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case next-claim-atomization"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the extracted atoms together; preserve current queue admission semantics."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
team:
  required: true
  size: L3
completed_at: "2026-07-12T06:12:14.082Z"
completed_by_agent: "codex-captain"
closedAt: "2026-07-12T06:12:14.082Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T06-12-14-032Z-close-4376592fbcfa"
lastTransitionAt: "2026-07-12T06:12:14.082Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "26fed07b95e0295ff00c2b81af031535546f68db"
---

# TASK-TEAM-0078 Atomize next claim admission and queue observability

## Goal

Extract the CID, queue, direction-lock projection, and observability concerns
from the oversized `next.ts` claim branch into named, independently testable
atoms. Make `team plan`/`team start` consume that same per-file queue projection
so L5 roles may work only on admitted private paths. New or modified Team/Broker
admission modules must stay under 600 lines.

## Acceptance Criteria

- The queue adapter, conflict projection, and structured logging each have a
  single owner module under 600 lines.
- `next.ts` orchestrates atoms rather than embedding queue/CID policy.
- `team plan` and `team start` admit `queued-private-work` with a restricted
  role write scope, reject `queued-blocked`, and never widen a provider or
  implementer lease beyond the canonical queue projection.
- Structured logs explain seven gate result, shared path order, queue position,
  private-path allowance, and block reason without leaking task body content.
- Atom map has one entry for every extracted public admission boundary.
- Regression asserts stable log schema and line budgets for new modules.
