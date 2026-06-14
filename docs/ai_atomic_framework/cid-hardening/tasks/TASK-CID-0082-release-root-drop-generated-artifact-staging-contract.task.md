---
task_id: TASK-CID-0082
doc_id: doc_cid_0082
title: "Release root-drop generated-artifact staging contract"
status: planned
owner: atm-core
priority: P1
milestone: M17
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0073"
scopePaths:
  - "scripts/build-root-drop-release.ts"
  - "scripts/build-onefile-release.ts"
  - ".gitignore"
  - "release/atm-root-drop/release-manifest.json"
deliverables:
  - "scripts/build-root-drop-release.ts"
  - "scripts/build-onefile-release.ts"
  - ".gitignore"
validators:
  - "npm run typecheck"
  - "npm run build"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if the staging contract starts forcing unrelated ignored files into release commits or weakens the ignored-artifact boundary."
atomizationImpact:
  ownerAtomOrMap: "atm.release-root-drop-staging-contract"
  mapUpdates:
    - "scripts/build-root-drop-release.ts"
    - "scripts/build-onefile-release.ts"
outOfScope:
  - "Publishing or pushing release artifacts"
  - "Changing release payload contents unrelated to staging truthfulness"
nonGoals:
  - "Do not require hidden `git add -f` knowledge for governed release artifacts that ATM itself generates."
  - "Do not unignore broad release directories just to make staging easier."
---

# TASK-CID-0082 - Release root-drop generated-artifact staging contract

## Goal

Make release/root-drop sync reproducible without relying on operator memory for
which newly generated ignored artifacts must be force-staged.

## Problem

The captain release-sync cleanup showed that generated root-drop files can be
real release deliverables while still sitting behind ignored-artifact behavior.
That is a usability bug because the governed release lane currently depends on
hidden `git add -f` knowledge.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Keep any extraction limited to release staging guidance or generated-artifact
  selection helpers inside this card's scope.
- ATM's release/build path must make it explicit which ignored generated files
  belong in the governed release bundle.
- The contract must not broaden staging to unrelated ignored files.
- Validation must prove a rebuilt release bundle can be staged reproducibly
  without hidden manual knowledge.

## Acceptance Criteria

- Release/root-drop sync no longer depends on undocumented `git add -f`
  behavior for expected generated artifacts.
- Unrelated ignored files remain excluded.
- Build plus validation prove the staging contract is reproducible.

## Validation

```powershell
npm run typecheck
npm run build
npm run validate:cli
git diff --check
```

## Report Back

Report the new staging contract, how expected generated artifacts are surfaced,
and the guardrail that still excludes unrelated ignored files.
