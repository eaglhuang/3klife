---
doc_id: doc_team_0079
task_id: TASK-TEAM-0079
title: "Queue-aware next claim admission"
status: done
owner: atm-core
priority: P0
milestone: "Team Broker Parallel Delivery"
depends_on:
  - "TASK-TEAM-0076"
related_plan: "docs/ai_atomic_framework/team-agents/CROSS-VENDOR-TEAM-MARKDOWN-HANDOFF-PLAN-2026-07-11.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/next/broker-queue-admission.ts"
  - "packages/core/src/broker/shared-surface-queue.ts"
  - "packages/core/src/broker/freeze.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/__tests__/broker-shared-surface-workflow.test.ts"
  - "scripts/validate-team-agents.ts"
  - "node --strip-types packages/cli/src/commands/__tests__/broker-shared-surface-workflow.test.ts"
  - "docs/governance/team-agents/broker-shared-surface-coordination.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next/broker-queue-admission.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/broker-shared-surface-coordination.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case next-claim-shared-surface-queue"
  - "node --strip-types scripts/validate-team-agents.ts --case broker-shared-surface-queue"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert queue-aware claim adapter and restore existing fail-closed claim behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
team:
  required: true
  size: L5
outOfScope:
  - "Bypassing live lease/CID checks for an unqueued conflict"
  - "Allowing a waiting task to mutate a shared queue path"
completed_at: "2026-07-12T04:44:39.386Z"
completed_by_agent: "Codex-GPT5.6 Terra"
closedAt: "2026-07-12T04:44:39.386Z"
closedByActor: "Codex-GPT5.6 Terra"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T04-44-39-337Z-close-d3e923abcabb"
lastTransitionAt: "2026-07-12T04:44:39.386Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4fe21e1930f62b3f4b635c335f53ec929e1f7a57"
---

# TASK-TEAM-0079 Queue-aware next claim admission

## Goal

Make `next --claim` consume the canonical Broker shared-surface queue created
by TASK-TEAM-0076. A task waiting on a shared path must be admitted only for
its private paths and receive a precise per-file queue explanation; it must
not be globally frozen by a broad CID overlap.

## Acceptance Criteria

- `next --claim` reads the canonical queue document and derives its decision
  from the same seven-layer Broker state used by Broker and Team status.
- Queue head may claim its shared path. A non-head task may claim only when it
  has safe private paths; its direction lock excludes queued shared paths.
- A task with no private safe path remains blocked with queue head, surface,
  position, release condition, and a copyable next-safe command.
- Missing, malformed, stale, base-hash-mismatched, or lease-fenced queue state
  fails closed with canonical Broker vocabulary.
- Claim evidence includes structured `brokerQueueAdmission` fields and a
  concise event explaining ordering; no raw task content is copied into logs.
- Deterministic regression proves the TASK-AAO-0158 shape: overlap on backlog
  and atom map queues by file while a disjoint implementation path remains
  claimable; the waiter cannot write either queued path.
- `ATM-BUG-2026-07-12-116` is closed only after the real `next --claim`
  dogfood shows the queue-aware response.

## Transaction Workflow Regression Matrix

| Case | Expected result |
| --- | --- |
| Disjoint transactions | No queue and no freeze; both paths remain parallel. |
| One overlapping file plus private files | Waiter is queued only for the shared file and keeps its private path. |
| No private writable file | Waiter is fully blocked with queue head, path, position, and release condition. |
| Holder notification | The existing holder receives one canonical `FreezeSignal` per queued surface, directing patch proposal or governed release. |
| Acknowledgement authority | Only the signal's task and actor can acknowledge; waiter or unrelated actor is rejected. |
| Patch/release handoff | Holder may publish the existing patch envelope, then `broker release` advances the queue and makes the waiter head. |
| Multi-file ordering | The same stable per-file ordering is used for all shared paths; no task obtains one shared path while waiting on another. |
| Base or state corruption | Base-hash mismatch, malformed queue, stale lease, or invalid freeze state fail closed and require re-arbitration. |
