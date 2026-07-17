---
task_id: ATM-GOV-0156
title: Add sealed runner build input cache and timing metrics
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0150
  - ATM-GOV-0154
  - ATM-GOV-0155
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/release-manifest.json
  - tests/cli/sealed-runner-build-input-cache.test.ts
  - docs/governance/command-surface.md
  - docs/governance/error-code-registry.json
deliverables:
  - scripts/run-sealed-runner-build.ts
  - tests/cli/sealed-runner-build-input-cache.test.ts
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/release-manifest.json
validators:
  - node --strip-types tests/cli/sealed-runner-build-input-cache.test.ts
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - npm run typecheck
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync.coalescing-steward-queue
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.sealed-runner-build-input-cache
      pattern: Policy Object
      source: scripts/run-sealed-runner-build.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0156 - Add Sealed Runner Build Input Cache And Timing Metrics

## Context

Lane-session and runner-sync dogfood exposed that `ATM_RETAIN_RELEASE_ARTIFACTS=1
npm run build` is intentionally zero-incremental: every run creates a fresh
detached worktree, performs a full TypeScript build, assembles root-drop and
onefile release artifacts, copies generated artifacts back into the target repo,
and removes the temporary worktree.

That preserves the sealed trust model, but it is more expensive than necessary
for ledger-only closeback commits. Many close commits change only `.atm/history/**`
or governance evidence while the framework build input tree remains unchanged.

## Required Behavior

- Add a content-addressed build input hash for sealed runner builds.
- Compute the hash from framework build inputs, not from ledger-only or runtime
  state. At minimum include:
  - `packages/**`
  - `scripts/**`
  - `templates/**`
  - `schemas/**`
  - `atomic_workbench/**` files that are copied into release artifacts
  - `package.json`
  - `package-lock.json`
  - `tsconfig.json`
  - `tsconfig.build.json`
- Store the hash in both release manifests as `buildInputsTreeHash`.
- If the current build input hash matches the previous release manifest hash,
  skip full sealed worktree rebuild and update only manifest metadata required
  to bind the release to the new sealed source commit.
- Preserve trust boundaries:
  - Do not use dirty working tree content as cache input.
  - Do not skip when release artifacts are missing, dirty, or inconsistent with
    the previous manifest.
  - Do not skip when any build input tree cannot be resolved from the sealed
    commit.
- Add phase timing metrics to the manifest for every build decision:
  - input hash calculation
  - worktree setup or skip decision
  - TypeScript build
  - root-drop release assembly
  - onefile release assembly
  - artifact sync
  - cleanup
  - total elapsed milliseconds
- Emit a clear CLI message for `built`, `cache-hit-skip`, and `cache-miss-build`
  outcomes.

## Acceptance Criteria

- A ledger-only commit after a successful sealed build can run
  `ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build` without doing a fresh full
  worktree checkout and TypeScript build when the build input hash is unchanged.
- A source change under build input paths forces a normal sealed build.
- Missing or modified release artifacts force a normal sealed build or fail
  closed with a clear error instead of silently trusting stale artifacts.
- Release manifests contain `buildInputsTreeHash`, sealed source commit metadata,
  build decision, and phase timing metrics.
- The implementation does not introduce a second build registry or untracked
  cache authority outside the release manifests and git tree hashes.
- Follow-up work for persistent sealed worktrees, `.tsbuildinfo` reuse, and
  differential artifact copy is explicitly left out of scope.

## Validation

Run:

```shell
node --strip-types tests/cli/sealed-runner-build-input-cache.test.ts
ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
npm run typecheck
node atm.mjs doctor --json
```

## Follow-Up Candidates

- Persistent sealed worktree with verified clean checkout and reusable
  `.tsbuildinfo`.
- Differential artifact sync for release directories.
- Batch checkpoint build-window coalescing so one wave can share a smaller
  number of real builds.

