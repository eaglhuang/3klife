---
doc_id: doc_cid_0042
task_id: TASK-CID-0042
title: "Freeze, patch envelope, checkpoint, and filesystem WIP snapshot"
status: done
owner: atm-core
priority: P1
milestone: M5
depends_on:
  - "TASK-CID-0040"
  - "TASK-CID-0041"
related_plan: docs/ai_atomic_framework/cid-hardening/agr-conflict-arbitration-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/freeze.ts"
  - "packages/core/src/broker/patch-envelope.ts"
  - "schemas/patch-envelope.schema.json"
  - "packages/core/src/broker/__tests__/freeze-protocol.test.ts"
deliverables:
  - "packages/core/src/broker/freeze.ts"
  - "packages/core/src/broker/patch-envelope.ts"
  - "schemas/patch-envelope.schema.json"
  - "packages/core/src/broker/__tests__/freeze-protocol.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/freeze-protocol.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert freeze / patch-envelope / snapshot logic if agents cannot recover safely from blocked state."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-freeze-snapshot-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Deleting source worktree changes during freeze"
  - "Auto-rollback without steward/captain verdict"
nonGoals:
  - "Do not let snapshot metadata replace a real envelope when one is available."
---

# TASK-CID-0042 - Freeze, patch envelope, checkpoint, and filesystem WIP snapshot

## Goal

Make freeze and WIP capture explicit so a blocked route can pause, snapshot, and resume without losing intent.

## Acceptance Criteria

- Freeze acknowledgement, timeout, and force-release are deterministic.
- Patch envelopes can represent partial WIP safely.
- Snapshot defaults are documented and can be validated by the implementation card.
