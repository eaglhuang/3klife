<!-- doc_id: doc_other_0706 -->
# APF-0044 — Rollback Police named scanner

## 1. 目的

新增 `runRollbackPolice`，檢查 proposal draft 是否具備 rollback-proof、map equivalence、retirement proof 或 reversible patch envelope。

## 2. Upstream 落點

- `packages/core/src/police/family.ts`
- rollback/equivalence fixtures
- `scripts/validate-police-family.ts`

## 3. Contract / routing

Finding trigger：

- `rollback-proof-missing`
- `rollback-scope-drift`
- `irreversible-proposal`
- `equivalence-proof-missing`
- `retirement-proof-missing`

High-risk findings 可成 blocker，但仍進 ReviewAdvisory / HumanReviewDecision。

## 4. Acceptance

- map active / legacy-retired proposal 缺 equivalence 或 retirement proof 時 fail fixture。
- atomization / infect proposal 缺 dry-run rollback envelope 時產 blocker finding。
- scanner 不直接 revert、不直接 apply。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:review-advisory`
- `npm run validate:map-curator`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
