<!-- doc_id: doc_other_0703 -->
# APF-0041 — Polymorph Police contract and read model

## 1. 目的

定義 Polymorph Police 需要讀取的 template / instance / map read model，讓 template drift、instance propagation 與 variant explosion 可以被 deterministic scanner 偵測。

## 2. Upstream 落點

- `packages/core/src/polymorph/template.ts`
- `packages/core/src/police/family.ts`
- polymorph fixtures and registry records

## 3. Contract / routing

Read model 至少包含：

- template atom id / version / dimension spec；
- instance atom ids / versions；
- instance map refs；
- propagation watermark；
- variant count / threshold；
- quality/evolution context refs。

## 4. Acceptance

- read model 可表示 template drift、instance propagation missing、variant explosion。
- 不直接修改 template 或 instance。
- finding 必須能放入 `metadata.policeFinding`。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:behavior-pack`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
