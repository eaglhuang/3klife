<!-- doc_id: doc_other_0634 -->
# APF-0013 — Validation Gate Activation Policy

## 1. 決策

M7 的核心判準是：一個 police family 若不能被 validator profile 啟動、不能產生 machine-readable finding/report，就只能稱為 roadmap / embedded capability，不能稱為已進入「守關」狀態。

本政策新增狀態 `gate-active`：

| 狀態 | 定義 |
|---|---|
| `gate-active` | 已接入 `validate:standard` 或 `validate:full`，每次 gate 執行時會被呼叫並輸出 `PoliceFamilyGateReport` 或 `PoliceFinding` |

## 2. Profile policy

| Profile | Blocker family | Advisory family | 說明 |
|---|---|---|---|
| `standard` | Schema / Boundary / Dependency Graph / Registry Consistency / Lifecycle / Quality | Dedup / Demand / Map Integration / Atomization / Orchestrator telemetry | 最低守關 gate；blocker finding 可造成 non-zero exit，advisory finding 不阻塞 CI 但必須寫入 report |
| `full` | 依 APF-0010 promotion rule 決定 | 全 family 必跑 | `full` 繼承 `standard` 的 family gate，並保留既有 `validate:police` 深度 fixture 驗收 |

Quality 在 `standard` 先以既有 `validate:regression-compare` / non-regression 語義作 blocker；Dedup / Demand / Map Integration / Atomization 先以 adapter 產 advisory finding，不宣稱 named scanner 已完整產品化。

## 3. 不做的事

- 不新增背景 daemon 或自動巡邏。
- 不新增第二套 approval workflow。
- 不讓 advisory adapter 直接 mutate registry。
- 不把 3KLife / Cocos / private path 寫入 upstream protected public docs。

## 4. Alpha gate

`validate:standard` 必須能啟動 police family gate runner；`validate:full` 必須繼承 runner 並額外保留既有 `validate:police`。

## 5. Acceptance

- `validate:standard` 會執行 `validate-police-family`。
- blocker family 的 blocking finding 會讓 validator exit non-zero。
- advisory family 有 finding 時 validator 仍可 pass，但 report 必須記錄。
- 所有 bridged finding 都走 `ReviewAdvisory.machine-finding + metadata.policeFinding`。
