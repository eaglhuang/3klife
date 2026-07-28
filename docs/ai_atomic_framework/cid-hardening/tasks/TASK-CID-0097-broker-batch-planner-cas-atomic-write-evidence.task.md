---
task_id: TASK-CID-0097
doc_id: doc_cid_0097
title: "Broker batch planner, CAS, and atomic write evidence"
status: done
owner: atm-core
priority: P0
milestone: M19
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0093"
  - "TASK-CID-0095"
  - "TASK-CID-0096"
scopePaths:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/registry.ts"
  - "packages/core/src/broker/adapters/batch-planner.ts"
  - "packages/core/src/broker/adapters/cas.ts"
  - "packages/core/src/broker/apply-evidence.ts"
  - "packages/core/src/broker/__tests__/batch-planner.test.ts"
  - "packages/cli/src/commands/broker.ts"
  - "schemas/broker/mutation-batch-plan.schema.json"
  - "scripts/validate-schemas.ts"
deliverables:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/registry.ts"
  - "packages/core/src/broker/adapters/batch-planner.ts"
  - "packages/core/src/broker/adapters/cas.ts"
  - "packages/core/src/broker/apply-evidence.ts"
  - "packages/core/src/broker/__tests__/batch-planner.test.ts"
  - "packages/cli/src/commands/broker.ts"
  - "schemas/broker/mutation-batch-plan.schema.json"
  - "scripts/validate-schemas.ts"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert batch planner, CAS flow, and evidence schema changes."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-batch-planner"
outOfScope:
  - "Cross-machine distributed broker service"
  - "Bypassing git or existing ATM evidence flow"
nonGoals:
  - "Do not add a second task store."
completed_at: "2026-06-18T06:23:36.152Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-18T06-23-35-799Z-close-95733bec4655"
delivery_commit: "31fd89ff0b359edf8641e0a6c11d4449c11a9ca8"
---

# TASK-CID-0097 - Broker batch planner, CAS, and atomic write evidence

## Goal

Integrate adapter conflict keys into broker planning and write evidence.

## Required Behavior

- Group pending mutation requests by file and conflict keys.
- Batch non-overlapping or adapter-approved commutative operations.
- Re-read base file and compare base hash before write.
- Re-plan after CAS mismatch.
- Write evidence with actor ids, adapter id, base hash, result hash, conflict keys, and merge decision.

## Acceptance Criteria

- Broker produces deterministic batch plans.
- Lost update is prevented even when two agents submit mutations close together.
- Failed validation and CAS mismatch produce useful evidence.

## Validation

```powershell
npm run typecheck
npm test
git diff --check
```
