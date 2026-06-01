---
doc_id: ""
task_id: TASK-APF-0056
title: Janitor apply plan schema and validator
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
executionMode: phase1-schema-validator
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/tasks/TASK-APF-0056-janitor-apply-plan-schema-and-validator.task.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/tasks/README.md
forbidden_files:
  - AAF source mutation
  - atomic-registry.json
  - registry mutation
  - janitor CLI
  - apply execution
  - scheduler runtime
non_goals:
  - "Do not mutate AAF source."
  - "Do not change registry behavior."
  - "Do not perform any apply."
  - "Do not introduce a janitor CLI."
  - "Do not wire runtime scheduler or admission control."
notes: "2026-06-01 | status: open | validation: pending | change: Phase 1 seed card for JanitorApplyPlan schema, validator, and fixtures | blocker: TASK-APF-0054 | risk: scope drift into runtime apply or janitor CLI"
---

# TASK-APF-0056 Janitor apply plan schema and validator

## Goal
Turn TASK-APF-0054's JanitorApplyPlan contract into machine-checkable schema, validator rules, and fixtures only.

## Phase 1 Scope
- Materialize `JanitorApplyRequest`, `JanitorApplyPlan`, and `ApplyRollbackRecord` as schema-level contracts.
- Add positive and negative fixtures that prove the plan shape, review state, and rollback envelope are validated deterministically.
- Extend `validate-police-family` or add a dedicated `validate-janitor-plan` script for contract-only validation.
- Keep the work at schema + validator + fixture level; do not execute any apply.

## Suggested AAF allowedFiles
- `schemas/**`
- `fixtures/police-family/**`
- `scripts/validate-police-family.ts`
- `scripts/validate-janitor-plan.ts`

## Acceptance Criteria
- The JanitorApplyPlan contract is represented as schema and validated by positive/negative fixtures.
- Validator output fails on missing review metadata, missing rollback envelope, or invalid plan step structure.
- The task remains contract-only and does not introduce runtime execution paths.
- No registry mutation, janitor CLI, or apply execution is introduced.

## Forbidden
- AAF source mutation outside schema / fixture / validator scope
- registry mutation
- janitor CLI
- apply execution
- runtime scheduler changes
- no 24hr auto mutate
- no directApplyAllowed override
- no apply without human review approval
- no skip reversibility
- no skip scope-lock
- no emergency bypass

## Plain-language Anchor
這張卡先做「罰單格式驗證器」，不是拖吊車，也不是自動施工隊。

## Notes
Phase 1 should stay declarative and validator-first. Any attempt to wire CLI, runtime apply, or registry mutation is out of scope.