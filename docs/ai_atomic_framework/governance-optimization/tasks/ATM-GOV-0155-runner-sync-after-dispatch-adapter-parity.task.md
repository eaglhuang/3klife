---
task_id: ATM-GOV-0155
title: Runner sync after dispatch planning gate adapter parity
status: done
owner: atm-core
priority: P0
depends_on:
  - TASK-SKL-0013
  - ATM-GOV-0154
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
supersedes:
  - TASK-SYNC-0001
scopePaths:
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/**
  - .atm/history/evidence/ATM-GOV-0155.*
  - .atm/history/task-events/ATM-GOV-0155/**
  - .atm/history/tasks/ATM-GOV-0155.json
deliverables:
  - release/atm-onefile/atm.mjs
  - release/atm-onefile/release-manifest.json
  - release/atm-root-drop/**
validators:
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - node atm.mjs doctor --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync.coalescing-steward-queue
  mapUpdates:
    - release/atm-root-drop/atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - release/atm-root-drop/atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
completed_at: "2026-07-18T05:04:56.872Z"
completed_by_agent: "codex-gov-sequence"
closedAt: "2026-07-18T05:04:56.872Z"
closedByActor: "codex-gov-sequence"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T05-04-56-756Z-close-24c84da4392b"
lastTransitionAt: "2026-07-18T05:04:56.872Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "129c23653fd3ad479cdb1471fb24e3829b5c4639"
---

# ATM-GOV-0155 - Runner Sync After Dispatch Planning Gate Adapter Parity

## Context

`TASK-SKL-0013` added the Planning Authority Resolution Gate to the ATM skill
source template and installed adapter surfaces. A follow-up adapter parity
commit refreshed editor-facing `atm-dispatch` adapter files from the source
template.

This work belongs in the `ATM-GOV` governance optimization series, adjacent to
`ATM-GOV-0150` and `ATM-GOV-0154`, because it is runner-sync steward/release
follow-up work. It replaces the incorrectly named planning card
`TASK-SYNC-0001`, which was opened during cleanup before resolving the existing
task series authority.

## Required Behavior

- Claim this task as the runner-sync steward lane.
- Enqueue runner-sync work for the sealed source commit that contains the
  dispatch adapter parity change.
- Run `ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build`.
- Commit the resulting release artifacts and runner-sync governance evidence.
- Release the runner-sync steward queue entry with a receipt reference or
  digest.
- Preserve the external planning repo boundary: source planning cards stay in
  the planning repo, and the ATM target repo receives only imported
  `.atm/history/**` ledger state.

## Acceptance Criteria

- `release/atm-onefile/atm.mjs`, `release/atm-onefile/release-manifest.json`,
  and `release/atm-root-drop/**` match the sealed source commit after the
  adapter parity update.
- `node atm.mjs doctor --json` no longer reports `ATM_RUNNER_SYNC_REQUIRED` for
  the dispatch adapter parity source.
- The work is tracked under the `ATM-GOV` governance optimization sequence
  rather than an ad hoc `TASK-SYNC` prefix.
- The incorrectly named `TASK-SYNC-0001` source planning card is removed from
  the planning repo. Traceability to the previously imported target ledger entry
  is retained only through this card's `supersedes` metadata.

## Validation

Run:

```shell
ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
node atm.mjs doctor --json
```
