<!-- doc_id: doc_other_0665 -->
# APF-0024 — Map Integration Police named scanner

## 1. 目的

新增 runMapIntegrationPolice，包 curateAtomMapEvolution 與 mapImpactScope。

## 2. Upstream 落點

packages/core/src/police/family.ts::runMapIntegrationPolice；map-curator.ts

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- compose / merge / dedup-merge / sweep 4 signal 皆產 finding，不改 map-curator semantic。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
