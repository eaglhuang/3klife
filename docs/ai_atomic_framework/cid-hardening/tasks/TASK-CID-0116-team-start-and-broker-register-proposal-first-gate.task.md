---
task_id: TASK-CID-0116
title: Team start and broker register proposal-first gate
status: done
milestone: M21
depends_on:
  - TASK-CID-0115
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/**"
  - "scripts/validate-team-agents.ts"
  - "tests/cli/**"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/**"
  - "scripts/validate-team-agents.ts"
  - "tests/cli/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:team-agents -- --case capture-broker-evidence"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not build a generic editor plugin protocol."
  - "Do not require final steward apply in this card."
nonGoals:
  - "No shared-writer auto-takeover."
atomizationImpact:
  ownerAtomOrMap: "atm.proposal-first-team-gate"
  mapUpdates: []
completed_at: "2026-06-21T15:59:28.668Z"
completed_by_agent: "captain"
delivery_commit: "79315fe16dc95ab1e49d5e2320c7bcdb6ae67b25"
---

# TASK-CID-0116

## Goal

Make `team start` and `broker register` support a practical proposal-first gate for hot-file work:

- first writer can be required to submit proposal/equivalent mutation intent before real write authority;
- second writer can be compared against the first proposal before both sides write the same file.

This card owns the trigger policy and first-writer control mechanics:

- hot files always enter proposal-first mode;
- non-hot files enter proposal-first mode only when collision-prone overlap conditions appear;
- first writers should receive a short provisional lease or equivalent non-final write state before full write admission.

## Acceptance

- Team/broker flow can mark a hot-file task as proposal-submitted without granting unconditional write authority.
- Broker register can compare an incoming writer against an already submitted proposal before second-write mutation.
- Runtime output clearly says whether the task is only proposal-submitted or actually write-admitted.
- Hot-file policy can be configured or resolved without forcing the entire repository into proposal-first mode.
- A provisional lease or pre-write admission state exists for first-writer hot-file flows.
- Regression coverage proves early broker arbitration happens before the second writer mutates the working tree.

## Non-Goals

- No broad refactor of all team recipes.
- No final composer success evidence pack yet.
- No automatic forced rollback of already-written changes in this card.

## Verification

```bash
npm run typecheck
npm run validate:cli
npm run validate:team-agents -- --case capture-broker-evidence
git diff --check
```
