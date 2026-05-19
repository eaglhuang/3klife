<!-- doc_id: doc_other_0663 -->
# APF-0022 — Demand Police named scanner

## 1. 目的

新增 runDemandPolice，從 LegacyRoutePlan callerDemand 產 split advisory finding。

## 2. Upstream 落點

packages/core/src/police/family.ts::runDemandPolice；legacy-route-plan.ts

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- below/above threshold、trunk no-touch、directApplyAllowed=false 皆驗收。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
