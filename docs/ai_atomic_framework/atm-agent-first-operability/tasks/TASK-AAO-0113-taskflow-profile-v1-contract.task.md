---
doc_id: ""
task_id: TASK-AAO-0113
title: "taskflow.profile.v1 contract"
milestone: M16
status: in-progress
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: "2026-06-02T15:20:40.2434051+08:00"
started_by_agent: "codex-gpt-5.4-mini"
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-taskflow-profile-v1-contract
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0113-taskflow-profile-v1-contract.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/taskflow.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/atm.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
  - C:/Users/User/AI-Atomic-Framework/schemas/taskflow-profile.v1.json
  - C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/valid.profile.json
  - C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/invalid-missing-schema-id.profile.json
  - C:/Users/User/AI-Atomic-Framework/docs/specs/taskflow-profile-v1.md
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/batch.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/lock.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/status.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/review.ts
  - C:/Users/User/AI-Atomic-Framework/.atm/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - C:/Users/User/AI-Atomic-Framework/docs/ai_atomic_framework/**
  - C:/Users/User/AI-Atomic-Framework/examples/**
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0112-*.task.md
non_goals:
  - "Do not mutate AAF source files outside the explicit allowed_files whitelist."
  - "Do not implement a second lifecycle."
  - "Do not write task card, ledger, or shard from dry-run mode."
  - "Do not mirror claim or close status."
  - "Do not import, require, or spawn the 3KLife opener."
  - "Do not touch TASK-AAO-0112."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-02 | status: in-progress | phase0 scope amendment; Phase 1 adds schema/loader/tests; supportsWrite=false"
---

# TASK-AAO-0113 taskflow.profile.v1 contract

Open the Phase 0 planning card for `taskflow.profile.v1` and keep Phase 1 ready for schema / loader / tests.

## Summary
- `TASK-AAO-0112` is the prerequisite skeleton route.
- Phase 1 uses the schema / loader / fixtures / focused tests listed in `allowed_files`.
- `taskflow.profile.v1.supportsWrite` stays `false`.
- The profile layer only advertises capability and delegation entry; it does not write task card, ledger, or shard data.

## Phase 0 Scope
- Keep this 3KLife planning card open.
- Update only the tasks-atm ledger/shard.
- Do not touch AAF source.

## Phase 1 Rules
- targetRepo: `AI-Atomic-Framework`
- closure_authority: `target_repo`
- No task card, ledger, or shard writes.
- No claim/close wiring.
- No import, require, or spawn of the 3KLife opener.
- No second lifecycle or second writer.
- `supportsWrite` stays `false`.

## Validators
- `npm run typecheck`
- `npm run validate:cli`
- `node atm.mjs taskflow open --profile fixtures/taskflow-profile/valid.profile.json --dry-run --json`
- `node atm.mjs taskflow open --profile fixtures/taskflow-profile/valid.profile.json --write --json`
- `node atm.mjs taskflow open --profile fixtures/taskflow-profile/invalid-missing-schema-id.profile.json --dry-run --json`
- `git diff --check`

## Rollback
- Remove only the Phase 1 allowlist and validators from this card.
