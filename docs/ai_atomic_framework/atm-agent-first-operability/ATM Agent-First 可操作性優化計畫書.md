<!-- doc_id: doc_other_1318 -->
# ATM Agent-First 可操作性優化計畫書

## 摘要

本計畫書建立一條新的 `AAO` 主題線，專門處理 ATM 在 Agent 實際操作時的可讀性、可追溯性、上下文負擔與 surface drift 問題。  
`TASK-ASA-*` 保留給「ATM 框架 100% 自我原子化」主線，不重排、不改號、不把 Agent UX 類問題混進 ASA 驗收口徑。

AAO 的定位不是另起一套 ATM runtime task model，而是 3KLife 端的規劃與開發索引。  
真正的 upstream 實作仍然發生在 `AI-Atomic-Framework`，AAO 只負責把這批優化拆成可逐張執行的任務卡。

## 背景與目的

先前的架構分析報告抓到幾個真問題，但也有一些判斷已經被 repo 現況推翻，或其實已由既有計畫承接：

- `packages/cli/src/commands/tasks.ts` 與 `next.ts` 仍然過大，Agent 閱讀成本偏高。
- `commandSpecs` 已存在，CLI 不是純 if-else；但 runner 與 spec 確實有 drift。
- `next --json` 已輸出 `reason`、`allowedCommands`、`blockedCommands`、`missingEvidence`，不是完全黑箱；但仍缺少更穩定的決策摘要欄位。
- `any` debt 有既有 budget 與 lint 警示政策，不能再把它當作「完全未治理」。
- validator / `node:test` / release-smoke 已存在，不能把 repo 描述成「零標準測試框架」；但 validator failure 對 Agent 仍不夠可修。
- onefile 發行物偏大是事實，但它是 intentional artifact；第一步不應直接預設「換 bundler」。

AAO 的目標就是把這些「仍值得改善，但不適合塞進 ASA 主線」的問題收斂成另一套可執行計畫。

## 為何不併入 ASA

ASA 解決的是治理覆蓋率：

- 哪些 production source 已有 atom / map owner
- 哪些 command / validator / release artifact 已被正式納管
- 哪些證據、rollback、provenance 與 readable callsite 已經齊備

AAO 解決的是 Agent 操作體感：

- CLI surface 是否單一真相來源
- `next` 的決策摘要是否夠清楚
- validator 失敗是否能直接指向下一步
- 巨型 command 檔案是否造成上下文爆炸
- docs / schema / command list 是否持續漂移

兩者互相依賴，但不是同一種完成標準。  
因此 AAO 採「新系列 + 完整橋接」而不是 `TASK-ASA-0017+`。

## 現況稽核與問題路由

| 報告問題 | Repo 現況裁決 | 承接路由 | 說明 |
|---|---|---|---|
| 1. 巨型 command 檔案 | 採納 | `TASK-ASA-0009` + `TASK-AAO-0005` | ASA 先建立 ownership，再由 AAO 做 context slimming。 |
| 2. `any` 過多 | 部分採納 | `TASK-ATD-0023` | 已有 budget 與 lint warn，AAO 不重開同類卡。 |
| 3. CLI 規格分散 | 採納 | `TASK-AAO-0002` | 現有 `commandSpecs` 可升級成真正 SSOT。 |
| 4. 流程黑箱 | 部分採納 | `TASK-AAO-0003` | 不推翻 `next` 單一路由，只增加穩定決策摘要。 |
| 5. 命令 discoverability 弱 | 採納 | `TASK-AAO-0002` + `TASK-AAO-0006` | 以 spec/help/docs drift guard 收斂。 |
| 6. 缺少決策路徑輸出 | 採納 | `TASK-AAO-0003` | 規劃 `decisionTrail`，但不暴露 private chain-of-thought。 |
| 7. validator debug 成本高 | 採納 | `TASK-AAO-0004` | 保留 validator-first，標準化 failure envelope。 |
| 8. 缺 E2E / release smoke | 部分採納 | `TASK-ATD-0032` | 已有 root-drop sandbox E2E 路線，AAO 不重開。 |
| 9. docs 與真實行為漂移 | 採納 | `TASK-AAO-0006` | 建立 docs / schema / command drift guard。 |
| 10. onefile 過胖 | 部分採納 | `TASK-AAO-0007` + `TASK-ASA-0014` | 先建立 budget 與報表，不直接跳到 bundler replacement。 |

## 與 ASA / ATD 的橋接原則

- `TASK-ASA-*` 仍是 ATM 自我原子化主線。
- `TASK-ATD-0023` 已承接 `any` debt budget，AAO 只引用，不重開。
- `TASK-ATD-0025` 已承接 release parity gate，AAO 的 onefile 預算需承接這個 gate。
- `TASK-ATD-0032` 已承接 root-drop sandbox E2E，AAO 不重開第二套 release E2E。
- AAO 卡若依賴 ASA / ATD，需在 `blocked_by` 與正文內明寫，不可隱性重複。

## AAO 任務路線

### M0 文件初始化

- `TASK-AAO-0000`：建立 AAO 目錄、主計畫、README、tasks README、任務卡全集與 ASA 橋接索引

### M1 路由與決策介面

- `TASK-AAO-0001`：報告問題 overlap matrix 與任務路由裁決
- `TASK-AAO-0002`：CLI command spec / runner SSOT drift guard
- `TASK-AAO-0003`：`next` decisionTrail JSON contract

### M2 Agent 可修性

- `TASK-AAO-0004`：validator failure envelope 標準化
- `TASK-AAO-0005`：CLI 巨型檔案 context slimming wave 1

### M3 Drift 與 Release 體感

- `TASK-AAO-0006`：docs / schema / command drift guard
- `TASK-AAO-0007`：onefile size / startup budget

### M4 回寫與關閉橋接

- `TASK-AAO-0008`：AAO roadmap backwrite 與 ASA bridge closure

## 里程碑與依賴

| Milestone | 內容 | 依賴 |
|---|---|---|
| M0 | AAO 文件區初始化 | 無 |
| M1 | 路由裁決、CLI SSOT、`decisionTrail` 契約 | `TASK-ASA-0009` |
| M2 | validator failure envelope、巨型檔案 context slimming | `TASK-ASA-0009`、`TASK-ASA-0010` |
| M3 | docs drift、onefile budget | `TASK-ASA-0010`、`TASK-ASA-0014`、`TASK-ATD-0025`、`TASK-ATD-0032` |
| M4 | 回寫與 bridge closure | `TASK-AAO-0005`、`TASK-AAO-0006`、`TASK-AAO-0007` |

## 驗證命令

文件與規劃層：

- `node tools_node/doc-id-registry.js --assign <path>`
- `node tools_node/doc-id-registry.js --verify`
- `npm run check:encoding:touched -- --files <files...>`
- `git diff --check`

後續 upstream implementation 預期驗證：

- `npm run typecheck`
- `npm run validate:cli`
- `npm run validate:standard`
- `node atm.mjs validate atom-callsite-readability --repo . --json`
- `node atm.mjs doctor --json`

## 非目標

- 不重排 `TASK-ASA-0001` 到 `TASK-ASA-0016`
- 不新增第二套 ATM runtime task queue
- 不在這一步同步寫入 `AI-Atomic-Framework/.atm/history/tasks`
- 不重開 `any` debt 或 release sandbox E2E 的平行任務卡
- 不預設以更換 bundler 作為 onefile 問題的第一解

## 交付邊界

- 規劃真相來源：`C:\Users\User\3KLife\docs\ai_atomic_framework\atm-agent-first-operability\`
- upstream 實作目標 repo：`C:\Users\User\AI-Atomic-Framework`
- AAO 系列只管理規劃、依賴、驗收與橋接，不直接替代 ATM 的 `next --json` 路由

## 任務入口

- 任務索引：[`tasks/README.md`](./tasks/README.md)
- 系列說明：[`README.md`](./README.md)

