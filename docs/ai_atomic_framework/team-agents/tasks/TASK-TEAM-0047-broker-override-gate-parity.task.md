---
doc_id: doc_team_0047
task_id: TASK-TEAM-0047
title: "Broker override gate parity"
status: done
owner: atm-core
priority: P0
milestone: M8E
depends_on:
  - "TASK-TEAM-0046"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case broker-override-gate-parity"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the four-entry gate changes together if one entry becomes weaker than the others."
atomizationImpact:
  ownerAtomOrMap: "atm.team-broker-enforcement"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Do not edit docs/ai_atomic_framework/rft-hardening/** in 3KLife; Cursor RFT work owns that planning lane."
  - "Do not edit scripts/captain-dispatch-mailbox/**; TASK-RFT-0005 owns that lane."
  - "Do not edit RFT-owned target paths such as scripts/validators/task-ledger/**, packages/core/src/police/**, or RFT split helper files while RFT residue or locks exist."
  - "Do not implement new scheduler semantics."
  - "Do not bypass TASK-TEAM-0046 artifact requirements."
nonGoals:
  - "No vendor bridge implementation in this card."
  - "No high-authority override that lacks an artifact."
completed_at: "2026-07-10T04:30:54.393Z"
completed_by_agent: "codex-captain-m8e"
closedAt: "2026-07-10T04:30:54.393Z"
closedByActor: "codex-captain-m8e"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T04-30-54-303Z-close-7b70c5e28d95"
lastTransitionAt: "2026-07-10T04:30:54.393Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2a4df02ebafe1353ad3c4f6fd9462e156c7a14b4"
---

# TASK-TEAM-0047 Broker override gate parity

## Goal

Make broker conflict blocking and override behavior identical across the four
operator entries: `team start`, `next --claim`, `taskflow close`, and
`atm git commit`.

## Why

M8E is not complete if only one entry blocks conflicts. A multi-agent system has
to fail closed from every entry that can advance work, close evidence, or mutate
Git state.

## Shared Vocabulary

This card consumes the same vocabulary as `TASK-TEAM-0046`:
`decisionClass`, `decisionReason`, `violationStatus`, and
`broker-conflict-blocked`.

## Acceptance Criteria

- Active task overlap without a valid `atm.brokerConflictResolution.v1` artifact
  blocks all four entries with `broker-conflict-blocked`.
- Override requires the resolution artifact and preserves `decisionClass`,
  `decisionReason`, and `violationStatus`.
- The four entries return consistent diagnostics and retry guidance.
- `taskflow close` and `atm git commit` cannot become weaker late-stage bypasses.
- The validator includes a four-entry parity case.

## Verification

```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-team-agents.ts --case broker-override-gate-parity
git diff --check
```
