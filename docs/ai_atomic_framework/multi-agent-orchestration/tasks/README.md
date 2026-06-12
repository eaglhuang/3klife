---
doc_id: doc_index_mao_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-11
last_updated: 2026-06-11
---

# MAO Task Index

Related plan: [MAO plan](../MAO多AI並行治理計畫書.md)

## Task Roster

| Task | Title | Milestone | Status | Dependencies | Deliverables | Card |
|---|---|---|---|---|---|---|
| TASK-MAO-0001 | logical parallel routing architecture contract | M0 | planned | none | `docs/specs/mao-logical-routing-v1.md` | [card](./TASK-MAO-0001-logical-parallel-routing-architecture-contract.task.md) |
| TASK-MAO-0002 | route context state schema | M0 | planned | `TASK-MAO-0001` | `schemas/route-context.schema.json`; `packages/core/src/routing/route-context.ts` | [card](./TASK-MAO-0002-route-context-state-schema.task.md) |
| TASK-MAO-0003 | route lifecycle CLI | M1 | planned | `TASK-MAO-0002` | `packages/cli/src/commands/route.ts`; `packages/cli/src/commands/index.ts` | [card](./TASK-MAO-0003-route-lifecycle-cli.task.md) |
| TASK-MAO-0004 | next route and task selector | M1 | planned | `TASK-MAO-0002`, `TASK-MAO-0003` | `packages/cli/src/commands/next.ts`; `packages/cli/src/commands/task-intent.ts` | [card](./TASK-MAO-0004-next-route-task-selector.task.md) |
| TASK-MAO-0005 | broker intent registry | M2 | planned | `TASK-MAO-0002` | `packages/core/src/broker/intent-registry.ts`; `packages/core/src/broker/types.ts` | [card](./TASK-MAO-0005-broker-intent-registry.task.md) |
| TASK-MAO-0006 | logical conflict matrix | M2 | planned | `TASK-MAO-0005` | `packages/core/src/broker/conflict-matrix.ts`; `packages/core/src/broker/__tests__/conflict-matrix.test.ts` | [card](./TASK-MAO-0006-logical-conflict-matrix.task.md) |
| TASK-MAO-0007 | freeze resume protocol | M3 | planned | `TASK-MAO-0005`, `TASK-MAO-0006` | `packages/core/src/broker/freeze.ts`; `packages/cli/src/commands/route.ts` | [card](./TASK-MAO-0007-freeze-resume-protocol.task.md) |
| TASK-MAO-0008 | patch envelope contract | M3 | planned | `TASK-MAO-0007` | `schemas/patch-envelope.schema.json`; `packages/core/src/broker/patch-envelope.ts` | [card](./TASK-MAO-0008-patch-envelope-contract.task.md) |
| TASK-MAO-0009 | steward arbitration flow | M3 | planned | `TASK-MAO-0006`, `TASK-MAO-0008` | `packages/core/src/broker/steward.ts`; `packages/cli/src/commands/route.ts` | [card](./TASK-MAO-0009-steward-arbitration-flow.task.md) |
| TASK-MAO-0010 | multi-agent simulator benchmark | M4 | planned | `TASK-MAO-0003`, `TASK-MAO-0006`, `TASK-MAO-0009` | `scripts/validate-mao-parallel-routing.ts`; `scripts/fixtures/mao-parallel-routing/` | [card](./TASK-MAO-0010-multi-agent-simulator-benchmark.task.md) |

## Notes

- `TASK-MAO-0001` is planning/spec first, so it can refine command language before source code lands.
- `TASK-MAO-0002` through `TASK-MAO-0004` create the route context and CLI control surface.
- `TASK-MAO-0005` through `TASK-MAO-0009` add logical admission and arbitration.
- `TASK-MAO-0010` proves the route model with deterministic multi-agent scenarios.
