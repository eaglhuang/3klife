<!-- doc_id: doc_other_0660 -->
# APF-0019 — PoliceFinding public contract stabilization

## 1. 目的

在 upstream SDK/core 補正式 PoliceFinding、PoliceFamilyGateReport、EvidenceRef 與 severity/action mapper。

## 2. Upstream 落點

packages/core/src/police/family.ts；packages/plugin-sdk/src/police.ts；scripts/validate-plugin-sdk.ts

## 3. M8 產品化語意

- 狀態：`upstream-api-applied`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- validate:plugin-sdk + validate:police-family 通過；payload 仍不得成為現況。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
