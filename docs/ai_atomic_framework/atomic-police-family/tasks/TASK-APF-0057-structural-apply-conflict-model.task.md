---
doc_id: ""
task_id: TASK-APF-0057
title: Structural apply conflict model
milestone: M15
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APF-0055]
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: phase1-pure-function-conflict-model
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/tasks/TASK-APF-0057-structural-apply-conflict-model.task.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/tasks/README.md
forbidden_files:
  - AAF source mutation
  - atomic-registry.json
  - runtime scheduler
  - apply execution
  - lock takeover
non_goals:
  - "Do not mutate AAF source outside the planned pure-function scope."
  - "Do not perform any apply."
  - "Do not implement a runtime scheduler."
  - "Do not add janitor CLI wiring."
  - "Do not implement lock takeover or auto-unblock behavior."
notes: "2026-06-01 | status: open | validation: pending | change: Phase 1 seed card for ScheduleDecision pure-function conflict model and fixtures | blocker: TASK-APF-0055 | risk: scope drift into runtime scheduling, apply execution, or lock takeover"
---

# TASK-APF-0057 Structural apply conflict model

## Goal
Turn TASK-APF-0055's ScheduleDecision / conflict model into pure functions and fixtures only, without introducing runtime scheduling.

## Phase 1 Scope
- Materialize deterministic conflict classification for structural apply candidates.
- Define pure-function inputs and outputs for queue eligibility, conflict reasons, and next-step recommendation.
- Add positive and negative fixtures for overlapping scope, dependency ordering, and review gating.
- Keep the work limited to pure-function modeling; do not wire runtime scheduler behavior.

## Suggested AAF allowedFiles
- `packages/core/src/janitor/scheduler.ts`
- `packages/core/src/janitor/scheduler-types.ts`
- `fixtures/police-family/**`
- `scripts/validate-police-family.ts`
- `scripts/validate-structural-apply-conflicts.ts`

## Acceptance Criteria
- `ScheduleDecision` and conflict model semantics are expressed as deterministic pure functions.
- Positive and negative fixtures cover overlap, dependency, and human-review gating cases.
- The task does not introduce runtime scheduler loops, apply execution, or lock takeover.
- No CLI wiring is added.

## Forbidden
- AAF source mutation outside pure-function / fixture / validator scope
- runtime scheduler
- apply execution
- lock takeover
- janitor CLI
- no 24hr auto mutate
- no directApplyAllowed override
- no apply without human review approval
- no skip reversibility
- no skip scope-lock
- no emergency bypass

## Plain-language Anchor
這張卡先做「施工衝突判斷表」，不是自動排班器，也不是自動施工隊。

## Notes
Phase 1 should stop at deterministic conflict modeling. Runtime scheduling, lock negotiation, and mutation orchestration belong to later cards.