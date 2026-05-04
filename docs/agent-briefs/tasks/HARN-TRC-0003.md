---
doc_id: doc_task_0034
id: HARN-TRC-0003
priority: P1
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
type: trace-collector
chain_id: HARN-CHAIN-TRACE
chain_step: 3/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0002
started_at: "2026-05-04T23:03:00+08:00"
started_by_agent: "GitHubCopilot"
completed_at: "2026-05-04T23:05:56+08:00"
completed_by_agent: "GitHubCopilot"
notes: "2026-05-04 | 狀態: done | 驗證: pass | 變更: 新增 collect-execution-trace.js，可讀 JSONL event、用 schema 驗證並輸出 execution-trace/v1 artifact；補 smoke fixture 與 artifact shape assertion | 阻塞: none"
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

- [x] 新增 `tools_node/collect-execution-trace.js`
- [x] 讀取 JSONL event 並輸出聚合 trace artifact
- [x] artifact 至少包含 `events`、`summary`、`toolCount`、`errorCount`、`totalDurationMs`
- [x] 提供 fail/warn 訊號：空 trace、schema mismatch、破損事件
- [x] 產物格式需可被後續 `HARN-EVAL-*` 與 `HARN-MET-*` 共用

## 實作結果（2026-05-04）

- 新增 `tools_node/collect-execution-trace.js`。
- 新增 `tests/fixtures/harness/execution-trace-smoke.jsonl` 作為最小 trace smoke sample。
- collector 逐行讀取 JSONL，套用 `tools_node/schemas/execution-trace-event.schema.json` 驗證事件。
- 輸出 `execution-trace/v1` artifact，頂層包含 `eventCount`、`toolCount`、`errorCount`、`totalDurationMs`，並保留 `summary` 與精簡後的 `events`。
- event 內只保存 stdout/stderr 的 bytes / lines / truncated，不內嵌原始文字，避免 artifact 膨脹。
- strict 模式會在空 trace、schema mismatch 或 broken JSONL line 時以非 0 結束。

## 驗證結果（2026-05-04）

```bash
node tools_node/collect-execution-trace.js --input tests/fixtures/harness/execution-trace-smoke.jsonl --output scratch/trace-smoke.summary.json --strict
node -e "... assert scratch/trace-smoke.summary.json eventCount/toolCount/errorCount/totalDurationMs and no stdout text ..."
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
node tools_node/check-encoding-touched.js --files docs/agent-briefs/tasks/HARN-TRC-0003.md tools_node/collect-execution-trace.js tests/fixtures/harness/execution-trace-smoke.jsonl
```

結果：pass。

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

## 完成覆核（2026-05-04）

- 覆核結論：已達成。
- 驗證證據：collector strict smoke pass；artifact shape assertion pass；quick compute gate pass；encoding touched pass。
- 後續銜接：`HARN-TRC-0004` 可將 collector 輸出的 summary/path 接入 finalize。
