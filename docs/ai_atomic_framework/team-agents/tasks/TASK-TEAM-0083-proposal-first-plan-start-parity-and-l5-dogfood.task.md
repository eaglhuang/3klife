---
doc_id: doc_team_0083
task_id: TASK-TEAM-0083
title: "Proposal-first plan/start parity and paid three-vendor L5 dogfood"
status: done
owner: atm-core
priority: P1
milestone: "Team Broker Maintainability"
depends_on:
  - "TASK-TEAM-0078"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/broker-shared-surface-coordination.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/broker-shared-surface-coordination.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case team-plan-proposal-parity"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert parity change; team start keeps sole --broker-proposal-file support."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
completed_at: "2026-07-12T06:48:46.085Z"
completed_by_agent: "codex-captain"
closedAt: "2026-07-12T06:48:46.085Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T06-48-46-002Z-close-16574d58fa93"
lastTransitionAt: "2026-07-12T06:48:46.085Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "31d5faa98ee1262755d8dc485b5b188ce28423f2"
---

# TASK-TEAM-0083 Proposal-first plan/start parity and L5 dogfood

## Goal

Fix backlog `ATM-BUG-2026-07-12-133`: `team plan` detects a valid hot-file
proposal-first gate but exposes no proposal input route, while only
`team start` accepts `--broker-proposal-file`. A Captain cannot turn a blocked
L5 plan into a ready plan without reverse-engineering the Broker proposal
contract. Then run the formal paid three-vendor L5 dogfood (OpenAI +
Anthropic + Gemini low-cost models, sequential handoff).

## Acceptance Criteria

- `team plan` accepts `--broker-proposal-file`, validates it with the same
  contract as start, and reports readiness instead of a dead-end
  `proposal-submitted` block.
- A blocked plan response surfaces the required proposal schema and a
  copyable create/validate command.
- Regression case `team-plan-proposal-parity` covers plan-with-proposal
  readiness and fail-closed start without a valid proposal.
- Paid L5 dogfood evidence: three vendors, sequential handoff ledger, token
  telemetry, and denied-unauthorized plus authorized-Coordinator flows
  archived without raw vendor output or secrets.
