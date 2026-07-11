---
doc_id: doc_rft_0015
task_id: TASK-RFT-0015
title: "Onefile frozen runner executes stale generation via nested launcher recursion (payload embeds previous release/atm-onefile)"
status: done
owner: atm-core
priority: P0
milestone: RFT-M5
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/build-root-drop-release.ts"
  - "scripts/build-onefile-release.ts"
  - "scripts/launcher-entrypoint-guards.ts"
  - "scripts/validate-onefile-release.ts"
  - "scripts/validate-runner-reproducibility.ts"
  - "scripts/validate-runner-entrypoints.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:onefile-release"
  - "npm run validate:runner-reproducibility"
  - "npm run validate:runner-entrypoints"
  - "git diff --check"
deliverables:
  - "scripts/build-root-drop-release.ts"
  - "scripts/validate-onefile-release.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if excluding release/ from the root-drop payload breaks adopter bootstrap or internal-release sync flows."
atomizationImpact:
  ownerAtomOrMap: "atm.release-pipeline"
  mapUpdates: []
outOfScope:
  - "Changing the pinned-runner adopter sync flow (internal-release.ts)"
  - "Changing the onefile payload format"
nonGoals:
  - "Do not band-aid by clearing caches; the payload content itself must stop embedding a previous-generation onefile launcher"
completed_at: "2026-07-06T15:43:01.847Z"
completed_by_agent: "codex"
closedAt: "2026-07-06T15:43:01.847Z"
closedByActor: "codex"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-06T15-43-01-848Z-close-f5d868566140"
lastTransitionAt: "2026-07-06T15:43:01.848Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b324b8b86b69b46b6f5e3d3547440de5ee9bede8"
---

# TASK-RFT-0015 — Onefile nested launcher recursion runs stale runner

## Symptom (verified 2026-07-03)

`node atm.mjs <cmd>` in the framework repo silently executes an ancient runner
generation. Verified chain: freshly built onefile payload `5c97f4…` extracts a
tree that still contains `release/atm-onefile/atm.mjs` from the previous build
(payload `969ede…`); the extracted root `atm.mjs` launcher prefers
`release/atm-onefile/atm.mjs`, so execution recurses generation by generation
until terminus payload `2d9490…` (a tree with no nested onefile). Every frozen
invocation therefore runs the `2d9490` era code, and no amount of
`ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build` changes frozen behavior.

Reproduce: `node atm.mjs next --prompt x --json` reports
`ATM_RUNNER_MODE.entrypoint = …/atm-onefile-cache/2d9490…/atm.mjs` while
`release/atm-onefile/atm.mjs` embeds `payloadSha256 = 5c97f4…`.

## Root Cause

`buildRootDropRelease` includes the repo's current (i.e. previous-generation)
`release/atm-onefile/atm.mjs` in the root-drop tree, and `buildOnefileRelease`
embeds that whole tree. `assertPayloadLauncherIsNotNested` only checks the
root-drop entry `atm.mjs`, not nested `release/**` copies (regression relative
to intent of commit 250b91334 "prevent nested onefile launcher recursion").

## Fix

- Exclude `release/**` from the root-drop payload collection (or make the
  extracted-entry launcher skip the nested onefile path).
- Extend `validate:onefile-release` to fail when the decoded payload contains
  any `release/atm-onefile/atm.mjs` entry, so the regression cannot return.
- After the fix, confirm `ATM_RUNNER_MODE.entrypoint` hash equals the payload
  sha embedded in `release/atm-onefile/atm.mjs`.

## Why P0

All frozen-mode governance behavior (gates, hooks, audit) is silently
generations old; source fixes appear to land but never take effect for
`node atm.mjs` users.
