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
| TASK-MAO-0011 | reproducible runner build audit | M5 | planned | none | `scripts/validate-runner-reproducibility.ts`; `docs/reports/runner-reproducibility-audit.md` | [card](./TASK-MAO-0011-reproducible-runner-build-audit.task.md) |
| TASK-MAO-0012 | runner sync scope manifest | M5 | planned | `TASK-MAO-0011` | `scripts/AtmCore/runner-build-scope.json`; `scripts/validate-runner-build-scope.ts` | [card](./TASK-MAO-0012-runner-build-scope-manifest.task.md) |
| TASK-MAO-0013 | runner sync steward classifier and stale gate | M5 | planned | `TASK-MAO-0005`, `TASK-MAO-0012` | `packages/core/src/broker/atm-core-scope.ts`; `packages/core/src/broker/__tests__/atm-core-scope.test.ts` | [card](./TASK-MAO-0013-atm-core-scope-classifier.task.md) |
| TASK-MAO-0014 | runner ref publish primitive | M5 | planned | `TASK-MAO-0011`, `TASK-MAO-0012` | `packages/core/src/broker/runner-ref-store.ts`; `scripts/validate-runner-refs.ts` | [card](./TASK-MAO-0014-runner-ref-publish-primitive.task.md) |
| TASK-MAO-0015 | patch envelope ATM core specialization | M5 | planned | `TASK-MAO-0008`, `TASK-MAO-0013` | `schemas/patch-envelope.schema.json`; `packages/core/src/broker/patch-envelope.ts` | [card](./TASK-MAO-0015-patch-envelope-atm-core-specialization.task.md) |
| TASK-MAO-0016 | runner submit-patch pipeline | M5 | planned | `TASK-MAO-0008`, `TASK-MAO-0014`, `TASK-MAO-0015` | `packages/core/src/broker/runner-submit-pipeline.ts`; `scripts/validate-runner-submit-pipeline.ts` | [card](./TASK-MAO-0016-runner-submit-patch-pipeline.task.md) |
| TASK-MAO-0017 | runner version stream state machine | M5 | planned | `TASK-MAO-0014`, `TASK-MAO-0016` | `packages/core/src/broker/runner-version-state.ts`; `tests/cli/runner-version-lease.test.ts` | [card](./TASK-MAO-0017-runner-version-stream-state-machine.task.md) |
| TASK-MAO-0018 | closure packet runner binding | M5 | planned | `TASK-MAO-0017` | `schemas/governance/closure-packet.schema.json`; `tests/cli/closure-runner-binding.test.ts` | [card](./TASK-MAO-0018-closure-runner-binding.task.md) |
| TASK-MAO-0019 | cross-repo dual binding closure | M5 | planned | `TASK-MAO-0018` | `tests/cli/cross-repo-dual-binding-close.test.ts`; `packages/cli/src/commands/taskflow/close-orchestration.ts` | [card](./TASK-MAO-0019-cross-repo-dual-binding-closure.task.md) |
| TASK-MAO-0020 | broker bootstrap self-update recovery | M5 | planned | `TASK-MAO-0017` | `packages/core/src/broker/runner-bootstrap.ts`; `docs/reports/runner-broker-recovery.md` | [card](./TASK-MAO-0020-broker-bootstrap-self-update-recovery.task.md) |
| TASK-MAO-0021 | runner broker failure-mode coverage | M5 | planned | `TASK-MAO-0017`, `TASK-MAO-0020` | `scripts/validate-runner-broker-failures.ts`; `docs/reports/runner-broker-failure-coverage.md` | [card](./TASK-MAO-0021-runner-broker-failure-mode-coverage.task.md) |
| TASK-MAO-0022 | external core contributor pipeline | M5 | planned | `TASK-MAO-0017`, `TASK-MAO-0018` | `docs/CONTRIBUTING_CORE.md`; `scripts/validate-external-core-pipeline.ts` | [card](./TASK-MAO-0022-external-core-contributor-pipeline.task.md) |

## Notes

- `TASK-MAO-0001` is planning/spec first, so it can refine command language before source code lands.
- `TASK-MAO-0002` through `TASK-MAO-0004` create the route context and CLI control surface.
- `TASK-MAO-0005` through `TASK-MAO-0009` add logical admission and arbitration.
- `TASK-MAO-0010` proves the route model with deterministic multi-agent scenarios.
- `TASK-MAO-0011` through `TASK-MAO-0013` are the recommended `Runner Sync Steward v1` rollout.
- `TASK-MAO-0014` through `TASK-MAO-0019` are the heavier full-Broker escalation path and should stay deferred unless v1 proves too coarse.
- `TASK-MAO-0020` through `TASK-MAO-0022` are long-horizon self-hosting and external-contribution hardening work.
