---
doc_id: doc_task_0035
id: HARN-TRC-0004
priority: P2
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
type: workflow-tooling
chain_id: HARN-CHAIN-TRACE
chain_step: 4/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0003
started_at: "2026-05-04T23:07:55+08:00"
started_by_agent: "GitHubCopilot"
completed_at: "2026-05-04T23:10:04+08:00"
completed_by_agent: "GitHubCopilot"
notes: "2026-05-04 | 狀態: done | 驗證: pass | 變更: finalize-agent-turn.js 新增 --trace-artifact/--trace-summary，JSON output 會附 traceSummary summary/path；支援 disabled/missing/malformed/pass 狀態且不內嵌 events | 阻塞: none"
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

- [x] `finalize-agent-turn.js` 可選擇附上 `traceSummary`
- [x] 支援 trace artifact path 或 summary path 回報
- [x] JSON 輸出中的 trace 欄位與 artifact/handoff 並列
- [x] trace 缺失時能清楚標示 skipped / missing / disabled
- [x] 不讓 finalize 因 trace 選配而破壞舊流程相容

## 實作結果（2026-05-04）

- `finalize-agent-turn.js` 新增 `--trace-artifact <path>`，並支援 `--trace-summary <path>` alias。
- JSON output 新增 `traceSummary`，與 `turnArtifactOutput` / `handoffDiff` 並列。
- 未指定 trace 時回報 `status=disabled`；指定但檔案不存在回報 `status=missing`；JSON 或版本契約不符回報 `status=malformed`。
- trace attach 成功時只輸出 artifact path、summary counts、tools/status/workflow/task counts，不內嵌 `events` 全量內容。
- 非 JSON 模式會列印單行 trace summary，維持 finalize 舊流程相容。

## 驗證結果（2026-05-04）

```bash
node tools_node/collect-execution-trace.js --input tests/fixtures/harness/execution-trace-smoke.jsonl --output scratch/harn-trc-0004-trace-summary.json --strict
node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task trace-attachment-smoke --goal "trace attachment smoke" --files package.json --emit-turn-artifact --artifact-file scratch/harn-trc-0004-turn-artifact.json --trace-artifact scratch/harn-trc-0004-trace-summary.json --skip-ucuf --json
node -e "... assert traceSummary pass/disabled/missing states and no events inline ..."
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
node tools_node/check-encoding-touched.js --files docs/agent-briefs/tasks/HARN-TRC-0004.md tools_node/finalize-agent-turn.js
```

結果：pass。

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

## 完成覆核（2026-05-04）

- 覆核結論：已達成。
- 驗證證據：trace attachment pass；disabled/missing 狀態 pass；quick compute gate pass；encoding touched pass。
- 後續銜接：`HARN-PILOT-0002` 可在 tooling-code pilot 中同時驗證 turn artifact、handoff diff 與 trace summary。
