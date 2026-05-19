<!-- doc_id: doc_other_0668 -->
# APF-0027 — ReviewAdvisory bridge hardening

## 1. 目的

appendMachineFindings 保留 metadata.policeFinding 與多 evidence refs。

## 2. Upstream 落點

packages/plugin-review-advisory/src/index.ts；scripts/validate-review-advisory.ts

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- high/block 轉 request-human-review；advisory 不自動 approved。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
