---
task_id: TASK-SKL-0016
title: Root-drop release source list stale generated output guard
status: done
milestone: P1
depends_on:
  - TASK-SKL-0014
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "scripts/build-root-drop-release.ts"
  - "tests/cli/root-drop-release-source-list.test.ts"
  - "release/atm-root-drop/**"
  - "release/atm-onefile/**"
  - "packages/cli/dist/**"
deliverables:
  - "scripts/build-root-drop-release.ts"
  - "tests/cli/root-drop-release-source-list.test.ts"
  - "release/atm-root-drop/**"
  - "release/atm-onefile/**"
validators:
  - "node --strip-types tests/cli/root-drop-release-source-list.test.ts"
  - "node --strip-types scripts/build-root-drop-release.ts"
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
producer:
  - "2026-07-20 TASK-SKL-0014 runner-sync dogfood: sealed root-drop build failed after package dist rebuild removed stale tracked generated .d.ts output still listed by git ls-files."
consumer:
  - "Runner-sync sealed build"
  - "ATM-GOV-0225 final closure standard validation"
  - "Future framework temp claim quickfix lanes"
missingData:
  - "The failure was observed during a live sealed runner build from target HEAD cbbe4d868b2243b1ce149f044165e44a71414fa0."
dataDrivenStopRule:
  - "Stop if the implementation hard-codes actor-adopt.spec.d.ts, TASK-SKL-0014, cbbe4d8, or any one generated file name instead of deriving inclusion from current filesystem state."
  - "Stop if runner-sync release artifacts are generated from an uncommitted source change."
rollback:
  strategy: revert-commit
  notes: "Revert the source-list guard and any generated release artifacts; rerun runner-sync from the previous passing HEAD if needed."
atomizationImpact:
  ownerAtomOrMap: "atm.release-root-drop-build"
  mapUpdates:
    - "scripts/AtmCore/runner-build-scope.json"
  extractionCandidates:
    - atom: "atm.root-drop-source-list"
      pattern: "Release source inventory guard"
      source: "scripts/build-root-drop-release.ts"
      disposition: "inline"
      inlineReason: "The change is one filter in the existing source inventory helper and does not introduce a new module boundary."
out_of_scope:
  - "Do not hand-edit .atm/runtime runner-sync queues."
  - "Do not fold this repair into ATM-GOV-0225 final closure scope."
  - "Do not create file-name-specific exceptions for stale generated outputs."
nonGoals:
  - "No rewrite of the sealed runner build pipeline."
  - "No task ledger or ErrorCode registry changes in this card."
completed_at: "2026-07-20T20:41:28.775Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-07-20T20:41:28.775Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T20-41-28-775Z-close-0e01bae5d684"
lastTransitionAt: "2026-07-20T20:41:28.775Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "70914e2659bb6bc3ac23e45da3b4f4276d2087da"
---

# TASK-SKL-0016

## Goal

Make root-drop release assembly resilient to stale tracked generated outputs that
are still visible in the Git index but no longer exist in the sealed build
worktree after package dist regeneration.

## Current Finding

During runner-sync for TASK-SKL-0014, ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run
build rebuilt package dist outputs and then failed while assembling
release/atm-root-drop:

```text
ENOENT: no such file or directory, stat '.../packages/cli/dist/commands/__tests__/actor-adopt.spec.d.ts'
```

The root-drop source inventory currently includes git ls-files --cached paths
without confirming that the file still exists in the current sealed worktree.
Generated dist declarations may be tracked from an older build shape, then be
removed by the package-dist rebuild before root-drop copy begins.

## Required Design

Filter the release source inventory against the current filesystem state before
copying. The rule must be data-driven and generic: include release entries and
generated runtime files only when they exist at copy time; never special-case one
missing declaration file or one task id.

## Acceptance

- scripts/build-root-drop-release.ts no longer attempts to copy missing tracked
  generated files from packages/*/dist.
- A focused test proves a tracked-but-missing release source path is excluded
  while existing release source paths are preserved.
- Root-drop assembly succeeds after a package dist rebuild.
- Runner-sync can rebuild frozen release artifacts from the committed source
  HEAD and publish the normal receipt.

## Verification

```bash
node --strip-types tests/cli/root-drop-release-source-list.test.ts
node --strip-types scripts/build-root-drop-release.ts
npm run typecheck
npm run validate:cli
git diff --check
```
