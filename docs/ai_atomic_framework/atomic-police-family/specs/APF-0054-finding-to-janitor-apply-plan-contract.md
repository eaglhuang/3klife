# APF-0054 Finding-to-janitor apply plan contract

## Purpose

Define the contract that turns an APF police finding into a reviewable janitor apply plan without executing the apply step.

## Contract shape

- `JanitorApplyRequest`
  - `findingId`
  - `findingType`
  - `findingSeverity`
  - `sourceTaskId`
  - `sourceEvidenceRefs`
  - `requestedPlanKind`
  - `requestedAt`
  - `requestedByActor`
- `JanitorApplyPlan`
  - `planId`
  - `requestRef`
  - `scopeLockRef`
  - `planKind`
  - `planSteps`
  - `reviewState`
  - `dryRunArtifactRef`
  - `reviewableArtifactRef`
  - `createdAt`
  - `createdByActor`
- `ApplyRollbackRecord`
  - `recordId`
  - `planRef`
  - `rollbackStrategy`
  - `rollbackSteps`
  - `rollbackEvidenceRefs`
  - `createdAt`
  - `createdByActor`

## Decision points

- A finding is eligible for janitor planning only after it preserves `metadata.policeFinding`, evidence references, and source task identity.
- A plan remains review-only until a later human review decision explicitly approves an apply path.
- Rollback strategy must be part of the plan envelope before any later implementation card can discuss apply.

## Forbidden

- Apply execution.
- Janitor CLI.
- Registry mutation.
- Runtime scheduler or lock behavior changes.
- `directApplyAllowed` override, 24hr auto mutate, fast path, emergency bypass, or skipped reversibility/scope-lock review.

## Status

- task: TASK-APF-0054
- milestone: M15
- artifact_status: draft
- runtime_status: n/a
- upstream_mutation_status: not-applied
