---
doc_id: ""
task_id: TASK-APF-0055
title: Structural apply scheduler contract
milestone: M15
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APF-0054]
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: documentation-control-plane-repair
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/tasks/TASK-APF-0055-structural-apply-scheduler-contract.task.md
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
notes: "2026-06-01 | status: open | validation: pending | change: Phase 0 contract draft for structural apply scheduler | blocker: TASK-APF-0054 | risk: scope drift into runtime scheduling or apply execution"
---

# TASK-APF-0055 Structural apply scheduler contract

## Goal
Define the scheduler contract that sequences structural apply candidates produced from janitor plans without changing scheduler runtime.

## Draft Fields
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

## Phase 0 Scope
- Define scheduling inputs, priority rules, pause/resume, retry, and dependency handling.
- Keep the work design-only; do not execute apply or mutate AAF source.
- Do not change lock handling or scheduler runtime behavior.
- Produce only reviewable scheduling decisions; do not auto-mutate.

## Acceptance Criteria
- The card defines structural apply scheduling inputs, transitions, and queue semantics.
- The card explicitly references TASK-APF-0054 as the upstream planning contract.
- The card keeps runtime scheduler implementation unchanged.
- The card excludes janitor CLI, apply execution, and registry changes.
- The card requires human review approval before any later apply step.

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
