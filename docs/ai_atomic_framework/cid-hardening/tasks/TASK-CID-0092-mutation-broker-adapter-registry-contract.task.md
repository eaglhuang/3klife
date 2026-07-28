---
task_id: TASK-CID-0092
doc_id: doc_cid_0092
title: "Mutation broker adapter registry contract"
status: done
owner: atm-core
priority: P0
milestone: M19
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0091"
scopePaths:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/registry.ts"
  - "packages/core/src/broker/adapters/fallback-file-lock.ts"
  - "packages/core/src/broker/__tests__/adapter-registry.test.ts"
  - "schemas/broker/mutation-request.schema.json"
  - "schemas/broker/conflict-key.schema.json"
  - "schemas/broker/merge-decision.schema.json"
deliverables:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/registry.ts"
  - "packages/core/src/broker/adapters/fallback-file-lock.ts"
  - "packages/core/src/broker/__tests__/adapter-registry.test.ts"
  - "schemas/broker/mutation-request.schema.json"
  - "schemas/broker/conflict-key.schema.json"
  - "schemas/broker/merge-decision.schema.json"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert adapter registry contract and schemas."
atomizationImpact:
  ownerAtomOrMap: "atm.mutation-broker-adapter-registry"
outOfScope:
  - "JSON domain adapter implementation"
  - "Text or numeric adapters"
nonGoals:
  - "Do not hard-code format-specific merge logic in broker core."
completed_at: "2026-06-18T05:59:10.390Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-18T05-59-10-078Z-close-2f4b745954bf"
delivery_commit: "31fd89ff0b359edf8641e0a6c11d4449c11a9ca8"
---

# TASK-CID-0092 - Mutation broker adapter registry contract

## Goal

Create the broker-side adapter registry contract and fallback behavior required for pluggable file mutation handling.

## Required Behavior

- Broker resolves a file to a registered adapter through `supports(file)`.
- Adapter contract exposes parse, normalize, conflict key extraction, merge, serialize, and validate hooks.
- Unknown formats fall back to file-level serialization.
- Contract fixtures prove broker core can route through a fake adapter without knowing the format.

## Acceptance Criteria

- Broker core can register and resolve adapters deterministically.
- Contract tests cover supported adapter, unsupported adapter, and fallback file lock.
- No JSON / text / numeric specific merge logic is introduced into broker core.

## Validation

```powershell
npm run typecheck
npm test
git diff --check
```
