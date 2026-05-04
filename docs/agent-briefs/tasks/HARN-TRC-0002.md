---
doc_id: doc_task_0033
id: HARN-TRC-0002
priority: P1
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: trace-middleware
chain_id: HARN-CHAIN-TRACE
chain_step: 2/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0001
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Node Tool Trace Middleware 任務卡 | 阻塞: depends HARN-TRC-0001"
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

- [ ] 新增 `tools_node/lib/execution-trace-middleware.js`
- [ ] middleware 可包裝 Node tool 執行並寫出 JSONL event
- [ ] event 需包含 `toolName`、`argsHash`、`startedAt`、`endedAt`、`durationMs`、`exitCode`
- [ ] stdout/stderr 只保留摘要，不保留整段重 payload
- [ ] middleware 接入 `context-guard-core.js` 的最小掛點，不破壞舊行為

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
