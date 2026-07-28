---
doc_id: ""
task_id: TASK-AAO-0115
title: "taskflow.profile.v1 contract completion / de-hardcode dry-run"
milestone: M16
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: applied
started_at: "2026-06-19T23:00:00+08:00"
started_by_agent: "cursor-gpt-5.2"
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-taskflow-profile-v1-contract-completion
planning_repo: 3KLife
closure_authority: target_repo
depends_on:
  - TASK-AAO-0113
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "schemas/taskflow-profile.v1.json"
  - "fixtures/taskflow-profile/valid.profile.json"
  - "fixtures/taskflow-profile/invalid-missing-schema-id.profile.json"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "schemas/taskflow-profile.v1.json"
  - "fixtures/taskflow-profile/valid.profile.json"
  - "fixtures/taskflow-profile/invalid-missing-schema-id.profile.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
targetAllowedFiles:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "schemas/taskflow-profile.v1.json"
  - "fixtures/taskflow-profile/valid.profile.json"
  - "fixtures/taskflow-profile/invalid-missing-schema-id.profile.json"
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0115-taskflow-profile-v1-contract-completion.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
  - C:/Users/User/AI-Atomic-Framework/schemas/taskflow-profile.v1.json
  - C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/valid.profile.json
  - C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/invalid-missing-schema-id.profile.json
  - C:/Users/User/AI-Atomic-Framework/docs/specs/taskflow-profile-v1.md
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/batch.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/evidence.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/git-head-evidence.ts
  - C:/Users/User/AI-Atomic-Framework/release/**
non_goals:
  - "Do not import, require, or spawn the 3KLife opener."
  - "Do not write task card, ledger, or shard files from the dry-run route."
  - "Do not implement write mode in taskflow.profile.v1."
  - "Do not reopen or rewrite TASK-AAO-0113."
  - "Do not touch TASK-AAO-0114."
notes: "2026-06-20 | status: done | validation: pass | change: governance close historical delivery 318d40b62 team team-0f0dde907b5a | blocker: none | risk: profile contract drift"
completed_at: "2026-06-20T02:11:34.622Z"
completed_by_agent: "cursor-gpt-5.2"
lastTransitionId: "2026-06-20T02-11-34-561Z-close-19c5c51f1594"
delivery_commit: "318d40b62"
---

# TASK-AAO-0115 taskflow.profile.v1 contract completion / de-hardcode dry-run

## Goal
Complete the minimal `taskflow.profile.v1` contract and de-hardcode the dry-run report.

## Summary
- `TASK-AAO-0113` is the prerequisite baseline.
- `taskflow open --dry-run --json` must derive its report from profile data.
- The report must stop hard-coding `TASK-AAO-0113` and `AI-Atomic-Framework`.
- The profile must expose `taskIdPrefix`, `template`, `repoLabel`, `delegationDisplayHint`, and `delegation.writerInvocation`.
- `supportsWrite` stays `false` in v1.

## Phase 0 Scope
- Keep this card open in 3KLife.
- Update only the 3KLife planning ledger and shard.
- Do not touch AAF source in this turn.

## Phase 1 Allowed Files
- C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
- C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts
- C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts
- C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
- C:/Users/User/AI-Atomic-Framework/schemas/taskflow-profile.v1.json
- C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/valid.profile.json
- C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/invalid-missing-schema-id.profile.json
- C:/Users/User/AI-Atomic-Framework/docs/specs/taskflow-profile-v1.md

## Forbidden Lines
- No edits to `tasks.ts`, `batch.ts`, `evidence.ts`, or `git-head-evidence.ts`.
- No edits under `release/**`.
- No import, require, or spawn of the 3KLife opener.
- No task card, ledger, or shard write path from the dry-run route.
- `supportsWrite` must remain `false`.

## Input Contract
- `TASK-AAO-0113` exists and provides the loader/guard baseline.
- The dry-run report must be driven by profile fields, not baked-in constants.
- The profile must surface a stable task id prefix, template, repo label, delegation display hint, and delegation writer invocation.
- The contract remains read-only.

## Output Contract
- `node atm.mjs taskflow open --profile fixtures/taskflow-profile/valid.profile.json --dry-run --json` emits a profile-driven report.
- The report no longer hard-codes `TASK-AAO-0113` or `AI-Atomic-Framework`.
- `--write` must explicitly refuse.
- No task card, ledger, or shard writes.
- No claim/close lifecycle wiring.
- No second writer or second lifecycle.

## Validators
- `npm run typecheck`
- `npm run validate:cli`
- `node atm.mjs taskflow open --profile fixtures/taskflow-profile/valid.profile.json --dry-run --json`
- `node atm.mjs taskflow open --profile fixtures/taskflow-profile/valid.profile.json --write --json`
- `node atm.mjs taskflow open --profile fixtures/taskflow-profile/invalid-missing-schema-id.profile.json --dry-run --json`
- `git diff --check`

## Rollback Hint
- Remove the Phase 1 allowlist and validators from this card only.
- Keep TASK-AAO-0113 as the prerequisite reference.
- Do not touch AAF source.

## Execution Steps
1. Update the card and the tasks-atm shard.
2. Rebuild the thin index if summary numbers change.
3. Run encoding and diff checks.
4. Commit the 3KLife amendment only.
