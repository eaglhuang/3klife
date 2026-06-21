---
task_id: TASK-CID-0115
title: Proposal-gated write admission contract and runtime states
status: done
milestone: M21
depends_on:
  - TASK-CID-0114
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/broker.ts"
  - "docs/BROKER_GUIDE.md"
  - "tests/cli/**"
deliverables:
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/broker.ts"
  - "docs/BROKER_GUIDE.md"
  - "tests/cli/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not implement autonomous multi-agent shared-writer orchestration."
  - "Do not redesign the entire task lifecycle."
  - "Do not force proposal gating for every file in the repository."
nonGoals:
  - "No UI redesign."
  - "No final dogfood archive in this card."
atomizationImpact:
  ownerAtomOrMap: "atm.proposal-gated-write-admission-contract"
  mapUpdates: []
completed_at: "2026-06-21T15:54:21.859Z"
completed_by_agent: "captain"
delivery_commit: "79315fe16dc95ab1e49d5e2320c7bcdb6ae67b25"
---

# TASK-CID-0115

## Goal

Define and implement the v1 contract for proposal-gated write admission so broker-governed flows can distinguish:

- `proposal-submitted`
- `write-admitted`
- `composer-routed`
- `blocked-before-write`
- `applied`

This card should establish the runtime state machine and evidence vocabulary needed for the rest of the wave.

It must also lock the practical product rule:

- proposal gating is conditional escalation, not the default for every write;
- hot files always use proposal-first admission;
- non-hot files stay on the fast path until overlap risk appears.

## Acceptance

- Broker/runtime types and command outputs support a proposal-first admission model.
- Team/broker evidence can represent `blocked-before-write` separately from apply-phase block.
- Team/broker evidence can represent `proposal-submitted`, `provisional-write-lease`, and `parked-for-rearbitration`.
- The contract distinguishes always-on hot-file gating from conditional same-file escalation.
- Documentation states when proposal gating is required and what lane transitions mean.
- CLI or focused tests verify the new states can be emitted without breaking existing direct broker flows.

## Non-Goals

- No automatic patch extraction from arbitrary in-progress editors yet.
- No final adoption gate yet.
- No global requirement that every file write starts with a proposal.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
