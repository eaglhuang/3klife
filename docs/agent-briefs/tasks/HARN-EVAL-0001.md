---
doc_id: doc_task_0011
id: HARN-EVAL-0001
priority: P1
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: eval-taxonomy
chain_id: HARN-CHAIN-EVAL
chain_step: 1/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0003
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Workflow Path Taxonomy 任務卡 | 阻塞: depends HARN-TRC-0003"
---

# [HARN-EVAL-0001] 建立 Workflow Path Taxonomy

> **Harness rollout 開卡** — 為 trace 與 artifact 建立可比較的路徑分類
> **定位**：Phase 2 / Eval baseline 第 1 步
> **前置依賴**：`HARN-TRC-0003` 已能輸出 aggregated trace artifact

## 問題描述

如果沒有 taxonomy，trace 只是一堆事件列表，後續很難回答「這輪屬於哪種工作路徑」。需要先定義 path class，讓 baseline 與 drift comparator 有共同語言。

第一版預計至少包含：

- doc-only
- tooling-code
- UI-QA
- runtime-debug
- multi-agent-handoff

## INPUT_CONTRACT

- trace artifact 已有基本 summary
- turn artifact 內含 workflow / task / files 等上下文
- 第一版分類規則可先採 deterministic heuristic，不依賴 LLM 判讀

## OUTPUT_CONTRACT

- [ ] 定義 workflow path taxonomy 檔或等價規則表
- [ ] 至少覆蓋 5 種主要 path class
- [ ] 每類別明確定義判準、主要證據欄位與常見風險
- [ ] 分類規則需可被後續 comparator 與 metrics 工具引用
- [ ] 補一份簡短說明，說明何時新增新 class、何時只擴充既有 class

## VALIDATION_CMD

```bash
node -e "const fs=require('fs'); const p='tools_node/lib/harness/workflow-path-taxonomy.json'; JSON.parse(fs.readFileSync(p,'utf8')); console.log('workflow path taxonomy parse ok');"
```

## ROLLBACK_HINT

```bash
git checkout tools_node/lib/harness/
git checkout docs/
```

## 執行步驟

1. 先把 path class 控制在少量高區辨度類別，不要一開始切太細。
2. 類別判準優先使用 workflow name、tool sequence、artifact path 特徵等 deterministic evidence。
3. 每類別記錄主要風險，供後續 drift comparator 做 warn 分級。
4. 對交疊情境定義 primary class 選擇規則，避免同一輪被多重分類。
5. 完成後再由 `HARN-EVAL-0002` 為每類建立 baseline fixture。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：trace collector 尚未交付；未見 workflow path taxonomy 文件。
- 需修改：等 TRC-0003 後定義 doc-only/tooling/UI-QA/runtime/handoff path taxonomy。
