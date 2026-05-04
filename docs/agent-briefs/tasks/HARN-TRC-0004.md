---
doc_id: doc_task_0035
id: HARN-TRC-0004
priority: P2
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: workflow-tooling
chain_id: HARN-CHAIN-TRACE
chain_step: 4/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0003
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Finalize Trace Attachment 任務卡 | 阻塞: depends HARN-TRC-0003"
---

# [HARN-TRC-0004] 將 Trace Summary 掛入 Finalize 輸出

> **Harness rollout 開卡** — 讓 trace 從獨立工件升級為正式收工證據的一部分
> **定位**：Phase 2 / Execution trace 第 4 步
> **前置依賴**：`HARN-TRC-0003` collector 已可輸出 aggregated trace artifact

## 問題描述

若 trace 只能手動收集與查看，它很難成為日常 workflow 的證據。需要把 trace summary 接入 `finalize-agent-turn.js`，讓正式收工輸出可同時帶出：

- turn artifact
- handoff diff verdict
- trace summary / trace artifact path

## INPUT_CONTRACT

- trace collector 已可輸出 `execution-trace/v1`
- finalize 已支援 artifact 與 handoff 的 JSON 輸出擴充
- 第一版只需附上 trace summary，不必把整段 JSONL inline 進 JSON output

## OUTPUT_CONTRACT

- [ ] `finalize-agent-turn.js` 可選擇附上 `traceSummary`
- [ ] 支援 trace artifact path 或 summary path 回報
- [ ] JSON 輸出中的 trace 欄位與 artifact/handoff 並列
- [ ] trace 缺失時能清楚標示 skipped / missing / disabled
- [ ] 不讓 finalize 因 trace 選配而破壞舊流程相容

## VALIDATION_CMD

```bash
node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task trace-attachment-smoke --goal "trace attachment smoke" --files package.json --emit-turn-artifact --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/finalize-agent-turn.js
git checkout tools_node/lib/
```

## 執行步驟

1. trace summary 只輸出聚合摘要與 artifact path，不內嵌全量事件。
2. 對 trace disabled / missing / malformed 做明確狀態區分。
3. 保持 finalize 的欄位擴充方式與 artifact/handoff 一致，避免 JSON output 變得不規則。
4. 讓後續 pilot workflow 能在單一 finalize JSON 裡看到 artifact + handoff + trace 三層證據。
5. 完成後再交由 `HARN-PILOT-0002` 驗證實戰效果。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：TRC-0003 尚未交付；finalize 尚未附帶 trace summary/path。
- 需修改：把 trace summary/path 接入 finalize-agent-turn.js。
