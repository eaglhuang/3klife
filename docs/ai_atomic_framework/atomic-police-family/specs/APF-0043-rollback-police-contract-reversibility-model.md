<!-- doc_id: doc_other_0705 -->
# APF-0043 — Rollback Police contract and reversibility model

## 1. 目的

把 rollback / reversibility 升為 proposal safety 的一等 contract，供 Map Replacement、Evolution、Atomization、Decomposition、Polymorph 等流程共用。

## 2. Upstream 落點

- `schemas/governance/rollback-proof.schema.json`
- `packages/core/src/registry/rollback-types.ts`
- `packages/plugin-review-advisory/src/promotion-gates.ts`

## 3. Contract / routing

Rollback Police read model 包含：

- rollback proof refs；
- map equivalence report refs；
- retirement proof refs；
- dry-run patch / reversible patch envelope；
- rollback scope / touched surfaces；
- base version / evidence watermark。

## 4. Acceptance

- 可表示 `rollback-proof-missing`、`irreversible-proposal`、`equivalence-proof-missing`。
- Rollback Police 不直接 revert 或 apply rollback。
- Proposal draft 缺可逆性證據時必須進 review 或 blocker gate。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## 6. Status

- artifact_status: planned
- runtime_status: upstream-api-not-applied
- upstream_mutation_status: not-applied
