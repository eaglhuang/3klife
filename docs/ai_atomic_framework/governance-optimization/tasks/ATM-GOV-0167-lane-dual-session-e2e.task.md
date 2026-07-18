---
task_id: ATM-GOV-0167
title: Lane Session dual-lane end-to-end acceptance
status: planned
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  Lane-session dual-lane dogfood acceptance belongs to the governance-optimization
  series. ATM-GOV-0166 is occupied by ledger plan-source realign, so this card takes
  the next free id ATM-GOV-0167. Confirmed free in 3KLife tasks dir and both-repo
  git log before open.
scopePaths:
  - tests/cli/lane-dual-session-e2e.test.ts
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - .atm/history/evidence/ATM-GOV-0167.*
  - .atm/history/task-events/ATM-GOV-0167/**
  - .atm/history/tasks/ATM-GOV-0167.json
deliverables:
  - tests/cli/lane-dual-session-e2e.test.ts
  - docs/governance/error-code-registry.json
validators:
  - node --strip-types tests/cli/lane-dual-session-e2e.test.ts
  - node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts
  - node --strip-types tests/cli/broker-registry-transaction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.lane-session-dual-e2e
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.lane-session.dual-e2e
      pattern: Integration Test
      source: tests/cli/lane-dual-session-e2e.test.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0167 - Lane Session Dual-Lane End-to-End Acceptance

## Phase 0 Scope

Open this planning card in 3KLife only. Phase 1 implements the fixture-based
dual-lane acceptance test and error-code registry entries in the target
AI-Atomic-Framework repository.

Phase 0 allowed files:

- `C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/tasks/ATM-GOV-0167-lane-dual-session-e2e.task.md`

## Context

The lane-session rollout plan verification envelope requires a final two-lane
dogfood: two shells with the same actor handle must receive different lane ids,
conflict as separate lanes on the same task card (`ATM_LOCK_CONFLICT`), and
support adoption after TTL or handoff. Analyzer evidence must rebuild
`maxConcurrency = 2` from session-events.

## Required Behavior (fixture-only)

In an isolated mkdtemp fixture repo (never on the real worktree):

1. Same actor handle opens two environments with distinct `ATM_LANE_SESSION_ID`
   values via `lane status` → two different lane ids.
2. Lane A claims T1 and lane B claims T2 → both succeed.
3. Lane B attempts to claim T1 → `ATM_LOCK_CONFLICT` with lane details / adopt hint.
4. Lane A TTL expiry simulation → lane B `lane adopt` succeeds; work session
   rebinds without claim churn.
5. `scripts/analyze-captain-parallel-ledger.ts` reports `maxConcurrency = 2`
   from session-events.

Also register missing error codes:

- `ATM_LANE_ADOPT_ACTOR_REQUIRED`
- `ATM_LANE_SESSION_ADOPTED`
- `ATM_LANE_SESSION_STATUS`

## Probe Result (2026-07-18, stop for Captain)

Fixture probe against current frozen/source CLI found plan mismatches.
Phase 1 delivery is **stopped** per dispatch stop-condition (do not change
production behavior in this card).

| Step | Expected | Observed |
|---|---|---|
| 1 | Distinct lane ids | PASS |
| 2 | Lane A→T1, Lane B→T2 claim ok | PASS |
| 3 | Lane B→T1 → `ATM_LOCK_CONFLICT` + lane/adopt details | **FAIL** — same actor reclaim succeeded (`ATM_TASKS_CLAIM_ACQUIRED`) and stamped lane B onto T1 |
| 4 | TTL expire → `lane adopt` ok, claim no churn | **PARTIAL** — adopt returned `ATM_LANE_SESSION_ADOPTED`, but claim already churned in step 3; adopt does not rebind task claim lane |
| 5 | Analyzer `maxConcurrency = 2` from session-events | **FAIL** — analyzer waves keyed to RFT/LANE dogfood patterns; fixture yielded `maxConcurrency: 0`; session-events only had adopt on lane A |

Root cause pointer for step 3: `packages/cli/src/commands/tasks/claim-orchestrator.ts` still gates active-claim conflict on `currentClaim.actorId !== actorId` only. Lane-aware ownership from TASK-LANE-0017 lives on next/claim-admission broker overlap paths, not same-task `tasks claim`.

## Stop Condition

If live behavior diverges from the plan acceptance, stop and report to Captain.
Do not change production behavior in this card; open a backlog item instead.

## Out of Scope

- Editing `lane-session/{store,resolve,adopt}` or claim-orchestrator behavior
- Real-repo dual claim races
- Push unless the operator explicitly requests it
