---
doc_id: doc_team_0048
task_id: TASK-TEAM-0048
title: "Conflict UX and Captain playbook"
status: done
owner: atm-core
priority: P1
milestone: M8E
depends_on:
  - "TASK-TEAM-0046"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/role-routing-matrix.md"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "schemas/team-agents/captain-decision.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/governance/team-agents/role-routing-matrix.md"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "schemas/team-agents/captain-decision.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case broker-conflict-ux"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert UX wording, schema vocabulary, and playbook changes together if operator guidance becomes misleading."
atomizationImpact:
  ownerAtomOrMap: "atm.team-broker-enforcement"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Do not edit docs/ai_atomic_framework/rft-hardening/** in 3KLife; Cursor RFT work owns that planning lane."
  - "Do not edit scripts/captain-dispatch-mailbox/**; TASK-RFT-0005 owns that lane."
  - "Do not edit RFT-owned target paths such as scripts/validators/task-ledger/**, packages/core/src/police/**, or RFT split helper files while RFT residue or locks exist."
  - "Do not create a second Team playbook separate from SKL-0009."
  - "Do not add a high-authority override path without TASK-TEAM-0046 artifacts."
nonGoals:
  - "No vendor bridge implementation in this card."
  - "No broad rewrite of Team role routing."
completed_at: "2026-07-10T05:11:15.374Z"
completed_by_agent: "codex-captain-m8e"
closedAt: "2026-07-10T05:11:15.374Z"
closedByActor: "codex-captain-m8e"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T05-11-14-864Z-close-a88b6df43f9f"
lastTransitionAt: "2026-07-10T05:11:15.374Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9ba4ea7e9bbaebb25772f985822795224d2ab069"
---

# TASK-TEAM-0048 Conflict UX and Captain playbook

## Goal

Make broker conflict blocking understandable and actionable for captains and AI
operators, while keeping the playbook vocabulary aligned with SKL-0009.

## Why

Hard blocking is only usable if the operator sees the conflict reason, the next
safe command, and the evidence artifact that will unblock the lane. This card is
the human-facing half of M8E.

## Shared Vocabulary

The UX and playbook must use `decisionClass`, `decisionReason`,
`violationStatus`, and `broker-conflict-blocked` exactly, so SKL-0008 through
SKL-0012 can consume the same contract language.

## Acceptance Criteria

- CLI output for broker conflicts names the blocked task ids, shared paths or
  atom overlap, `decisionReason`, and next safe resolution command.
- Captain playbook guidance routes operators from parallel analysis to the
  `atm.brokerConflictResolution.v1` artifact path instead of suggesting manual
  runtime edits.
- The playbook slice is compatible with SKL-0009 and does not create a second
  role-routing source.
- The captain decision schema accepts the shared M8E vocabulary.
- The validator covers conflict UX and artifact hints.

## Verification

```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-team-agents.ts --case broker-conflict-ux
git diff --check
```
