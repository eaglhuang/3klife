<!-- doc_id: doc_other_0661 -->
# APF-0020 — Core blocker police family facades

## 1. 目的

將 Schema / Boundary / Dependency Graph / Registry Consistency / Lifecycle 包成共用 family facade。

## 2. Upstream 落點

packages/core/src/police/family.ts::buildCorePoliceFamilies；runPoliceChecks；runLifecyclePolice

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- Lifecycle 保留 quarantine writer；非 lifecycle quarantine negative fixture 必須 fail。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
