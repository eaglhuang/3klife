---
doc_id: doc_task_0033
id: HARN-TRC-0002
priority: P1
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
type: trace-middleware
chain_id: HARN-CHAIN-TRACE
chain_step: 2/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0001
started_at: "2026-05-04T22:58:57+08:00"
started_by_agent: "GitHubCopilot"
completed_at: "2026-05-04T23:00:24+08:00"
completed_by_agent: "GitHubCopilot"
notes: "2026-05-04 | 狀態: done | 驗證: pass | 變更: 新增 execution-trace-middleware.js，context-guard-core.runNodeTool 可透過 EXECUTION_TRACE_JSONL opt-in 寫出 JSONL event；stdout/stderr 僅保存摘要 | 阻塞: none"
---

# [HARN-TRC-0002] 建立 Node Tool Trace Middleware

> **Harness rollout 開卡** — 以低侵入方式捕捉 repo 內 Node 工具執行事件
> **定位**：Phase 2 / Execution trace 第 2 步
> **前置依賴**：`HARN-TRC-0001` event schema 已穩定

## 問題描述

光有 schema 沒有事件來源，trace 仍然不存在。第一版最划算的掛點是 `tools_node/lib/context-guard-core.js` 這層 Node 子工具執行封裝，因為它已負責呼叫多個內部 CLI。

需要建立一個低侵入 middleware：

- 包住 Node 工具執行
- 記錄起訖時間、exit code、摘要化輸出
- 產出 JSONL event，而不是直接把完整 stdout dump 進 artifact

## INPUT_CONTRACT

- `execution-trace/v1` event schema 已存在
- `context-guard-core.js` 的 Node 工具呼叫有可插入的集中層
- 第一版只追蹤 repo 內 Node CLI，不追一般 shell command

## OUTPUT_CONTRACT

- [x] 新增 `tools_node/lib/execution-trace-middleware.js`
- [x] middleware 可包裝 Node tool 執行並寫出 JSONL event
- [x] event 需包含 `toolName`、`argsHash`、`startedAt`、`endedAt`、`durationMs`、`exitCode`
- [x] stdout/stderr 只保留摘要，不保留整段重 payload
- [x] middleware 接入 `context-guard-core.js` 的最小掛點，不破壞舊行為

## 實作結果（2026-05-04）

- 新增 `tools_node/lib/execution-trace-middleware.js`。
- `context-guard-core.runNodeTool()` 會在 `EXECUTION_TRACE_JSONL` 設定時寫出 `execution-trace/v1` JSONL event；未設定時維持原行為。
- `argsHash` 採 `sha256:` 穩定 hash，不保存 raw args。
- `stdoutSummary` / `stderrSummary` 僅保存 bytes / lines / truncated / text 摘要，單段文字上限 1200 chars。
- workflow / task / run id 可透過 options 或 `EXECUTION_TRACE_WORKFLOW`、`EXECUTION_TRACE_TASK`、`EXECUTION_TRACE_RUN_ID` 注入。

## 驗證結果（2026-05-04）

```bash
node tools_node/generate-context-summary.js --workflow trace-smoke --task trace-smoke --goal "trace middleware smoke" --files package.json --json
node tools_node/run-guarded-workflow.js --workflow trace-smoke --task HARN-TRC-0002 --goal "trace middleware smoke" --files package.json --summary-only --allow-warn
node -e "... validate scratch/harn-trc-0002-smoke.jsonl with tools_node/schemas/execution-trace-event.schema.json ..."
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
node tools_node/check-encoding-touched.js --files docs/agent-briefs/tasks/HARN-TRC-0002.md tools_node/lib/execution-trace-middleware.js tools_node/lib/context-guard-core.js
```

結果：pass；middleware smoke 產出 2 筆 schema-valid JSONL event。

## VALIDATION_CMD

```bash
node tools_node/generate-context-summary.js --workflow trace-smoke --task trace-smoke --goal "trace middleware smoke" --files package.json --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/lib/context-guard-core.js
git checkout tools_node/lib/execution-trace-middleware.js
```

## 執行步驟

1. 先把 trace 寫入與主執行流程分離，避免 tool failure 時又把 trace 邏輯一併打壞。
2. `argsHash` 採穩定 hash，不直接存整段敏感參數。
3. `stdoutSummary` / `stderrSummary` 只保留前後文摘要，遵守 token 節流原則。
4. 以 opt-in 或明確參數啟用第一版 trace，避免所有 workflow 立刻背負額外成本。
5. 為 `HARN-TRC-0003` 預留 JSONL 收集檔案位置與 metadata。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：TRC-0001 尚未交付；未見 node tool trace middleware。
- 需修改：建立 middleware，並避免污染工具 stdout。

## 完成覆核（2026-05-04）

- 覆核結論：已達成。
- 驗證證據：context summary CLI smoke pass；middleware JSONL schema pass；quick compute gate pass；encoding touched pass。
- 後續銜接：`HARN-TRC-0003` 可讀取 middleware 輸出的 JSONL event 並聚合成 trace artifact。
