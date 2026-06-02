---
doc_id: ""
task_id: TASK-AAO-0116
title: "atm actor adopt — atomic identity switch subcommand"
milestone: M16
status: in-progress
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: "2026-06-02T17:00:00+08:00"
started_by_agent: "claude-code-builder"
blocked_by: []
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-actor-adopt-subcommand
planning_repo: 3KLife
closure_authority: target_repo
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0116-actor-adopt.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-atm.json
  - C:/Users/User/3KLife/docs/tasks/tasks-atm/tasks-atm-part-*.json
  - C:/Users/User/3KLife/docs/agent-identity-map.md
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/actor.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/actor-registry.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/actor.spec.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/__tests__/actor-adopt.spec.ts
  - C:/Users/User/AI-Atomic-Framework/docs/governance/actor-identity-model.md
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/batch.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/git-head-evidence.ts
  - C:/Users/User/AI-Atomic-Framework/release/**
  - C:/Users/User/AI-Atomic-Framework/.atm/git-hooks/**
non_goals:
  - "Do not implement staleness detection on runtime/identity/default.json (separate card)."
  - "Do not wire actor verify-git into pre-commit gate (separate card)."
  - "Do not change actors.json schema or schemaVersion."
  - "Do not modify other actor sub-actions (register / list / resolve / verify-git)."
notes: "2026-06-02 | status: in-progress | phase0 planning card; phase1 adds adopt subcommand that atomically writes actor record + runtime default + git local config in one transaction."
---

# TASK-AAO-0116 atm actor adopt — atomic identity switch subcommand

## Goal
Add `node atm.mjs actor adopt` subcommand that collapses the 4 manual identity-sync steps (register actor → write runtime default → set git config → bind session) into a single atomic transaction. Eliminates the staleness loop where a new session inherits the prior agent's git config + runtime default identity.

## Problem (from TASK-AAO-0115 retrospective)
- `resolveActorId()` already dynamic (env → runtime default).
- But git local config, `.atm/runtime/identity/default.json`, and `.atm/catalog/registry/actors.json` are three independent caches.
- New session has no env vars → falls back to repo-default → inherits prior agent's identity verbatim → commits get tagged with wrong author.
- `actor verify-git` is detect-only, never auto-corrects.

## Phase 0 Scope
- Open this card and ledger in 3KLife.
- Patch `docs/agent-identity-map.md` so the prescribed flow uses `atm actor adopt` instead of manual git config.
- Do not touch AAF source in this turn.

## Phase 1 Scope (AAF)
- `packages/cli/src/commands/actor.ts` — add `adopt` action handler + `runActorAdopt`.
- `packages/cli/src/commands/actor-registry.ts` — add helpers: `composeAdoptSlug`, `writeGitLocalConfig`, `snapshotGitLocalConfig` (for rollback).
- `packages/cli/src/commands/command-specs/actor.spec.ts` — register `adopt` action surface.
- `packages/cli/src/commands/__tests__/actor-adopt.spec.ts` — new test covering happy path + rollback.
- `docs/governance/actor-identity-model.md` — document `adopt` and its relation to `register` / `verify-git`.

## Command Contract
```
node atm.mjs actor adopt
  --editor <claude-code|vs-code|vs-insiders|codex|...>
  --model  <model-slug, e.g. opus-4-7 / gemini-3-5-flash>
  --kind   <human|ai-agent|automation>   [default: ai-agent]
  --session <sessionId>                   [optional]
  --display-name <name>                   [optional, defaults to slug]
  --json
```

Transaction order:
1. Compose slug = `<editor>-<model>` (e.g. `claude-code-opus-4-7`).
2. Snapshot current git local config (for rollback).
3. `upsertActorRecord({ actorId: slug, actorKind, displayName, editor, gitName: slug, gitEmail: slug+'@3klife.local' })`.
4. `git config --local user.name <slug>` + `git config --local user.email <slug>@3klife.local`.
5. `writeRuntimeIdentityDefault({ actorId: slug, gitName, gitEmail, activeSessionId, editor, updatedAt: now })`.
6. Emit evidence: `{ actorId, previousActorId, gitConfigChanged: bool, runtimeDefaultPath, registryPath }`.

If any step ≥3 fails → roll back git config to snapshot + abort, don't leave half-written runtime default.

## Validators
- `npm run typecheck`
- `npm run validate:cli`
- `node atm.mjs actor adopt --editor codex --model adopt-test-bot --kind ai-agent --json` succeeds
- `node atm.mjs actor verify-git --id codex-adopt-test-bot --json` passes immediately after
- New test `actor-adopt.spec.ts` green (happy path + rollback path)
- `git diff --check`

## Forbidden
- No change to `actors.json` schema or `actorRegistryRelativePath`.
- No mutation of other actor actions.
- No staleness detection (separate card).
- No pre-commit gate wiring (separate card).
- No removal of legacy `AGENT_IDENTITY` env support.

## Rollback Hint
- Revert two AAF commits (feat + closure).
- Revert one 3KLife commit (open).
- No downstream consumers yet — `adopt` is additive only.

## Execution Steps
1. Phase 0: write this card + ledger entry + agent-identity-map.md update, 1 commit in 3KLife.
2. Phase 1: implement adopt + tests + docs, 2 commits in AAF (feat + chore closure ledger).
