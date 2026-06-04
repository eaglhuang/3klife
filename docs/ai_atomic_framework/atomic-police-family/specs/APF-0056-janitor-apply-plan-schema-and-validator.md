# APF-0056 Janitor apply plan schema and validator

## Purpose

Turn TASK-APF-0054's JanitorApplyPlan contract into machine-checkable schema, validator rules, and fixtures only.

## Scope

- Materialize `JanitorApplyRequest`, `JanitorApplyPlan`, and `ApplyRollbackRecord` as schema-level contracts.
- Add positive fixtures for reviewable plan shape, evidence references, review metadata, and rollback envelope.
- Add negative fixtures for missing review state, missing rollback plan, invalid plan steps, and missing evidence references.
- Extend `validate-police-family` or add a dedicated `validate-janitor-plan` script for contract-only validation.

## Suggested AAF allowed files

- `schemas/**`
- `fixtures/police-family/**`
- `scripts/validate-police-family.ts`
- `scripts/validate-janitor-plan.ts`

## Forbidden

- Runtime apply execution.
- Janitor CLI.
- Registry mutation.
- Scheduler runtime wiring.
- Any path that allows direct apply, 24hr auto mutate, emergency bypass, skipped reversibility, or skipped scope-lock review.

## Status

- task: TASK-APF-0056
- milestone: M15
- artifact_status: draft
- runtime_status: n/a
- upstream_mutation_status: not-applied
