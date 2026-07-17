---
task_id: TASK-SYNC-0001
title: Runner sync after dispatch planning gate adapter parity
status: planned
owner: atm-runner-sync
priority: P0
depends_on:
  - TASK-SKL-0013
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - release/atm-onefile/atm.mjs
  - release/atm-root-drop/**
  - .atm/history/evidence/TASK-SYNC-0001.*
  - .atm/history/task-events/TASK-SYNC-0001/**
  - .atm/history/tasks/TASK-SYNC-0001.json
deliverables:
  - release/atm-onefile/atm.mjs
  - release/atm-root-drop/**
validators:
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-steward
  mapUpdates: []
---

# TASK-SYNC-0001 - Runner Sync After Dispatch Planning Gate Adapter Parity

## Context

`TASK-SKL-0013` added the Planning Authority Resolution Gate to the ATM skill
source template and installed adapter surfaces. A follow-up adapter parity
commit refreshed editor-facing `atm-dispatch` adapter files from the source
template. That made the frozen runner older than framework source, so release
artifacts must be rebuilt by an active runner-sync steward task rather than by
the already terminal `TASK-SKL-0013`.

## Required Behavior

- Claim this task as the runner-sync steward lane.
- Enqueue runner-sync work for the sealed source commit that contains the
  dispatch adapter parity change.
- Run `ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build`.
- Commit the resulting release artifacts and runner-sync governance evidence.
- Release the runner-sync steward queue entry with a receipt reference or
  digest.

## Acceptance Criteria

- `release/atm-onefile/atm.mjs` and `release/atm-root-drop/**` match the sealed
  source commit after the adapter parity update.
- `node atm.mjs doctor --json` no longer reports `ATM_RUNNER_SYNC_REQUIRED` for
  the dispatch adapter parity source.
- No source planning cards are created in the ATM target repo; target receives
  only imported `.atm/history/**` ledger state for this card.

## Validation

Run:

```shell
ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
node atm.mjs doctor --json
```
