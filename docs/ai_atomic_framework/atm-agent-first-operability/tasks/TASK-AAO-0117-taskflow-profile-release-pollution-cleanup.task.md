---
doc_id: ""
task_id: TASK-AAO-0117
title: "taskflow.profile release tracked pollution cleanup"
milestone: M16
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: applied
started_at: "2026-06-18T15:30:00+08:00"
started_by_agent: "cursor-gpt-5.2"
depends:
  - TASK-AAO-0115
targetRepo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
owner: atm-core
priority: P0
scopePaths:
  - "packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "release/atm-onefile/atm.mjs"
  - "release/atm-onefile/README.onefile.md"
  - "release/atm-onefile/release-manifest.json"
deliverables:
  - "packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "release/atm-onefile/atm.mjs"
  - "release/atm-onefile/README.onefile.md"
  - "release/atm-onefile/release-manifest.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
targetAllowedFiles:
  - "packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "release/atm-onefile/atm.mjs"
  - "release/atm-onefile/README.onefile.md"
  - "release/atm-onefile/release-manifest.json"
forbidden_files:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "schemas/taskflow-profile.v1.json"
  - "fixtures/taskflow-profile/"
  - "docs/specs/taskflow-profile-v1.md"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/batch.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/git-head-evidence.ts"
non_goals:
  - "Do not mutate AAF source files."
  - "Do not delete local release artifacts."
  - "Do not change TASK-AAO-0115 taskflow functionality."
  - "Do not interfere with claude-code-builder claimed or staged actor-adopt work."
  - "Do not stage or commit unrelated dirty files."
notes: "2026-06-02 | status: open | validation: pending | change: Phase 0 open card for TASK-AAO-0115 release tracked pollution cleanup | blocker: none | risk: release-tracked cleanup drift / claimed-work interference"
completed_at: "2026-06-18T15:29:48.812Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "d8e46172a"
---

# TASK-AAO-0117 taskflow.profile release tracked pollution cleanup

## Goal
Open the Phase 0 planning card for the TASK-AAO-0115 release pollution cleanup, so we can remove tracked `release/atm-onefile/**` noise without deleting the local release artifacts.

## Background
TASK-AAO-0115 completed, but the closure commit accidentally carried `release/atm-onefile/**` in the tracked set even though the 0115 card forbade `release/**`.
That is a commit hygiene problem, not a taskflow functionality problem.

This card only defines the cleanup guardrail in 3KLife.
It does not touch AAF source in this turn, and it does not remove the local release files from disk.

## Phase 1 Scope
- targetRepo: `AI-Atomic-Framework`
- closure_authority: `target_repo`
- Remove tracked `release/atm-onefile/**` pollution from the TASK-AAO-0115 closure range.
- Preserve the local release artifacts on disk; do not delete the physical files.
- If `git diff --check origin/main..HEAD` still reports EOF blank-line issues, only the two designated test files may be used for EOF-only fixes.
- Do not change TASK-AAO-0115 taskflow behavior or implementation.
- Do not touch the claude-code-builder actor-adopt work that is currently claimed/staged.

## Acceptance Case
- The tracked set no longer includes `release/atm-onefile/**` pollution from the 0115 closure range.
- Local release artifacts remain on disk after the cleanup.
- Any EOF blank-line repair stays limited to the two test files.
- The 0115 taskflow functionality remains unchanged.
- The actor-adopt work remains untouched.

## Acceptance Criteria
- `release/atm-onefile/**` is removed from the tracked commit range associated with TASK-AAO-0115.
- The local release artifacts still exist on disk after the cleanup.
- `git diff --check origin/main..HEAD` is clean, or only requires EOF-only fixes in the two named test files.
- `git diff --name-status fd8b4de..HEAD` reflects the intended cleanup scope only.
- The 0115 taskflow implementation remains unchanged.
- Claimed/staged actor-adopt work is not modified or disrupted.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/README.onefile.md`
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/atm.mjs`
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/release-manifest.json`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`

## Phase 1 Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow/profile-loader.ts`
- `C:/Users/User/AI-Atomic-Framework/schemas/taskflow-profile.v1.json`
- `C:/Users/User/AI-Atomic-Framework/fixtures/taskflow-profile/*.json`
- `C:/Users/User/AI-Atomic-Framework/docs/specs/taskflow-profile-v1.md`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/batch.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/evidence.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/git-head-evidence.ts`

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0117-taskflow-profile-release-pollution-cleanup.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/**`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0115-*.task.md`

## Validators
- `git diff --check origin/main..HEAD`
- `git diff --name-status fd8b4de..HEAD`
- `npm run typecheck`
- `npm run validate:cli`

## Plain-language Anchor
This card only unhooks the unwanted release box from the tracked commit.
It does not rebuild the engine, and it does not delete the box from the garage.
