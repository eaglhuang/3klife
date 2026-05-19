<!-- doc_id: doc_other_0666 -->
# APF-0025 — Atomization Police named scanner

## 1. 目的

新增 runAtomizationPolice，整合 LegacyRoutePlan、dry-run patch guard 與 neutrality scan result。

## 2. Upstream 落點

packages/core/src/police/family.ts::runAtomizationPolice；adapter-local-git dry-run result

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- dry-run pass、neutrality fail、host mutation attempt fail 皆有 validator 驗收。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
