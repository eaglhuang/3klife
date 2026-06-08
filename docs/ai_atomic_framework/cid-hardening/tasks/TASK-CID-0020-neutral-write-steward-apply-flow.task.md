---
doc_id: doc_cid_0020
task_id: TASK-CID-0020
title: "Neutral Write Steward apply flow"
status: done
completed_at: "2026-06-08T16:20:00.468Z"
completed_by_agent: "008"
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0016"
  - "TASK-CID-0018"
  - "TASK-CID-0019"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/apply-evidence.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-broker-steward.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
deliverables:
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/apply-evidence.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-broker-steward.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-broker-steward.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the steward apply commit and remove the steward CLI surface if scoped write guarantees fail."
atomizationImpact:
  ownerAtomOrMap: "atm.neutral-write-steward-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card births the neutral steward apply layer and its evidence boundary."
outOfScope:
  - "Making the steward own git.write or task.lifecycle"
  - "team plan/start integration"
  - "next claim or closeout cleanup integration"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
---

# TASK-CID-0020 - Neutral Write Steward apply flow

## Goal

Implement the steward flow that can inspect approved proposals and merge plans, then produce the final scoped patch without becoming the lifecycle or git owner of the task.

## Why This Exists

The brokered-write design only solves same-file parallel work if a neutral patch author can safely materialize the final result. This card implements that neutral apply boundary.

## Acceptance Criteria

- A steward flow can plan and apply a final patch from validated proposal and merge-plan inputs.
- Steward apply fails closed on scope-lock mismatch, file hash drift, stale base commit, or invalid merge-plan evidence.
- The steward only receives scoped file-write authority; Coordinator remains the owner of commit, evidence finalization, and task lifecycle.
- Apply produces explicit evidence that later Team and Next flows can consume.
- The steward validator is registered through `package.json` and `scripts/validators.config.json`.
- This card does not yet wire the steward into `team` or `next`.

## Notes

Compact captain cadence remains mandatory. Internal sidecars may audit permission boundaries and stop-loss conditions, but the formal worker roster stays `005` / `006` / `007`.
