<!-- doc_id: doc_other_0709 -->
# APF-0047 — Noise Control Gate shared contract

## 1. 目的

Advisory police 容易產生太多建議，因此需要共用 suppression、daily cap、confidence threshold 與 recurrence window。

## 2. Upstream 落點

- Police orchestrator
- ReviewAdvisory metadata
- evidence/evolution reports

## 3. Contract / routing

Suppression key 包含：

- target surface；
- target id；
- finding kind；
- normalized pattern tags；
- base version；
- scanner family。

High severity finding 可以 bypass suppression，但仍需 human review。

## 4. Acceptance

- 同一 finding 在 suppression window 內不重複打擾 reviewer。
- confidence 過低時只產 observation report。
- high severity finding 可繞過 suppression，但仍需 human review。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## 6. Status

- artifact_status: planned
- runtime_status: shared-gate-planned
- upstream_mutation_status: not-applied
