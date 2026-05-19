<!-- doc_id: doc_other_0689 -->
# APF-0038 — Fixtures and validators for new police families

## 1. 目的

補齊 Decomposition/Evolution Police 的 positive / negative fixtures 與 validator acceptance。

## 2. Upstream 落點

- `fixtures/police-family/decomposition/*`
- `fixtures/police-family/evolution/*`
- `scripts/validate-police-family.ts`
- `scripts/validate-review-advisory.ts`

## 3. Fixture matrix

| Family | Positive | Negative / suppressed |
|---|---|---|
| Decomposition | >1000 LOC source hit | below threshold、ignored path、existing replacement map |
| Evolution | recurring regression hit | usage-only suppressed、host-local preference suppressed、stale base blocker |
| Bridge | metadata.policeFinding preserved | advisory finding cannot auto approve |

## 4. Acceptance

- `validate:police-family` 覆蓋兩支新 family。
- `validate:review-advisory` 可吃進兩種新 finding。
- protected public docs 不含 adopter-specific policy。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:review-advisory`
- `npm run validate:neutrality`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
