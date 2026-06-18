---
doc_id: ""
task_id: TASK-AAO-0118
title: "opener-first active-claim commit guard MVP"
milestone: M16
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: applied
started_at: "2026-06-18T15:33:00+08:00"
started_by_agent: "cursor-gpt-5.2"
depends_on:
  - TASK-AAO-0117
targetRepo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
owner: atm-core
priority: P0
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "packages/cli/src/commands/hook.ts"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "packages/cli/src/commands/hook.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
targetAllowedFiles:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "packages/cli/src/commands/hook.ts"
forbidden_files:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/git-head-evidence.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/validate-cli.ts"
  - "package.json"
  - "release/"
  - "scratch/"
  - ".atm/history/"
non_goals:
  - "Do not mutate AAF source files."
  - "Do not guess the next task id outside the opener-first flow."
  - "Do not stage or commit unrelated dirty or untracked files."
notes: "2026-06-02 | status: open | validation: pending | change: Phase 0 open card for opener-first active-claim commit guard MVP | blocker: none | risk: next-id guessing / trailer-guard drift"
completed_at: "2026-06-18T15:40:38.706Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "2c6f90664"
---

# TASK-AAO-0118 opener-first active-claim commit guard MVP

## Goal
Open the formal Phase 0 planning card for the opener-first active-claim commit guard MVP and make the opener-first flow the first defense.

## Background
TASK-AAO-0116 pressure-tested the failure mode where AI tries to guess a task id or bypass the card-opening route.
This card closes that gap by making the generic opener flow the first gate before any claim or commit action.

Depends on TASK-AAO-0117 for sequencing.
This is still Phase 0 planning work in 3KLife, and it does not touch AAF source in this turn.

## Phase 1 Scope Amendment
- Frontmatter now uses `scopePaths` for the AAF target-repo implementation surface and `planning_read_only_paths` for the 3KLife planning context.
- The 3KLife planning files above remain Phase 0 planning context; they must not become target-repo write leases.
- The AAF implementation scope for this card stays limited to the Phase 1A files listed below.
- Broad `C:/Users/User/AI-Atomic-Framework/**` is intentionally removed from `forbidden_files`; otherwise it subtracts the executable Phase 1 scope during import.

## Phase 1A Scope
- Add a commit wrapper MVP.
- Add active-claim support.
- Add a trailer guard MVP.
- Keep the wrapper narrow and mechanical; do not fold close attestation into this phase.

## Phase 1B Scope
- Add close target attestation.
- Keep attestation separate from the commit wrapper.

## Phase 1C Scope
- Add hook template strengthening.
- Add commit-msg strengthening.
- Keep hook/template hardening separate from the claim guard and close attestation work.

## Runner Sync
- Runner sync gets its own card.
- Do not merge runner sync into 0118.

## Acceptance Case
- The opener-first flow is the first defense, and AI must not guess the next task id.
- Phase 1A stays limited to commit wrapper, active-claim, and trailer guard MVP.
- Phase 1B stays limited to close target attestation.
- Phase 1C stays limited to hook template and commit-msg strengthening.
- Runner sync stays on a separate side-path card.
- Phase 0 does not touch AAF source.

## Acceptance Criteria
- The generic opener flow remains the first entry gate for new task ids.
- The card explicitly blocks AI from guessing the next task id.
- Phase 1A does not absorb close attestation.
- Phase 1B does not absorb hook/template hardening.
- Runner sync is not merged into 0118.
- The Phase 0 card remains read-only for AAF source files.

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/git-governance.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/git.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts`

## Phase 1 Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/git-head-evidence.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/evidence.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-cli.ts`
- `C:/Users/User/AI-Atomic-Framework/package.json`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `C:/Users/User/AI-Atomic-Framework/scratch/**`
- `C:/Users/User/AI-Atomic-Framework/.atm/history/**`

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0118-opener-first-active-claim-commit-guard-mvp.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json`
- `C:/Users/User/3KLife/docs/tasks/tasks-atm/.shardrc.json`

## Forbidden Files
- `C:/Users/User/AI-Atomic-Framework/**`
- `C:/Users/User/3KLife/.atm/**`
- `C:/Users/User/3KLife/.tmp/**`
- `C:/Users/User/3KLife/examples/**`

## Validators
- `git diff --check origin/main..HEAD`
- `git diff --name-status fd8b4de..HEAD`
- `npm run typecheck`
- `npm run validate:cli`

## Plain-language Anchor
This card only installs the "do not guess the license plate" gate.
It does not repair the whole car.
