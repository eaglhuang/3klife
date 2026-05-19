<!-- doc_id: doc_other_0670 -->
# APF-0029 — Roadmap backwrite and risk closure

## 1. 目的

回寫主計畫書、specs、tasks README，將 §9 改為 Closed risk matrix。

## 2. Upstream 落點

本 APF 目錄所有 M8/M9 文件

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- 新任務卡有 doc_id / artifact_status / runtime_status / upstream_mutation_status，encoding guard 通過。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
