<!-- doc_id: doc_other_0684 -->
# APF-0033 — Decomposition plan to atomic-map recommendation bridge

## 1. 目的

把 Decomposition Police finding 轉成 decomposition-plan draft / atomic map replacement recommendation，但仍需人工審核。

## 2. Upstream 落點

- `schemas/governance/decomposition-plan.schema.json`
- `packages/core/src/registry/decomposition-plan.ts`
- `docs/MAP_REPLACEMENT_PROTOCOL.md`

## 3. Contract / routing

Draft artifact 應包含：

- `legacyUris[]`
- `proposedMapId`
- `proposedMembers[]`
- `proposedEdges[]`
- `entrypoints[]`
- `qualityTargets`
- `replacement.mode=draft`

此 bridge 不執行 apply，只提供 ReviewAdvisory / HumanReviewDecision 可審查的 proposal draft。

## 4. Acceptance

- 缺 `replacement.legacyUris` 時 fail。
- 缺 map entrypoint 時 fail。
- 不直接 promote map replacement lifecycle。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:map-template`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
