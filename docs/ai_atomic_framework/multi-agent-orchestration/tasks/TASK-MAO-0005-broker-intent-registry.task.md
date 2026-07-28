---
task_id: TASK-MAO-0005
title: "broker intent registry"
status: done
owner: atm-core
priority: P0
milestone: M2
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0002"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/intent-registry.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/intent-registry.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/intent-registry.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove intent registry module, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-intent-registry-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Full conflict arbitration"
  - "Freeze protocol"
  - "Route CLI commands beyond the data contract needed for registry tests"
completed_at: "2026-06-15T12:40:04.447Z"
completed_by_agent: "codex-captain-continuation"
lastTransitionId: "2026-06-15T12-40-04-292Z-close-70727f84ffbd"
delivery_commit: "962aa300"
---

# TASK-MAO-0005 - broker intent registry

## Goal

Add a broker-level registry for route intent before source mutation.

## Implementation Contract

- Define intent records for actor, task, route, claim intent, declared read set, declared write set, atom CIDs, virtual atom CIDs, outputs, lease, and confidence.
- Support extensible scope labels such as `atm-core` without hard-coding the runner Broker into the generic registry.
- Provide pure functions to register, renew, release, and query intents.
- Unknown read/write sets must be represented explicitly, not as empty arrays.
- The registry must be deterministic and testable without filesystem mutation.

## Acceptance Criteria

- Tests prove register, renew, release, duplicate route handling, and unknown-scope representation.
- Tests prove unknown future scope labels are preserved for downstream classifiers instead of being dropped.
- Registry APIs do not directly edit task ledger or worktree state.
- Intent records can be consumed by `TASK-MAO-0006`.
