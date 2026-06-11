---
doc_id: doc_cid_0025
task_id: TASK-CID-0025
title: "Broker-owned write actor runtime boundary and activation contract"
status: planned
owner: atm-core
priority: P1
milestone: P1
depends_on:
  - "TASK-CID-0021"
  - "TASK-CID-0023"
related_plan: "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "packages/core/src/broker/steward.ts"
  - "scripts/validate-team-brokered-write.ts"
  - "scripts/validate-broker-steward.ts"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "packages/core/src/broker/steward.ts"
  - "scripts/validate-team-brokered-write.ts"
  - "scripts/validate-broker-steward.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-brokered-write.ts --mode validate"
  - "node --strip-types scripts/validate-broker-steward.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert broker-owned write actor runtime boundary and activation wiring."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Giving broker-owned write actor git.write"
  - "Giving broker-owned write actor task.lifecycle"
  - "Creating a second closure authority beside coordinator/captain"
  - "Remote broker service or cross-machine shared runtime"
nonGoals:
  - "Do not rewrite existing broker conflict logic"
  - "Do not collapse coordinator and steward into one role"
  - "Do not require TASK-CID-0024 to finish before this contract can be planned"
---

# TASK-CID-0025 Broker-owned write actor runtime boundary and activation contract

## Goal

Define whether ATM should materialize a **broker-owned write actor** for same-file CID-disjoint accepted lanes, and if so, draw the exact runtime and authority boundary so the actor can write scoped files without becoming a second lifecycle owner.

## Why

ATM already has:

- broker decision lanes
- deterministic composer / neutral steward apply
- Team `brokerLane` advisory

What is still unclear is the runtime ownership model after broker acceptance:

- should the final scoped patch still be executed only through coordinator-owned flows?
- can ATM materialize a separate write actor that listens only to broker/steward inputs?
- if that actor exists, how do we avoid creating a second scheduler or second close authority?

This card resolves that boundary.

## Problem Statement

The current state proves the governance engine, but not yet the runtime activation model:

1. `team plan/start` can surface `neutral-steward` and `direct-brokered` lanes.
2. `steward plan/apply` can produce final scoped file writes.
3. The coordinator remains the only holder of `task.lifecycle`, `git.write`, and `evidence.write`.

The open question is whether the steward/write phase should remain an internal coordinator-owned command path, or whether ATM should materialize a distinct **broker-owned write actor** with scoped `file.write` only.

## Planning Conclusion To Encode

This card should preserve the following planning stance unless later evidence disproves it:

- A broker-owned write actor **may** exist as an independent runtime role.
- It should listen only to broker-approved inputs such as `PatchProposal`, `MergePlan`, `StewardPlan`, and scoped file leases.
- It should **not** own `git.write`, `task.lifecycle`, or final close/evidence authority.
- Coordinator / Captain remains the only lifecycle owner and the only authority that accepts the actor result into commit / close / reconcile.

## Acceptance Criteria

- The contract explicitly states whether broker-owned write actor runtime is allowed.
- The contract explicitly states whether this actor can be implemented **independently** from the coordinator command surface.
- The answer must be: independent for scoped file-write execution, **not** independent for lifecycle authority.
- The contract explicitly states that `Broker` is the higher authority inside broker-governed conflict domains, and `Coordinator` must follow broker verdicts there.
- The contract explicitly states that `Coordinator` remains the team-local lifecycle owner outside broker-governed conflict domains.
- The contract names the exact allowed capability set for broker-owned write actor.
- The contract names the exact forbidden capability set for broker-owned write actor.
- The contract prevents a second scheduler / second close authority from appearing.
- The contract states whether this work can proceed without waiting for `TASK-CID-0024`.
- The contract states how `team plan/start`, broker lane evaluation, and steward apply should hand off into this actor.

## Expected Runtime Boundary

### Broker-owned write actor may hold

- scoped `file.write`
- read access to broker-approved proposal / merge-plan / steward-plan inputs
- write-evidence output for the scoped write step only

### Broker-owned write actor may not hold

- `git.write`
- `task.lifecycle`
- final `evidence.write`
- release / close / reconcile authority

### Coordinator / Captain retains

- claim / start / release / close / reconcile
- delivery commit / historical delivery attestation
- final evidence routing
- acceptance or rejection of broker-owned write actor results

## Authority Chain

- `Coordinator` is the local lifecycle owner for one team run.
- `Broker` is the cross-team conflict governor.
- Inside broker-governed conflict domains, broker verdicts override coordinator decisions, and coordinator must yield instead of racing a local close.
- Outside broker-governed conflict domains, coordinator retains team-local lifecycle authority.

## Conflict Rule To Encode

- If broker verdict says `needs-steward`, `blocked-cid-conflict`, `blocked-shared-surface`, or `historical-delivery-required`, the coordinator may not bypass that verdict with direct commit / close progression.
- If broker-prescribed routing exceeds task scope, closure authority, or acceptance wording, the path must escalate to Captain / human rather than silently proceeding.
- If broker-prescribed routing would exceed task scope, closure authority, or acceptance wording, the path must escalate to Captain / human rather than silently proceeding.

## Standalone Feasibility Question

This card must answer a narrow sequencing question:

- **Can this follow-up be planned and implemented as its own lane?**

Expected answer:

- **Yes, mostly.**
- It is downstream of `TASK-CID-0021` and `TASK-CID-0023`, because those establish Team broker lane and end-to-end acceptance.
- It does **not** need to wait for `TASK-CID-0024`, because same-file parallel closeout and historical delivery are adjacent governance concerns, not the runtime ownership boundary itself.

## Deliverable Shape

The implementation follow-up that consumes this contract should likely add:

1. broker-owned write actor runtime contract
2. activation handshake from broker/team lane into the actor
3. scoped evidence return path back to coordinator
4. validation that actor runtime never acquires lifecycle or git authority

## Verification

Run:

```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-team-brokered-write.ts --mode validate
node --strip-types scripts/validate-broker-steward.ts --mode validate
git diff --check
```

## Notes

- Update note (2026-06-10): clarified that broker-owned write actor may be independently materialized for scoped file-write execution, but authority remains layered rather than parallel.
- Update note (2026-06-10): clarified authority chain so `Broker` overrides `Coordinator` only inside broker-governed conflict domains.
- Dispatch note (2026-06-11): opened three inbox packets for this card under `docs/ai_atomic_framework/cid-hardening/inbox/`:
  - `P1-TASK-CID-0025-001-broker-runtime-activation-handshake--captain-to-001--20260611TPE.dispatch.md`
  - `P1-TASK-CID-0025-002-authority-chain-and-conflict-rules--captain-to-002--20260611TPE.dispatch.md`
  - `P1-TASK-CID-0025-003-evidence-and-closeout-validation--captain-to-003--20260611TPE.dispatch.md`
- This card is intentionally about **runtime ownership and activation**, not about changing CID verdict logic.
- The design target is "broker-controlled write execution, coordinator-controlled lifecycle closeout".
- If the implementation would require broker-owned actor to self-commit or self-close, that should be treated as a contract violation, not an acceptable shortcut.
