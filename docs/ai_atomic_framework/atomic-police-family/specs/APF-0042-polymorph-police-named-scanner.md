<!-- doc_id: doc_other_0704 -->
# APF-0042 — Polymorph Police named scanner

## 1. 目的

新增 `runPolymorphPolice`，掃描 template drift、instance propagation missing、variant explosion 與 polymorph dimension drift。

## 2. Upstream 落點

- `packages/core/src/police/family.ts`
- `packages/core/src/polymorph/template.ts`
- `scripts/validate-police-family.ts`

## 3. Contract / routing

Finding trigger：

- `template-drift`
- `instance-propagation-missing`
- `variant-explosion`
- `polymorph-dimension-drift`

Route hint 可指向 `behavior.polymorphize`、`behavior.evolve` 或 ReviewAdvisory follow-up。

## 4. Acceptance

- template 改動未 propagation 到 instance map 時產 advisory 或 blocker finding。
- variant 數量超過 threshold 時產 `variant-explosion` finding。
- same polymorph group 不誤觸 Dedup merge。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:behavior-pack`
- `npm run validate:map-curator`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
