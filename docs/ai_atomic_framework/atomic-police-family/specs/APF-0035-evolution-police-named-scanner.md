<!-- doc_id: doc_other_0686 -->
# APF-0035 — Evolution Police named scanner

## 1. 目的

新增 `runEvolutionPolice`，偵測 atom 或 atomic map 是否需要 evolve / compose / merge / dedup-merge / sweep。

## 2. Upstream 落點

- `packages/core/src/police/family.ts`
- `packages/core/src/upgrade/evolution-draft.ts`
- `packages/core/src/upgrade/map-curator.ts`
- `scripts/validate-police-family.ts`

## 3. Contract / routing

Finding route：

- atom-level improvement -> `behavior.evolve`
- repeated atom sequence -> `behavior.compose`
- duplicate map/member -> `behavior.dedup-merge`
- compatible map/member consolidation -> `behavior.merge`
- stale/orphan member -> `behavior.sweep`

所有 route 都必須經 ReviewAdvisory / HumanReviewDecision。

## 4. Acceptance

- recurring regression + target atom 產 `evidence-evolution-signal` finding。
- map member stale / orphan / repeated sequence 產 `map-evolution-signal` finding。
- evidence-driven finding 不直接 mutate registry。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:conversation-evolution`
- `npm run validate:map-curator`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
