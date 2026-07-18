---
task_id: ATM-GOV-0168
title: Lane-aware same-task claim conflict and adopt rebind
status: planned
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  lane-session claim 治理屬 governance-optimization 現行系列；
  0167 是驗收卡不是依賴；本卡修復 R1 / D6 同卡異 lane 衝突缺口。
related_tasks:
  - ATM-GOV-0167
scopePaths:
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/tasks/task-ledger-readers.ts
  - packages/cli/src/commands/next/claim-admission.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/next/route-predicates.ts
  - packages/cli/src/commands/next/route-resolution/queue-inspection.ts
  - packages/cli/src/commands/lane.ts
  - packages/cli/src/commands/lane-session/store.ts
  - packages/cli/src/commands/lane-session/**
  - packages/cli/src/commands/command-specs/lane.spec.ts
  - packages/cli/src/commands/actor-session.ts
  - scripts/analyze-captain-parallel-ledger.ts
  - packages/cli/src/commands/tasks/__tests__/**
  - packages/cli/src/commands/lane-session/__tests__/**
  - packages/cli/src/commands/next/__tests__/**
  - tests/cli/lane-claim-conflict-matrix.test.ts
  - tests/cli/lane-adopt-phase.test.ts
  - tests/cli/analyze-captain-parallel-ledger-lane-concurrency.test.ts
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - docs/governance/command-surface.md
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - .atm/history/evidence/ATM-GOV-0168.*
  - .atm/history/task-events/ATM-GOV-0168/**
  - .atm/history/tasks/ATM-GOV-0168.json
deliverables:
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/lane-session/store.ts
  - scripts/analyze-captain-parallel-ledger.ts
  - docs/governance/error-code-registry.json
validators:
  - node --strip-types packages/cli/src/commands/next/__tests__/claim-admission.spec.ts
  - node --strip-types packages/cli/src/commands/lane-session/__tests__/store.spec.ts
  - node --strip-types tests/cli/lane-claim-conflict-matrix.test.ts
  - node --strip-types tests/cli/lane-adopt-phase.test.ts
  - node --strip-types tests/cli/analyze-captain-parallel-ledger-lane-concurrency.test.ts
  - node --strip-types tests/cli/pre-team-dual-captain-e2e.test.ts
  - node --strip-types packages/core/src/broker/__tests__/broker-registry-transaction.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.lane-aware-claim-conflict
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.tasks.lane-aware-claim-conflict
      pattern: Guard
      source: packages/cli/src/commands/tasks/claim-orchestrator.ts
      disposition: extract
      inlineReason: null
    - atom: atm.lane-session.adopt-ttl-phase
      pattern: Guard
      source: packages/cli/src/commands/lane-session/store.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0168 - Lane-Aware Same-Task Claim Conflict and Adopt Rebind

## Phase 0 Scope

Open this planning card in 3KLife only. Phase 1 implements the repair in the
target AI-Atomic-Framework repository.

Phase 0 allowed files:

- `C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/tasks/ATM-GOV-0168-lane-aware-same-task-claim-conflict.task.md`

## Context

ATM-GOV-0167 dual-lane acceptance probing proved R1: the same actor handle with
two distinct `ATM_LANE_SESSION_ID` values can `tasks claim` the same task card
and overwrite the claim lane stamp (claim churn). That violates D6 foreign-owner
comparison (`compareClaimLifecycleOwners`), which already treats different lane
ids as distinct owners when both sides carry lane metadata.

## Required Behavior (Phase 1)

### A. Claim conflict lane-aware

- In `tasks claim` / renew / release owner checks, reuse
  `compareClaimLifecycleOwners` from `next/claim-admission.ts` (single helper;
  do not duplicate).
- Both sides have `laneSessionId` → compare lanes. Same handle, different lane
  = foreign → `ATM_LOCK_CONFLICT` with `holdingLaneSessionId`,
  `requestedLaneSessionId`, and adopt/handoff recovery hints.
- Either side missing lane → actor-id fallback (legacy compatible).
- Takeover of expired claims remains unchanged.
- Align `next/claim-orchestration.ts` to the same ownership rule.

### B. Adopt hardening

- TTL phase gate: non-stale (still within TTL) without same-handle `--confirm`
  or handoff token → refuse.
- Clock-expired sessions remain adoptable even when status is still `active`.
- On success: rebind live work sessions whose `guidanceSessionId` matches the
  adopted lane, and rewrite the task claim `laneSession` metadata to the
  adopted lane **without** changing `leaseId` (no claim churn).

### C. Analyzer acceptance metric

- Add a light lane-session event-overlap concurrency metric in
  `scripts/analyze-captain-parallel-ledger.ts` (read
  `.atm/history/session-events/`, emit beside existing waves).
- If the analyzer change exceeds ~150 lines, stop and propose a follow-up card.

## Out of Scope

- ATM-GOV-0167 Phase 1 re-run (dispatch after this card closes).
- Status mirror / planning close in Phase 0.

## Acceptance

Focused conflict-matrix, adopt-phase, and analyzer metric specs pass; typecheck,
`validate:cli`, dual-captain e2e, and broker registry transaction tests pass.
