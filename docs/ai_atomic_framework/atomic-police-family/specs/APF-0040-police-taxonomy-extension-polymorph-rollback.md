<!-- doc_id: doc_other_0702 -->
# APF-0040 — Police taxonomy extension for Polymorph and Rollback Police

## 1. 目的

將 Polymorph Police 與 Rollback Police 正式納入 police family taxonomy，並明確區分 named police family 與 shared gate。

## 2. Upstream 落點

- `packages/core/src/police/family.ts`
- `packages/plugin-sdk/src/police.ts`
- `scripts/validate-police-family.ts`

## 3. Contract / routing

- 新增 planned family：`polymorph`、`rollback`。
- Shared gates 不列為 family：Evidence Integrity、Reversibility、Noise Control、Contract Drift。
- Finding bridge 仍是 `ReviewAdvisoryFinding.metadata.policeFinding`。

## 4. Acceptance

- 計畫書與 specs 能清楚區分 named police 與 shared gate。
- 不新增第二套 proposal / review / registry workflow。
- runtime_status 保持 upstream-api-not-applied，避免誤稱已產品化。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:plugin-sdk`

## 6. Status

- artifact_status: planned
- runtime_status: upstream-api-not-applied
- upstream_mutation_status: not-applied
