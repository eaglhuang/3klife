---
doc_id: ""
task_id: TASK-APF-0054
title: Finding-to-janitor apply plan contract
milestone: M15
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APF-0002]
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: documentation-control-plane-repair
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/tasks/TASK-APF-0054-finding-to-janitor-apply-plan-contract.task.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/tasks/README.md
forbidden_files:
  - AAF source mutation
  - atomic-registry.json
  - apply execution
  - janitor CLI
  - lock / scheduler runtime
non_goals:
  - "Do not mutate AAF source."
  - "Do not change registry behavior."
  - "Do not perform any apply."
  - "Do not introduce a janitor CLI."
  - "Do not change lock or scheduler runtime."
notes: "2026-06-01 | status: open | validation: pending | change: Phase 0 contract draft for finding-to-janitor apply plan | blocker: TASK-APF-0002 | risk: scope drift into runtime apply or janitor CLI"
---

# TASK-APF-0054 Finding-to-janitor apply plan contract

## Goal
Define the contract that turns an APF finding into a janitor apply plan without executing the apply step.

## Draft Fields
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

## Phase 0 Scope
- Specify input and output fields for a finding-to-plan transition.
- Define when a finding becomes eligible for janitor planning.
- Keep the work design-only; do not touch AAF source or runtime.
- Do not introduce a janitor CLI.
- Produce only dry-run and reviewable artifacts; do not apply.

## Acceptance Criteria
- The card defines a stable plan contract between finding records and janitor apply plans.
- The card names the decision points for eligibility, routing, and plan shape.
- The card explicitly forbids performing apply in Phase 0.
- The card keeps lock and scheduler runtime untouched.
- The card keeps registry behavior unchanged.
- The card supports human review approval before any later apply step.

## Forbidden
- AAF source mutation
- registry mutation
- apply execution
- janitor CLI
- lock or scheduler runtime changes
- no 24hr auto mutate
- no directApplyAllowed override
- no apply without human review approval
- no apply without scheduler/admission
- no skip reversibility
- no skip scope-lock
- no fast path
- no emergency bypass

## Notes
This card is a design-only preflight for later implementation work.
