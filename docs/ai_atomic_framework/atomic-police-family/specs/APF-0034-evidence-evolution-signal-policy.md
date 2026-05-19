<!-- doc_id: doc_other_0685 -->
# APF-0034 — Evidence evolution signal policy

## 1. 目的

依 `Atom Evidence-Driven Evolution` 定義 Evolution Police 可消費的 evidence signal、門檻與 suppression policy。

## 2. Upstream 落點

- `docs/ATOM_EVOLUTION_PLAN.md`
- `fixtures/evolution/evidence-patterns/*`
- `packages/core/src/upgrade/evolution-draft.ts`
- `packages/plugin-review-advisory/src/promotion-gates.ts`

## 3. Contract / routing

Evolution Police 不得只因 usage count 產 evolve proposal。最小觸發條件應包含：

- recurrence 或 usage pattern；
- friction / corrective / regression / review evidence 至少一種；
- confidence 達門檻；
- target base version 未 stale；
- 未命中 suppression 或 daily cap。

## 4. Acceptance

- positive-only / neutral-only evidence 不產 proposal finding。
- host-local preference 不自動升成 global atom contract。
- stale base 轉 `stale-evolution-draft` warning 或 blocker review。

## 5. Validation

- `npm run validate:evidence-detector`
- `npm run validate:conversation-evolution`

## 6. Status

- artifact_status: planned
- runtime_status: upstream-api-not-applied
- upstream_mutation_status: not-applied
