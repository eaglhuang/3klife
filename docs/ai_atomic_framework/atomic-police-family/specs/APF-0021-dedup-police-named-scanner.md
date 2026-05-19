<!-- doc_id: doc_other_0662 -->
# APF-0021 — Dedup Police named scanner

## 1. 目的

新增 runDedupPolice，使用 RegistryIndex semantic fingerprint exact/prefix lookup。

## 2. Upstream 落點

packages/core/src/police/family.ts::runDedupPolice；RegistryIndex；quality comparison dedupCandidates

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- exact/prefix hit、same-polymorph ignored、large registry hot path 皆有 validator 驗收。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
