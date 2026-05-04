---
doc_id: doc_task_0027
id: HARN-MET-0002
priority: P2
phase: Phase3
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: metrics-aggregation
chain_id: HARN-CHAIN-METRICS
chain_step: 2/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-MET-0001
  - HARN-TRC-0003
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Metrics Accumulator 任務卡 | 阻塞: depends HARN-MET-0001,HARN-TRC-0003"
---

# [HARN-MET-0002] 建立 Harness Metrics Accumulator

> **Harness rollout 開卡** — 把 artifact、handoff、trace 的訊號累積成可比較指標
> **定位**：Phase 3 / Metrics and health 第 2 步
> **前置依賴**：`HARN-MET-0001` history query 與 `HARN-TRC-0003` trace collector 已可用

## 問題描述

有 history query 還不代表有 metrics。需要一支專門的 accumulator 將多輪 artifact 與 trace 聚合成：

- avgContextTokens
- handoff mismatch rate
- gate fail rate
- trace retry count
- artifact coverage

這層的目標是產出 machine-readable metrics summary，供 `harness-health-report.js` 與 pilot adoption 使用。

## INPUT_CONTRACT

- artifact history query 可列出正式 artifact 集合
- trace summary 已可讀取 `toolCount` / `errorCount` / `durationMs` 等欄位
- handoff validator 已能提供 mismatch verdict 或等價欄位

## OUTPUT_CONTRACT

- [ ] 新增 `tools_node/accumulate-harness-metrics.js`
- [ ] 可讀 artifact + trace + handoff verdict 並輸出 metrics JSON
- [ ] 至少統計：`avgContextTokens`、`turnCount`、`handoffMismatchRate`、`traceRetryCount`
- [ ] 支援日期範圍或 workflow 篩選
- [ ] 產出格式可直接被 `HARN-MET-0003` health report 讀取

## VALIDATION_CMD

```bash
node tools_node/accumulate-harness-metrics.js --artifacts artifacts/turn-artifacts --traces artifacts/execution-traces --output scratch/harness-metrics-smoke.json --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/accumulate-harness-metrics.js
git checkout scratch/harness-metrics-smoke.json
```

## 執行步驟

1. 先聚合高訊號指標，不在第一版追求過細的 per-tool 分析。
2. 將 artifact、trace、handoff verdict 的 join key 定清楚，避免不同工件無法對齊。
3. 對缺 trace 或缺 handoff verdict 的樣本要做 missing-data 分類，不直接靜默忽略。
4. 指標名稱要清楚對應 rollout 目標，避免只累積一堆無法解讀的數字。
5. 完成後交由 `HARN-MET-0003` 做 health report integration。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（多重依賴未滿）
- 驗證證據：MET-0001 與 TRC-0003 尚未交付；未見 metrics accumulator。
- 需修改：等 history query 與 trace collector 後建立 accumulator。
