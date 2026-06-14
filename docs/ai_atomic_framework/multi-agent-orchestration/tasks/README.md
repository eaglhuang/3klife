---
doc_id: doc_index_mao_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-11
last_updated: 2026-06-14
---

# MAO Task Index

Related plan: [MAO plan](../MAO多AI並行治理計畫書.md)
Related design (M5): [atm-core-runner-broker-design.md](../atm-core-runner-broker-design.md)

## Reconciliation pass — 2026-06-14

Captain initiated implementation in parallel with planning. The roster `Status` column below now reflects **planning governance status** (when the card goes through `taskflow close --write`), and the new `Audit` column reflects **reality on disk in AI-Atomic-Framework** at 2026-06-14.

Audit values:
- **`shipped`** — all declared deliverables exist on disk; card needs a retroactive governed-close cycle (see `tasks reconcile --historical-delivery` flow) before its `Status` can move to `done`.
- **`partial`** — most deliverables exist; some tests, fixtures, or barrel files are missing. Card scope is now: build the listed gaps on top of existing implementation, do not re-create existing files.
- **`stub`** — at most one or two deliverable paths exist (typically a placeholder or sibling file); substantive implementation is still required.

A `Status` of `planned` with `Audit: shipped` means the implementation exists but the governance closure record does not — the card is real work whose evidence trail still needs to be created.

Ledger sync note (2026-06-14): `TASK-MAO-0001`, `TASK-MAO-0002`, `TASK-MAO-0003`, `TASK-MAO-0011`, `TASK-MAO-0012`, and `TASK-MAO-0013` now mirror the official AI-Atomic-Framework ATM ledger as `done`. For those rows, `Status` is closure authority while `Audit` remains a disk-shape note.

## Task Roster

| Task | Title | Milestone | Status | Audit | Dependencies | Deliverables | Card |
|---|---|---|---|---|---|---|---|
| TASK-MAO-0001 | logical parallel routing architecture contract | M0 | done | shipped | none | `docs/specs/mao-logical-routing-v1.md` | [card](./TASK-MAO-0001-logical-parallel-routing-architecture-contract.task.md) |
| TASK-MAO-0002 | route context state schema | M0 | done | shipped | `TASK-MAO-0001` | `schemas/route-context.schema.json`; `packages/core/src/routing/route-context.ts` | [card](./TASK-MAO-0002-route-context-state-schema.task.md) |
| TASK-MAO-0003 | route lifecycle CLI | M1 | done | partial | `TASK-MAO-0002` | `packages/cli/src/commands/route.ts` (✓ 615 lines); `packages/cli/src/commands/index.ts` (✗ missing barrel) | [card](./TASK-MAO-0003-route-lifecycle-cli.task.md) |
| TASK-MAO-0004 | next route and task selector | M1 | planned | partial | `TASK-MAO-0002`, `TASK-MAO-0003` | `packages/cli/src/commands/next.ts` (✓); `packages/cli/src/commands/task-intent.ts` (✓); `tests/cli/next-route-selector.test.ts` (✗) | [card](./TASK-MAO-0004-next-route-task-selector.task.md) |
| TASK-MAO-0005 | broker intent registry | M2 | planned | partial | `TASK-MAO-0002` | `packages/core/src/broker/intent-registry.ts` (✗; existing `registry.ts` 221 lines covers part, name split needs reconciliation); `packages/core/src/broker/__tests__/intent-registry.test.ts` (✓ exists despite source missing — split brain) | [card](./TASK-MAO-0005-broker-intent-registry.task.md) |
| TASK-MAO-0006 | logical conflict matrix | M2 | planned | shipped | `TASK-MAO-0005` | `packages/core/src/broker/conflict-matrix.ts` (✓ 327 lines); `__tests__/conflict-matrix.test.ts` (✓) | [card](./TASK-MAO-0006-logical-conflict-matrix.task.md) |
| TASK-MAO-0007 | freeze resume protocol | M3 | planned | partial | `TASK-MAO-0005`, `TASK-MAO-0006` | `packages/core/src/broker/freeze.ts` (✓ 127 lines); existing test at `__tests__/freeze-protocol.test.ts` (✓; card said `tests/cli/route-freeze-resume.test.ts` which does not exist — path convention mismatch, prefer existing) | [card](./TASK-MAO-0007-freeze-resume-protocol.task.md) |
| TASK-MAO-0008 | patch envelope contract | M3 | planned | partial | `TASK-MAO-0007` | `schemas/patch-envelope.schema.json` (✓); `packages/core/src/broker/patch-envelope.ts` (✓ 78 lines); `__tests__/patch-envelope.test.ts` (✗) | [card](./TASK-MAO-0008-patch-envelope-contract.task.md) |
| TASK-MAO-0009 | steward arbitration flow | M3 | planned | partial | `TASK-MAO-0006`, `TASK-MAO-0008` | `packages/core/src/broker/steward.ts` (✓ 383 lines); existing test at `__tests__/steward-arbitration.test.ts` (✓; card said `tests/cli/steward-arbitration.test.ts`, prefer existing) | [card](./TASK-MAO-0009-steward-arbitration-flow.task.md) |
| TASK-MAO-0010 | multi-agent simulator benchmark | M4 | planned | stub | `TASK-MAO-0003`, `TASK-MAO-0006`, `TASK-MAO-0009` | `scripts/validate-mao-parallel-routing.ts` (✗); `scripts/fixtures/mao-parallel-routing/` (✗) | [card](./TASK-MAO-0010-multi-agent-simulator-benchmark.task.md) |
| TASK-MAO-0011 | reproducible runner build audit | M5 | done | partial | none | `scripts/validate-runner-reproducibility.ts` (✓); `docs/reports/runner-reproducibility-audit.md` (✓); fixtures (✗ pending) | [card](./TASK-MAO-0011-reproducible-runner-build-audit.task.md) |
| TASK-MAO-0012 | runner sync scope manifest | M5 | done | shipped | `TASK-MAO-0011` | `scripts/AtmCore/runner-build-scope.json` (✓); `scripts/validate-runner-build-scope.ts` (✓) | [card](./TASK-MAO-0012-runner-build-scope-manifest.task.md) |
| TASK-MAO-0013 | runner sync steward classifier and stale gate | M5 | done | shipped | `TASK-MAO-0012` | `packages/core/src/broker/atm-core-scope.ts` (✓ 125 lines); `__tests__/atm-core-scope.test.ts` (✓); `scripts/validate-runner-entrypoints.ts` (✓) | [card](./TASK-MAO-0013-atm-core-scope-classifier.task.md) |
| TASK-MAO-0014 | runner ref publish primitive | M5 | planned | stub | `TASK-MAO-0011`, `TASK-MAO-0012` | `packages/core/src/broker/runner-ref-store.ts` (✗); `scripts/validate-runner-refs.ts` (✗) | [card](./TASK-MAO-0014-runner-ref-publish-primitive.task.md) |
| TASK-MAO-0015 | patch envelope ATM core specialization | M5 | planned | partial | `TASK-MAO-0008`, `TASK-MAO-0013` | `schemas/patch-envelope.schema.json` (✓ base); `packages/core/src/broker/patch-envelope.ts` (✓ base); ATM core fields and tests (✗) | [card](./TASK-MAO-0015-patch-envelope-atm-core-specialization.task.md) |
| TASK-MAO-0016 | runner submit-patch pipeline | M5 | planned | stub | `TASK-MAO-0008`, `TASK-MAO-0011`, `TASK-MAO-0014`, `TASK-MAO-0015` | `packages/core/src/broker/runner-submit-pipeline.ts` (✗); `scripts/validate-runner-submit-pipeline.ts` (✗) | [card](./TASK-MAO-0016-runner-submit-patch-pipeline.task.md) |
| TASK-MAO-0017 | runner version stream state machine | M5 | planned | stub | `TASK-MAO-0014`, `TASK-MAO-0016` | `packages/core/src/broker/runner-version-state.ts` (✗); `tests/cli/runner-version-lease.test.ts` (✗) | [card](./TASK-MAO-0017-runner-version-stream-state-machine.task.md) |
| TASK-MAO-0018 | closure packet runner binding | M5 | planned | partial | `TASK-MAO-0017` | `schemas/governance/closure-packet.schema.json` (✓ base); `tests/cli/closure-runner-binding.test.ts` (✗) | [card](./TASK-MAO-0018-closure-runner-binding.task.md) |
| TASK-MAO-0019 | cross-repo dual binding closure | M5 | planned | partial | `TASK-MAO-0018` | `packages/cli/src/commands/taskflow/close-orchestration.ts` (✓ base); `tests/cli/cross-repo-dual-binding-close.test.ts` (✗) | [card](./TASK-MAO-0019-cross-repo-dual-binding-closure.task.md) |
| TASK-MAO-0020 | broker bootstrap self-update recovery | M5 | planned | stub | `TASK-MAO-0017` | `packages/core/src/broker/runner-bootstrap.ts` (✗); `docs/reports/runner-broker-recovery.md` (✗) | [card](./TASK-MAO-0020-broker-bootstrap-self-update-recovery.task.md) |
| TASK-MAO-0021 | runner broker failure-mode coverage | M5 | planned | stub | `TASK-MAO-0017`, `TASK-MAO-0020` | `scripts/validate-runner-broker-failures.ts` (✗); `docs/reports/runner-broker-failure-coverage.md` (✗) | [card](./TASK-MAO-0021-runner-broker-failure-mode-coverage.task.md) |
| TASK-MAO-0022 | external core contributor pipeline | M5 | planned | stub | `TASK-MAO-0017`, `TASK-MAO-0018` | `docs/CONTRIBUTING_CORE.md` (✗); `scripts/validate-external-core-pipeline.ts` (✗) | [card](./TASK-MAO-0022-external-core-contributor-pipeline.task.md) |

## Reconciliation actions still needed

These items follow from the audit and are not card content:

1. **Retroactive close cycle** for `shipped` cards (MAO-0001, 0002, 0006, 0012, 0013): each needs a `tasks reconcile --historical-delivery <commit-sha>` cycle with closure packet, before its `Status` can legitimately become `done`. Until then, these cards record real work whose governance evidence trail is missing.
2. **Name split brain on MAO-0005**: card declares `intent-registry.ts` as deliverable but the implementation actually lives in `registry.ts` (221 lines), while a sibling `intent-registry.test.ts` already exists in `__tests__/`. Decide: (a) rename `registry.ts` → `intent-registry.ts`, or (b) update card deliverables to point at `registry.ts`. Recommend (b) because rename ripples through every importer.
3. **Test path convention drift on MAO-0007 / 0008 / 0009**: cards expect `tests/cli/<name>.test.ts` paths that do not exist, while real tests live at `packages/core/src/broker/__tests__/<name>.test.ts`. Cards should be updated to match existing convention; tests should not be moved.
4. **Cross-repo mirror declarations missing on all M5 cards**: every M5 card is target_repo-owned but planning_repo-resident; per dual-repo dispatch discipline, each card needs explicit mirror commit boundary (AAF strict 2 commits, 3KLife strict 1 commit). This is a global card-template fix, not a per-card fix.

## Notes

- `TASK-MAO-0001` is planning/spec first, so it can refine command language before source code lands.
- `TASK-MAO-0002` through `TASK-MAO-0004` create the route context and CLI control surface.
- `TASK-MAO-0005` through `TASK-MAO-0009` add logical admission and arbitration.
- `TASK-MAO-0010` proves the route model with deterministic multi-agent scenarios.
- `TASK-MAO-0011` through `TASK-MAO-0013` are the recommended `Runner Sync Steward v1` rollout.
- `TASK-MAO-0014` through `TASK-MAO-0019` are the heavier full-Broker escalation path and should stay deferred unless v1 proves too coarse.
- `TASK-MAO-0020` through `TASK-MAO-0022` are long-horizon self-hosting and external-contribution hardening work.
