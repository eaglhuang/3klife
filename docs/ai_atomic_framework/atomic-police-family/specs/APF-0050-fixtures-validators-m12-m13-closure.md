<!-- doc_id: doc_other_0712 -->
# APF-0050 — Fixtures, validators, and M12/M13 closure

## 1. 目的

補齊 Polymorph/Rollback/shared gates 的 fixtures、validators，並在 runtime 產品化後回寫 APF 狀態矩陣與風險表。

## 2. Upstream / docs 落點

- `fixtures/police-family/polymorph/*`
- `fixtures/police-family/rollback/*`
- shared gate fixtures
- APF roadmap docs

## 3. Fixture matrix

| Area | Positive | Negative / blocked |
|---|---|---|
| Polymorph | template drift detected | same group dedup ignored |
| Rollback | rollback proof present | irreversible proposal blocked |
| Evidence integrity | valid evidence refs | stale / missing / duplicate evidence |
| Noise control | suppressed repeat finding | high severity bypass still review-only |
| Contract drift | matching spec/code/test | stale registry metadata |

## 4. Acceptance

- `validate:police-family` 覆蓋 polymorph / rollback / shared gates。
- `validate:review-advisory` 確認 finding 不自動 approved。
- APF docs 的風險矩陣更新為 closed 或仍 planned，不能混淆。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:review-advisory`
- `npm run check:encoding:touched`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
