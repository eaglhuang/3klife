---
task_id: TASK-MAO-0059
doc_id: doc_mao_0059
title: "broker conflict resolution replay benchmark"
status: done
owner: atm-core
priority: P1
milestone: M8E
closure_authority: target_repo
depends_on:
  - "TASK-TEAM-0046"
  - "TASK-TEAM-0047"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "scripts/validate-mao-event-replay.ts"
  - "scripts/fixtures/mao-event-replay/**"
  - "packages/core/src/broker/**"
  - "packages/core/src/team-runtime/**"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-mao-event-replay.ts"
  - "scripts/fixtures/mao-event-replay/**"
  - "packages/core/src/broker/**"
  - "packages/core/src/team-runtime/**"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-mao-event-replay.ts --case broker-conflict-resolution"
  - "node --strip-types scripts/validate-team-agents.ts --case broker-conflict-resolution-replay"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert replay fixtures, validator changes, and benchmark wiring together if replay cannot deterministically prove M8E."
atomizationImpact:
  ownerAtomOrMap: "atm.multi-agent-orchestration-replay"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Do not edit .atm/runtime/** or depend on live runtime residue as fixture input."
  - "Do not place fixtures under release/**."
  - "Do not edit docs/ai_atomic_framework/rft-hardening/** in 3KLife; Cursor RFT work owns that planning lane."
  - "Do not edit scripts/captain-dispatch-mailbox/**; TASK-RFT-0005 owns that lane."
  - "Do not edit RFT-owned target paths such as scripts/validators/task-ledger/**, packages/core/src/police/**, or RFT split helper files while RFT residue or locks exist."
nonGoals:
  - "No vendor bridge implementation in this card."
  - "No replay fixture that requires private or unsanitized task history."
completed_at: "2026-07-10T05:28:57.079Z"
completed_by_agent: "codex-captain-m8e"
closedAt: "2026-07-10T05:28:57.079Z"
closedByActor: "codex-captain-m8e"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T05-28-57-079Z-close-8d500c2c623a"
lastTransitionAt: "2026-07-10T05:28:57.079Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b68247806a97c842ae205629eb58ada3ec9e17f6"
---

# TASK-MAO-0059 - broker conflict resolution replay benchmark

## Goal

Add a deterministic replay benchmark that proves the M8E broker enforcement
chain from conflict detection through ordered release.

## Why

M8E is only complete if the behavior can be replayed after the fact. The replay
must show that two agents colliding on the same atom are blocked consistently,
then released only after an `atm.brokerConflictResolution.v1` artifact defines
the order.

## Scenario Contract

The benchmark should model:

1. Two agents attempt overlapping work against the same atom or shared path.
2. The four M8E entries return `broker-conflict-blocked`.
3. A resolution artifact records `decisionClass`, `decisionReason`,
   `violationStatus`, and resolution order.
4. Replay proves the first task can continue, the second remains blocked until
   its turn, and the final state is green.

## Acceptance Criteria

- Replay fails if a conflict proceeds without a resolution artifact.
- Replay fails if the resolution order is ignored.
- Replay records the shared vocabulary used by TEAM 0046/0047/0048 and SKL
  0008 through 0012.
- The fixture is sanitized and does not depend on `.atm/runtime/**` residue.

## Verification

```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-mao-event-replay.ts --case broker-conflict-resolution
node --strip-types scripts/validate-team-agents.ts --case broker-conflict-resolution-replay
git diff --check
```
