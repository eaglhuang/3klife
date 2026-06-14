---
task_id: TASK-MAO-0002
title: "route context state schema"
status: done
completed_at: "2026-06-14T11:28:41.469Z"
completed_by_agent: "captain"
owner: atm-core
priority: P0
milestone: M0
closure_authority: target_repo
ledger_closure:
  source: "AI-Atomic-Framework/.atm/history/tasks/TASK-MAO-0002.json"
  closed_at: "2026-06-14T11:28:41.469Z"
  closed_by_actor: "captain"
  closure_packet: ".atm/history/evidence/TASK-MAO-0002.closure-packet.json"
depends_on:
  - "TASK-MAO-0001"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "schemas/route-context.schema.json"
  - "packages/core/src/routing/route-context.ts"
  - "packages/core/src/routing/index.ts"
  - "tests/core/route-context.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/route-context.schema.json"
  - "packages/core/src/routing/route-context.ts"
  - "packages/core/src/routing/index.ts"
  - "tests/core/route-context.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "npm run validate:cli"
  - "node --strip-types tests/core/route-context.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove the route context schema, core type surface, tests, and atomization map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-route-context-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "CLI route command implementation"
  - "Persisting route state in runtime files"
  - "Broker admission logic"
---

# TASK-MAO-0002 - route context state schema

## Goal

Define the machine-readable route context state used by MAO route lifecycle and task-scoped `next` routing.

## Implementation Contract

- Add a JSON schema for route context records.
- Add TypeScript types and validation helpers in core.
- Required fields include `routeId`, `taskId`, `actorId`, `claimIntent`, `state`, `openedAt`, `lease`, `declaredReadSet`, `declaredWriteSet`, `targetAtomCids`, `targetVirtualAtomCids`, `patchEnvelopeRef`, and `blockedBy`.
- State values must include at least `open`, `admitted`, `frozen`, `waiting`, `blocked`, `ready-to-apply`, `closed`, and `abandoned`.

## Acceptance Criteria

- Invalid route context records fail schema validation.
- TypeScript types match the schema fields.
- Tests cover minimal valid state, blocked state, and frozen state.
- No task lifecycle behavior changes in this card.
