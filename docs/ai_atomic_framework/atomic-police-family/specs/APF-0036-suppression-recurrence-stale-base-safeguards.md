<!-- doc_id: doc_other_0687 -->
# APF-0036 — Suppression, recurrence, and stale-base safeguards

## 1. 目的

補齊 Evolution Police 與 Decomposition Police 的去噪、遞迴門檻、stale base 與 daily cap 防護。

## 2. Upstream 落點

- Police config / governance bundle config
- ReviewAdvisory metadata
- Evolution evidence reports

## 3. Contract / routing

Suppression key 建議包含：

- target surface
- target id
- finding kind
- normalized pattern tags
- base atom/map version
- scanner family

High severity signal 可覆蓋 suppression，但仍不得自動 approve。

## 4. Acceptance

- suppression window 內不重複產生同類 advisory finding。
- daily cap 達上限時產 observation report。
- stale base fixture 轉 blocker review。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
