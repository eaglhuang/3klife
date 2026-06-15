---
task_id: TASK-CID-0094
doc_id: doc_cid_0094
title: "path-to-atom-map domain adapter"
status: planned
owner: atm-core
priority: P0
milestone: M19
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0093"
scopePaths:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/registry.ts"
  - "packages/core/src/broker/adapters/atom-map.ts"
  - "packages/core/src/broker/__tests__/atom-map-adapter.test.ts"
  - "packages/core/src/broker/__tests__/fixtures/owner-shard-fixture.json"
deliverables:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/registry.ts"
  - "packages/core/src/broker/adapters/atom-map.ts"
  - "packages/core/src/broker/__tests__/atom-map-adapter.test.ts"
  - "packages/core/src/broker/__tests__/fixtures/owner-shard-fixture.json"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert path-to-atom-map domain adapter and regression fixtures."
atomizationImpact:
  ownerAtomOrMap: "atm.path-to-atom-map-domain-adapter"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Replacing owner shard source-of-truth rules"
  - "Bulk atom map refactor unrelated to adapter mechanics"
nonGoals:
  - "Do not make path-to-atom-map.json the only supported domain adapter."
---

# TASK-CID-0094 - path-to-atom-map domain adapter

## Goal

Build the domain adapter for `path-to-atom-map.json` on top of the generic JSON adapter.

## Required Behavior

- Use path row, atom id, and owner shard invariants to compute conflict keys.
- Allow brokered batching for different rows that do not touch shared metadata or projection-level fields.
- Reject or serialize same-row mutations.
- Preserve owner shard and projection rules already documented for team atom boundaries.

## Acceptance Criteria

- Same file / different row updates can be planned as mergeable by broker.
- Same row update conflict is detected before write.
- Metadata, checksum, schema, or shard ownership changes are treated as wider conflict keys.

## Validation

```powershell
npm run typecheck
npm test
git diff --check
```
