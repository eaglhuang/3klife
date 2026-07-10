---
doc_id: doc_team_0046
task_id: TASK-TEAM-0046
title: "Broker conflict resolution command"
status: done
owner: atm-core
priority: P0
milestone: M8E
depends_on:
  - "TASK-TEAM-0038"
  - "TASK-TEAM-0041"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/permission-broker.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "schemas/governance/broker-conflict-resolution.schema.json"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/team-runtime/permission-broker.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "schemas/governance/broker-conflict-resolution.schema.json"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case broker-conflict-resolution"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the command, schema, validator case, and broker wiring together if conflict resolution becomes ambiguous."
atomizationImpact:
  ownerAtomOrMap: "atm.team-broker-enforcement"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Do not edit docs/ai_atomic_framework/rft-hardening/** in 3KLife; Cursor RFT work owns that planning lane."
  - "Do not edit scripts/captain-dispatch-mailbox/**; TASK-RFT-0005 owns that lane."
  - "Do not edit RFT-owned target paths such as scripts/validators/task-ledger/**, packages/core/src/police/**, or RFT split helper files while RFT residue or locks exist."
  - "Do not rename or reuse TASK-TEAM-0042, TASK-TEAM-0043, or TASK-TEAM-0044."
  - "Do not hand-edit .atm/runtime/** or .atm/history/**."
nonGoals:
  - "No vendor bridge implementation in this card."
  - "No broad scheduler replacement."
completed_at: "2026-07-10T03:26:11.442Z"
completed_by_agent: "codex-captain-m8e"
closedAt: "2026-07-10T03:26:11.442Z"
closedByActor: "codex-captain-m8e"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T03-26-11-442Z-close-e9ed3cf934f4"
lastTransitionAt: "2026-07-10T03:26:11.442Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d13d612064e69e991a45f0fcf4cf03a808b66964"
---

# TASK-TEAM-0046 Broker conflict resolution command

## Goal

Add the first-class command and artifact contract that resolves broker-blocked
multi-agent write conflicts without bypassing Team Broker enforcement.

## Why

Team Broker can already detect conflicts, but M8E requires the system to turn a
blocked state into an auditable resolution order. This card creates the smallest
closed loop: detect overlap, return `broker-conflict-blocked`, write
`atm.brokerConflictResolution.v1`, and unblock only in the recorded order.

## Shared Vocabulary

All M8E and SKL-lane work must use these exact terms:

- `decisionClass`
- `decisionReason`
- `violationStatus`
- `broker-conflict-blocked`

`decisionClass` must at least distinguish `auto-execution`,
`human-signoff-required`, `adr-required`, and `blocked`.

## Acceptance Criteria

- A command such as `tasks parallel resolve` or `team broker resolve` can create
  an `atm.brokerConflictResolution.v1` artifact from conflicting task ids.
- The artifact records task ids, shared paths, CID or atom overlap, owner
  acknowledgement or timeout, `decisionClass`, `decisionReason`,
  `violationStatus`, `escalationTarget`, resolution order, and validator plan.
- A blocked conflict returns or records `broker-conflict-blocked`.
- The permission broker consumes the artifact and allows follow-up work only in
  the recorded resolution order.
- The validator proves the full chain without touching
  `scripts/captain-dispatch-mailbox/**` or other RFT-owned paths.

## Verification

```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-team-agents.ts --case broker-conflict-resolution
git diff --check
```
