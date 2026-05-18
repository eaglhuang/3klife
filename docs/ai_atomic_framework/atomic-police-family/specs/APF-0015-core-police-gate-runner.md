<!-- doc_id: doc_other_0636 -->
# APF-0015 — Core Police Gate Runner

## 1. 目的

新增 `scripts/validate-police-family.ts` 作為真正的 gate entry，把已存在的 core police 收進同一份 family report。這不是重寫 scanner，而是把可執行的 blocker police 以 APF-0014 的 report contract 包起來。

## 2. Core blocker families

| Family | 現有來源 | `standard` 動作 |
|---|---|---|
| Schema Police | schema validator / schema fixtures | blocker |
| Boundary Police | `layer-boundary.ts` / `forbidden-import-scanner.ts` | blocker |
| Dependency Graph Police | `dependency-graph.ts` / `runPoliceChecks` | blocker |
| Registry Consistency Police | `registry-consistency.ts` | blocker |
| Lifecycle Police | `lifecycle-police.ts` / lifecycle fixtures | blocker |
| Quality Police | `regression-compare.ts` / non-regression gate | blocker via existing quality validator |

## 3. Runner behavior

- 呼叫既有 `runPoliceChecks`，不要分叉 rule definition。
- 呼叫既有 lifecycle validator / report producer，保留 `LifecyclePoliceFinding` 與 quarantine writer 的特例。
- 將各來源輸出 normalize 成 `PoliceFamilyGateReport.families[]` 與 `blockingFindings[]`。
- `blockingFindings.length > 0` 時 exit non-zero。
- 若某 family 尚未能產 PoliceFinding，runner 仍需產 family-level report，並標 `status='error'` 或 `status='skipped'`，不可靜默略過。

## 4. 與既有 validate:police 的關係

`validate-police.ts` 保留為 `full` profile 的深度 fixture 驗收；`validate-police-family.ts` 是 `standard` gate entry。兩者短期並存，待 APF-0017 profile wiring 穩定後再評估整併。
