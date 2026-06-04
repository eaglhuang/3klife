# APF-0057 Structural apply conflict model

## Purpose

Turn TASK-APF-0055's ScheduleDecision / conflict model into deterministic pure functions and fixtures, without introducing runtime scheduling.

## Scope

- Define pure-function inputs and outputs for queue eligibility, conflict reasons, and next-step recommendation.
- Classify overlapping scope, dependency order, review gating, stale plan state, and lock requirements.
- Add positive and negative fixtures for each conflict class.
- Keep implementation, if any, limited to deterministic modeling and validator coverage.

## Suggested AAF allowed files

- `packages/core/src/janitor/scheduler.ts`
- `packages/core/src/janitor/scheduler-types.ts`
- `fixtures/police-family/**`
- `scripts/validate-police-family.ts`
- `scripts/validate-structural-apply-conflicts.ts`

## Forbidden

- Runtime scheduler loops.
- Apply execution.
- Lock takeover.
- Janitor CLI.
- Registry mutation.
- Direct apply, emergency bypass, skipped human review, skipped reversibility, or skipped scope-lock review.

## Status

- task: TASK-APF-0057
- milestone: M15
- artifact_status: draft
- runtime_status: n/a
- upstream_mutation_status: not-applied
