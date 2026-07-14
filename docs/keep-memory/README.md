<!-- doc_id: doc_index_keep_memory -->
# keep-memory/ 記憶筆記層契約

> 本目錄是 keep 機制的「沉澱層」：一則教訓一個檔案，寫得快、會過期、定期整併。
> 與 `docs/keep-shards/`（共識層，改得慢）分工：**shards 收「是什麼」，本層收「怎麼踩過坑」**。
> 唯一規劃真相來源：`docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md`（TASK-MEM-0001 落地）。

## frontmatter 契約（每檔必備）

```yaml
---
name: gotcha-atm-close-sequence        # kebab-case，全目錄唯一
description: 一句 hook，會進 keep.summary.md 索引，決定未來找不找得到
type: gotcha                            # gotcha | feedback | status | reference
updated: 2026-07-13                     # 絕對日期，禁止「上週」「最近」
repo: AI-Atomic-Framework               # 教訓發生地
status: active                          # active | superseded | retired
---
```

## 型別定義

| type | 收什麼 | 過期門檻（巡邏用） |
|---|---|---|
| `gotcha` | 踩坑 + 已確認的解法（CLI 陷阱、hook 誤判、流程雷區） | 180 天 |
| `feedback` | 人類指正過的工作方式，必附 Why 與 How to apply | 180 天 |
| `status` | 重大收口快照（lane 全清、里程碑完成） | 30 天 |
| `reference` | 外部資源指標（URL、dashboard、ticket） | 180 天 |

命名慣例：`<type>_<slug>.md`，如 `gotcha_atm-close-sequence.md`。

## 主動寫入觸發（不等人叫）

1. **踩坑並確認解法之後**——下個 session 一定會再撞的知識最優先。
2. **重大狀態收口時**——讓接手者不用考古 git log。
3. **被人類指正工作方式時**——寫 `feedback` 型，附 Why / How to apply。
4. **推翻舊記憶時**——回頭改 `status: superseded` 或直接修正內文，不留錯誤斷言。

## 不寫規則（與觸發同等重要）

- repo 正式文件已記錄的（backlog、task card、keep-shards、git history）**不重複寫**。
- 只對當下對話有意義的細節（臨時輸出、中間狀態）不寫。
- **ATM 治理缺陷優先進 `ATM_BUG_OPTIMIZATION_BACKLOG.md`**；本層只收「操作者怎麼避開」的直覺，backlog 收「框架要修什麼」。

## 索引與整併

- 每檔落地後，在 `docs/keep.summary.md` 的 keep-memory 索引段落補一行：
  `- [name](docs/keep-memory/檔名.md) — description`。
- 索引段落預算 30 行；超標跑 `atm-memory-consolidate` skill（TASK-MEM-0003）整併。
- 穩定超過半年的 gotcha 可提案升級進 keep-shards 對應章節（**一律人審**，不自動改共識層）。
- 引用過期記憶時自我警覺：它是 point-in-time observation，斷言前先驗證現況。

## 巡邏節奏（TASK-MEM-0006）

- 建議每週或每次大型收口後跑一次：`node tools_node/memory-manager.js patrol docs/keep-memory`。
- patrol 聚合三面：stale（過期候選＋verify-before-asserting 提示）、budget（索引超過 30 行）、orphan（檔案與索引雙向缺漏）。
- 全部 advisory，不擋任何流程；連續兩次超標必跑 `atm-memory-consolidate` skill 整併。
