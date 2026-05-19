<!-- doc_id: doc_other_0681 -->
# APF-0030 — Police family taxonomy extension for Decomposition and Evolution Police

## 1. 目的

擴充 police family taxonomy，正式加入 Decomposition Police 與 Evolution Police，但不得宣稱 runtime 已產品化。

## 2. Upstream 落點

- `packages/core/src/police/family.ts`
- `packages/plugin-sdk/src/police.ts`
- `scripts/validate-police-family.ts`

## 3. Contract / routing

- `PoliceFamilyName` additive proposal：`decomposition`、`evolution`。
- `Decomposition Police` 的 trigger 以 `oversized-source-surface` 為核心。
- `Evolution Police` 的 trigger 以 `evidence-evolution-signal`、`map-evolution-signal`、`stale-evolution-draft` 為核心。
- Finding bridge 仍是 `ReviewAdvisoryFinding.metadata.policeFinding`。

## 4. Acceptance

- Contract 能表示兩個新 family 的 trigger / routeHint / readModel。
- 不新增第二套 approval workflow。
- 文件狀態標為 planned / upstream-api-not-applied。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:plugin-sdk`

## 6. Status

- artifact_status: planned
- runtime_status: upstream-api-not-applied
- upstream_mutation_status: not-applied
