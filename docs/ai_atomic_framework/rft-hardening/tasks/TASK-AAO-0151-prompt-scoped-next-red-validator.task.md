---
doc_id: doc_aao_0151
task_id: TASK-AAO-0151
title: "Fix validate:prompt-scoped-next persistent red (broker freeze on TASK-CONFLICT fixture)"
status: open
owner: atm-core
priority: P1
milestone: RFT-M5
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-prompt-scoped-next.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks/"
  - "packages/core/src/broker/"
validators:
  - "npm run typecheck"
  - "npm run validate:prompt-scoped-next"
  - "npm run validate:broker-proposal"
  - "git diff --check"
deliverables:
  - "scripts/validate-prompt-scoped-next.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if broker arbitration verdicts change for real (non-fixture) conflict scenarios."
atomizationImpact:
  ownerAtomOrMap: "atm.next-routing"
  mapUpdates: []
outOfScope:
  - "Weakening real broker conflict blocking for confirmed mutation-intent overlaps"
nonGoals:
  - "Do not delete the conflict-fixture coverage; make expectation and behavior agree"
---

# TASK-AAO-0151 — prompt-scoped-next persistent red

## Symptom (verified 2026-07-06/07, clean baseline)

`npm run validate:prompt-scoped-next` fails on main. The fixture at
scripts/validate-prompt-scoped-next.ts (~line 689) writes TASK-CONFLICT-0001
(running, other-actor, atom-conflict) and TASK-CONFLICT-0002 (ready, same
atom), then asserts `next --claim --prompt TASK-CONFLICT-0002` is ADMITTED
with parallelAdvisory verdict `insufficient-mutation-intent`. Actual behavior:
CliError ATM_NEXT_CLAIM_BLOCKED with brokerVerdict `freeze` /
`blocked-cid-conflict`.

Verified pre-existing via git stash on 2026-07-06 (fails with a clean
worktree), so a landed change — likely the TASK-CID-0112 broker
explicit-input mutation-intent seed (delivery 0f97299b) — changed arbitration
behavior for metadata-only overlap without updating this validator.

## Decision Needed First

Which side is right?
- If the CID-0112 behavior (freeze on same-atom overlap without Broker
  mutation intent) is the intended new contract, update the validator
  expectations to assert the block and its remediation hint.
- If metadata-only overlap without declared mutation intent should stay
  advisory (the validator's original contract), fix the arbitration input so
  the fixture yields `insufficient-mutation-intent` again.

Check TASK-CID-0112's card acceptance and closure evidence before choosing.

## Why P1

A validator that is red on main trains agents to ignore red gates, and it
blocks any card that declares validate:prompt-scoped-next (e.g. the
TASK-AAO-0150 latency card).
