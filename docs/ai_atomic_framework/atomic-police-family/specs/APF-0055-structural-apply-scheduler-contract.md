# APF-0055 Structural apply scheduler contract

## Purpose

Define the scheduling contract for structural apply candidates produced from janitor plans, without changing runtime scheduler behavior.

## Contract shape

- `ScheduleDecision`
  - `decision`
  - `queueKey`
  - `requiredLocks`
  - `conflicts`
  - `reason`
  - `nextCommand`
  - `schemaId`
  - `decidedAt`
  - `decidedByActor`
  - `evidenceRefs`
  - `expiresAt`
  - `applyPlanRef`

## Scheduling semantics

- Queue eligibility must reference a `JanitorApplyPlan` from TASK-APF-0054.
- Conflict classification must explain overlapping scope, dependency ordering, missing review approval, and stale plan state.
- Pause, resume, retry, and dependency behavior are contract fields only in Phase 0.
- Any later scheduler implementation must remain a separate task with its own scope and approval.

## Forbidden

- Runtime scheduler loop implementation.
- Apply execution.
- Janitor CLI.
- Registry mutation.
- Lock takeover, emergency bypass, direct apply, or skipped human review.

## Status

- task: TASK-APF-0055
- milestone: M15
- artifact_status: draft
- runtime_status: n/a
- upstream_mutation_status: not-applied
