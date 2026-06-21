---
task_id: TASK-CID-0118
title: Governed writer handoff and live apply evidence
status: done
milestone: M21
depends_on:
  - TASK-CID-0117
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/broker.ts"
  - "scripts/capture-broker-evidence.ts"
  - "scripts/collect-broker-evidence.ts"
  - "tests/cli/**"
deliverables:
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/broker.ts"
  - "scripts/capture-broker-evidence.ts"
  - "scripts/collect-broker-evidence.ts"
  - "tests/cli/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not add a fully autonomous multi-writer swarm."
  - "Do not redesign all paper evidence tooling."
nonGoals:
  - "No new broker envelope schema break."
atomizationImpact:
  ownerAtomOrMap: "atm.governed-writer-handoff"
  mapUpdates: []
completed_at: "2026-06-21T16:05:16.909Z"
completed_by_agent: "captain"
delivery_commit: "fa4fa6f4bb9f41399f1d547c1f3ed48b0a55c55e"
---

# TASK-CID-0118

## Goal

Complete the practical execution path after early arbitration:

- proposal-submitted tasks can be promoted to an actual governed writer path;
- deterministic-composer cases can complete through steward apply;
- evidence collectors record this as a real product path, not a synthetic-only artifact.

This card should make the practical handoff path real:

- a parked first writer can hand current proposal state into the governed writer path;
- a composer-routed same-file case can still complete without manual conflict theater;
- live evidence should show that arbitration happened before uncontrolled dual-write mutation.

## Acceptance

- Broker/steward path can consume proposal-gated same-file work without manual schema edits.
- A live same-file composer-routed case can end in `applied`.
- Evidence collectors can report proposal-submitted, composer-routed, and applied states in one coherent run story.
- Evidence collectors can report a parked-first-writer handoff or equivalent rearbitration transition.
- Existing evidence schema remains compatible.

## Non-Goals

- No requirement to auto-close the task lifecycle in this card.
- No generic IDE suspension/resume protocol.
- No autonomous shared-writer swarm.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
