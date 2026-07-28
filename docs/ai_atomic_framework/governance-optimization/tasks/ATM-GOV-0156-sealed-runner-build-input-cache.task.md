---
task_id: ATM-GOV-0156
title: Add sealed runner build input cache and timing metrics
status: done
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0150
  - ATM-GOV-0154
  - ATM-GOV-0155
  - ATM-GOV-0158
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
completed_at: "2026-07-18T07:10:34.815Z"
completed_by_agent: "atm-core"
closedAt: "2026-07-18T07:10:34.815Z"
closedByActor: "atm-core"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T07-10-34-080Z-close-a9883b099c1c"
lastTransitionAt: "2026-07-18T07:10:34.815Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b26ca22eed11d5d9022ca70c5e8f9184caa97eb1"
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

This card follows the highest parallel governance principle: Tier 0 reads and
Tier 1 private ledger/evidence/planning writes should not pay a Tier 2
build/release serialization cost when the framework build input tree is
unchanged. The cache is allowed only because the Tier 2 build input surface is
content-addressed and verified from git tree object identity.

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
- The build-skip decision is framed as a Tier 2 shared-surface proof, not as an
  emergency override or a way to trust dirty working tree content.
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

## Implementation Blueprint

Current target-repo status as of 2026-07-17T13:17:33+08:00:

- `ATM-GOV-0156` has been imported into the target repo, but claim is blocked by
  dependency `ATM-GOV-0155`.
- `ATM-GOV-0155` is released/open. Its historical delivery is
  `1f3ede5115524ed5a27b6f08662ed7f33a1d3ef1`, but closeback still requires
  command-backed validators.
- Runner-sync build validation is currently blocked by active foreign WIP from
  `TASK-RFT-0097`; ATM reports a valid active claim owned by
  `codex-task-rft-0097`, so agents must not repair, revert, stash, or commit
  those files from this lane.

Planned target implementation once the target worktree is clear and
`ATM-GOV-0156` can be claimed:

1. In `scripts/run-sealed-runner-build.ts`, add pure helpers for:
   - resolving the sealed source SHA;
   - resolving tracked build-input object IDs from the sealed commit;
   - hashing a deterministic list of `path<TAB>object-id` entries into
     `sha256:<digest>`;
   - reading/writing release manifest metadata;
   - collecting phase timings with a monotonic clock.
2. Treat the tracked build-input set as a small policy object in the build
   script. It must include at least the paths listed in Required Behavior and
   must exclude `.atm/history/**`, `.atm/runtime/**`, release output, and other
   ledger-only state.
3. Before creating the detached worktree, compute `buildInputsTreeHash` from
   `HEAD:<input-path>` object IDs. Fail closed if a required input cannot be
   resolved.
4. Read both release manifests. A cache-hit skip is allowed only when:
   - both manifests exist and parse;
   - both record the same `buildInputsTreeHash` as the current sealed commit;
   - release artifact roots have no tracked or untracked dirty output relative
     to HEAD;
   - all generated files listed by both manifests still exist.
5. On cache hit, do not create a sealed worktree and do not run TypeScript,
   root-drop, or onefile assembly. Update only manifest metadata that binds the
   release to the new sealed source SHA, including:
   - `sealedSourceSha`;
   - `buildInputsTreeHash`;
   - `buildDecision: "cache-hit-skip"`;
   - `buildPhaseTimingsMs`.
6. On cache miss, preserve the existing sealed worktree path:
   worktree add -> link node_modules -> inner build -> sync artifacts ->
   cleanup. After sync, patch both copied manifests with:
   - `sealedSourceSha`;
   - `buildInputsTreeHash`;
   - `buildDecision: "cache-miss-build"` or `"built"`;
   - `buildPhaseTimingsMs`.
7. Keep root-drop and onefile manifest producers deterministic. If practical,
   let the outer sealed build script patch build-run metadata after artifact
   sync instead of making inner release assembly depend on local runtime state.
8. Add `tests/cli/sealed-runner-build-input-cache.test.ts` as a pure-helper
   regression test. Cover unchanged input hash cache hit, source-path hash
   change cache miss, missing generated file fail-closed, and manifest metadata
   shape. Avoid requiring a full sealed build inside this focused test.

## Follow-Up Candidates

- Persistent sealed worktree with verified clean checkout and reusable
  `.tsbuildinfo`.
- Differential artifact sync for release directories.
- Batch checkpoint build-window coalescing so one wave can share a smaller
  number of real builds.
