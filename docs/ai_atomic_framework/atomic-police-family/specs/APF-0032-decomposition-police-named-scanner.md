<!-- doc_id: doc_other_0683 -->
# APF-0032 — Decomposition Police named scanner

## 1. 目的

新增 `runDecompositionPolice`，根據 SourceInventoryReport 找出大型程式碼表面，並建議走 decomposition plan -> atomic map replacement。

## 2. Upstream 落點

- `packages/core/src/police/family.ts`
- `scripts/validate-police-family.ts`
- `fixtures/police-family/decomposition/*`

## 3. Contract / routing

Finding 必須包含：

- `policeFamily: decomposition`
- `trigger: oversized-source-surface`
- `severity: advisory`
- `action: needs-review` 或 `proposal-draft`
- `routeHint: ReviewAdvisory.machine-finding -> behavior.atomize -> behavior.compose`
- `metadata.lineCount`
- `metadata.threshold`
- `metadata.legacyUri`
- `metadata.decompositionPlanHint`

## 4. Acceptance

- 大於門檻的檔案產 advisory finding。
- 已有 active replacement map 的大型表面不重複建議。
- 不直接建立 atom、map、task 或 registry transition。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:map-curator`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
