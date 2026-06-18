---
task_id: TASK-CID-0093
doc_id: doc_cid_0093
title: "Generic JSON record adapter and conflict keys"
status: done
owner: atm-core
priority: P0
milestone: M19
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0092"
scopePaths:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/json-record.ts"
  - "packages/core/src/broker/__tests__/json-record-adapter.test.ts"
deliverables:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/json-record.ts"
  - "packages/core/src/broker/__tests__/json-record-adapter.test.ts"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert generic JSON adapter and tests."
atomizationImpact:
  ownerAtomOrMap: "atm.generic-json-record-adapter"
outOfScope:
  - "path-to-atom-map domain rules"
  - "Array semantic merge beyond conservative replace"
nonGoals:
  - "Do not allow concurrent direct writes to JSON files."
completed_at: "2026-06-18T06:03:04.110Z"
completed_by_agent: "captain"
delivery_commit: "31fd89ff0b359edf8641e0a6c11d4449c11a9ca8"
---

# TASK-CID-0093 - Generic JSON record adapter and conflict keys

## Goal

Implement the generic JSON adapter that turns JSON pointer targets into record-level conflict keys.

## Required Behavior

- Parse JSON deterministically.
- Normalize JSON mutation requests into typed operations.
- Compute conflict keys from file path and JSON pointer.
- Merge non-overlapping object mutations.
- Reject or serialize overlapping non-commutative mutations.

## Acceptance Criteria

- Two upserts to different object keys in the same JSON file can be planned as one broker batch.
- Two writes to the same JSON pointer are not marked parallel-safe unless the adapter explicitly says the operation is commutative.
- Invalid JSON or validation failure blocks write and records failed evidence.

## Validation

```powershell
npm run typecheck
npm test
git diff --check
```
