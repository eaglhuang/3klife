---
doc_id: doc_task_0034
id: HARN-TRC-0003
priority: P1
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: trace-collector
chain_id: HARN-CHAIN-TRACE
chain_step: 3/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0002
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Trace Collector 任務卡 | 阻塞: depends HARN-TRC-0002"
---

# [HARN-TRC-0003] 建立 Execution Trace Collector

> **Harness rollout 開卡** — 將 JSONL event 聚合成可消費的 trace artifact
> **定位**：Phase 2 / Execution trace 第 3 步
> **前置依賴**：`HARN-TRC-0002` middleware 已能輸出 event JSONL

## 問題描述

middleware 只會累積原始事件流。若沒有 collector，之後的 path taxonomy、metrics 與 drift comparator 都必須自己重讀 JSONL，會造成重複邏輯與格式漂移。

這張卡要建立第一版 collector，把一段 JSONL trace 聚合成 `execution-trace/v1` artifact，並提供摘要欄位。

## INPUT_CONTRACT

- JSONL event 已符合 `HARN-TRC-0001` schema
- middleware 能穩定輸出至少 3 筆事件
- 第一版 collector 只處理 repo 內 Node tool trace

## OUTPUT_CONTRACT

- [ ] 新增 `tools_node/collect-execution-trace.js`
- [ ] 讀取 JSONL event 並輸出聚合 trace artifact
- [ ] artifact 至少包含 `events`、`summary`、`toolCount`、`errorCount`、`totalDurationMs`
- [ ] 提供 fail/warn 訊號：空 trace、schema mismatch、破損事件
- [ ] 產物格式需可被後續 `HARN-EVAL-*` 與 `HARN-MET-*` 共用

## VALIDATION_CMD

```bash
node tools_node/collect-execution-trace.js --input scratch/trace-smoke.jsonl --output scratch/trace-smoke.summary.json --strict
```

## ROLLBACK_HINT

```bash
git checkout tools_node/collect-execution-trace.js
git checkout scratch/trace-smoke.*
```

## 執行步驟

1. 明確區分 raw JSONL 與 aggregated artifact 的責任。
2. 聚合摘要只保留比較與統計需要的欄位，不複製全部原始輸出。
3. 對 event 破損或 schema mismatch 建立明確 fail 訊息。
4. 摘要欄位需能支援後續 path classification 與 retry count 判斷。
5. 交付時補一組最小 trace smoke sample 供未來 regression 使用。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：TRC-0002 尚未交付；未見 trace collector。
- 需修改：建立 collector 與 summary output。
