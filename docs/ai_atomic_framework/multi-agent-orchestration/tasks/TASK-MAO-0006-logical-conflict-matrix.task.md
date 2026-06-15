---
task_id: TASK-MAO-0006
title: "logical conflict matrix"
status: done
owner: atm-core
priority: P0
milestone: M2
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0005"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/conflict-matrix.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove conflict matrix module, tests, and atomization map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-conflict-matrix-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Applying patches"
  - "Steward merge execution"
completed_at: "2026-06-15T12:44:07.542Z"
completed_by_agent: "codex-captain-continuation"
delivery_commit: "e41539cdd4cd7e957b0102602f25808ee2740f7b"
---

# TASK-MAO-0006 - logical conflict matrix

## Goal

Evaluate route intent records before writing and return deterministic admission verdicts.

## Implementation Contract

- Implement conflict verdicts for different files, same file different atom, same atom write/write, write/read overlap, unknown scope, generated artifact drift, and Layer 2 split candidate.
- Keep generated artifact drift generic enough that M5 can specialize `release/**` as Broker-only runner output without adding a second conflict matrix.
- Return structured diagnostics with `conflictKind`, `blockedBy`, `requiredCommand`, and `evidence`.
- Default unknown write scope to conservative block.
- Preserve logical atom conflict as more important than physical file non-overlap when atom data is confident.

## Acceptance Criteria

- Tests cover at least ten conflict scenarios.
- Same-file non-overlap with different atom CIDs can pass with range guard.
- Same-atom write/write returns freeze/steward-required.
- Generated artifact drift returns a structured conflict that can name the derived artifact owner.
- Unknown read/write set does not silently pass.
