---
doc_id: doc_task_0032
id: HARN-TRC-0001
priority: P1
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: trace-contract
chain_id: HARN-CHAIN-TRACE
chain_step: 1/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-ART-0002
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Execution Trace Event Schema 任務卡 | 阻塞: depends HARN-ART-0002"
---

# [HARN-TRC-0001] 定義 Execution Trace Event Schema

> **Harness rollout 開卡** — 建立可比較的工具執行軌跡基礎
> **定位**：Phase 2 / Execution trace 第 1 步
> **前置依賴**：`HARN-ART-0002` artifact validator 已提供穩定欄位驗證思路

## 問題描述

目前 repo 內 Node 工具的執行順序、耗時與成功/失敗只存在於終端輸出裡，沒有正式資料結構，因此無法回答：

- 這輪到底跑了哪些工具、順序如何
- 哪一步耗時異常或失敗重試最多
- 同樣最終 pass 的兩輪，路徑是否其實差很多

第一步必須先定義 `execution-trace/v1` JSONL event schema，讓後續 middleware 與 collector 能共用同一套欄位。

## INPUT_CONTRACT

- 第一版只追 repo 內 Node 工具呼叫，不嘗試捕捉 VS Code 全部 tool call
- `context-guard-core.js` 已是 Node 子工具的集中掛點
- trace 需要與 turn artifact 一樣具備可驗證、可升版特性

## OUTPUT_CONTRACT

- [ ] 定義 `execution-trace/v1` event schema 或等價契約檔
- [ ] 每筆 event 至少包含：`traceVersion`、`toolName`、`argsHash`、`startedAt`、`endedAt`、`durationMs`、`exitCode`
- [ ] 允許 `stdoutSummary`、`stderrSummary`、`status`、`workflow`、`task` 等欄位
- [ ] 明確區分 JSONL event 與最終聚合 trace artifact 的差異
- [ ] 補版本升級與相容策略，避免後續 middleware 各自擴欄位

## VALIDATION_CMD

```bash
node -e "const fs=require('fs'); const p='tools_node/schemas/execution-trace-event.schema.json'; JSON.parse(fs.readFileSync(p,'utf8')); console.log('execution trace schema parse ok');"
```

## ROLLBACK_HINT

```bash
git checkout tools_node/schemas/
```

## 執行步驟

1. 先定義最小必要欄位，不在第一版引入過度詳細的 stdout/stderr 全量儲存。
2. 把 event schema 與最終 trace artifact 分層，避免單筆事件與聚合摘要混在一起。
3. 對 `argsHash`、`durationMs`、`exitCode` 明確定義型態與意義。
4. 預留 `workflow/task` 關聯欄位，讓後續 metrics 可直接聚合。
5. 補一份簡短的 versioning 規則，為 `HARN-TRC-0003` collector 做準備。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：ART-0002 尚未交付；未見 execution trace event schema。
- 需修改：等 artifact validator 後定義 trace event schema 與 version contract。
