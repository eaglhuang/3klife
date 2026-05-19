<!-- doc_id: doc_other_0669 -->
# APF-0028 — Profile promotion and blocker policy

## 1. 目的

standard 跑所有 named scanner；Dedup/Demand/Map/Atomization 先 advisory，Quality/Core blocker。

## 2. Upstream 落點

validators.config.json；package.json；validate-police-family.ts

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- 升 blocker 仍依 APF-0010 false-positive / fixture / release rule。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
