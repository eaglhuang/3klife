<!-- doc_id: doc_other_0667 -->
# APF-0026 — Police orchestrator and CLI report producer

## 1. 目的

新增 runPoliceFamilyGate family registry，validate-police-family 改呼叫 orchestrator，CLI source 補 police run。

## 2. Upstream 落點

packages/core/src/police/family.ts::runPoliceFamilyGate；scripts/validate-police-family.ts；packages/cli/src/commands/police.ts

## 3. M8 產品化語意

- 狀態：`productized-gate-active`。
- 產物必須是 `PoliceFamilyGateReport` / `PoliceFinding` / ReviewAdvisory machine finding，不得直接寫 registry。
- `metadata.policeFinding` 是目前 bridge path；`payload` 仍不是現況 contract。
- advisory family 可被 gate 呼叫並產 report，但升 blocker 仍需 APF-0010 promotion gate。

## 4. Acceptance

- validator 產 PoliceFamilyGateReport；CLI 支援 --profile / --out；不寫 registry。
- `validate:police-family` 必須覆蓋 positive / negative case。
- protected public surface 不得含 adopter-specific policy。
