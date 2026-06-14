---
task_id: TASK-CID-0090
doc_id: doc_cid_0090
title: "Runner Sync Steward v1 CID bridge"
status: planned
owner: atm-core
priority: P0
milestone: M18
related_plan: docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0087"
  - "TASK-CID-0088"
  - "TASK-CID-0089"
  - "TASK-MAO-0011"
  - "TASK-MAO-0012"
  - "TASK-MAO-0013"
scopePaths:
  - "atm.mjs"
  - "package.json"
  - "scripts/build-onefile-release.ts"
  - "scripts/build-root-drop-release.ts"
  - "scripts/validate-runner-reproducibility.ts"
  - "scripts/validate-runner-build-scope.ts"
  - "scripts/validate-runner-entrypoints.ts"
  - "scripts/AtmCore/"
  - "release/atm-onefile/"
  - "release/atm-root-drop/"
  - "docs/reports/runner-reproducibility-audit.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-runner-reproducibility.ts"
  - "scripts/validate-runner-build-scope.ts"
  - "scripts/validate-runner-entrypoints.ts"
  - "scripts/AtmCore/runner-build-scope.json"
  - "scripts/AtmCore/README.md"
  - "release/atm-onefile/atm.mjs"
  - "release/atm-onefile/release-manifest.json"
  - "release/atm-root-drop/release-manifest.json"
  - "docs/reports/runner-reproducibility-audit.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-runner-reproducibility.ts --mode validate"
  - "node --strip-types scripts/validate-runner-build-scope.ts --mode validate"
  - "npm run validate:runner-entrypoints"
  - "npm run build"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert runner sync steward validators, AtmCore manifest, and release reproducibility normalizations."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-sync-steward-v1"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Full Runner Broker refs"
  - "Patch-envelope submit pipeline"
  - "External core contributor pipeline"
nonGoals:
  - "Do not require ordinary source-writing agents to publish release artifacts."
---

# TASK-CID-0090 - Runner Sync Steward v1 CID bridge

## Goal

Bridge the CID follow-up repair lane to the MAO `TASK-MAO-0011` through
`TASK-MAO-0013` implementation slice: reproducible runner audit, runner build
scope manifest, and stale-runner / steward classifier surface.

## Trigger

The captain decision on 2026-06-14 established `Runner Sync Steward v1` as the
right first rollout before full Runner Broker mechanics.

## Required Behavior

- Prove or remediate runner build reproducibility before publishing broader
  runner governance.
- Declare runner-affecting source/build/release surfaces in a machine-readable
  manifest.
- Expand stale-runner detection so `packages/core/src`,
  `packages/plugin-governance-local/src`, schemas, root launchers, and declared
  build scripts cannot silently bypass `ATM_RUNNER_SYNC_REQUIRED`.

## Acceptance Criteria

- `TASK-MAO-0011` to `TASK-MAO-0013` deliverables exist in the target repo.
- Ordinary source tasks can stop at `runner-sync-needed`; generated
  `release/**` publication is reserved for the steward lane.
- This bridge task is the steward lane that may commit the accumulated
  `release/**` generated artifacts after `npm run build` and release validators
  pass.
- Full Broker refs and external contributor flow remain deferred.

## Validation

```powershell
npm run typecheck
node --strip-types scripts/validate-runner-reproducibility.ts --mode validate
node --strip-types scripts/validate-runner-build-scope.ts --mode validate
npm run validate:runner-entrypoints
npm run build
git diff --check
```
