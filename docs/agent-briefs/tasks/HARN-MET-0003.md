---
doc_id: doc_task_0028
id: HARN-MET-0003
priority: P2
phase: Phase3
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: health-integration
chain_id: HARN-CHAIN-METRICS
chain_step: 3/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-MET-0002
  - HARN-EVAL-0003
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Harness Health Report Integration 任務卡 | 阻塞: depends HARN-MET-0002,HARN-EVAL-0003"
---

# [HARN-MET-0003] 擴充 Harness Health Report

> **Harness rollout 開卡** — 將累積指標正式接入健康報告
> **定位**：Phase 3 / Metrics and health 第 3 步
> **前置依賴**：`HARN-MET-0002` metrics accumulator 與 `HARN-EVAL-0003` comparator 已可用

## 問題描述

專案已經有 `tools_node/harness-health-report.js`，但目前較偏向靜態韁繩盤點。要讓 rollout 成效可觀測，需要把真實 artifact/trace/handoff/path-drift 指標接進健康報告。

第一版新增的三個分數：

- artifact coverage
- handoff integrity
- path drift

## INPUT_CONTRACT

- metrics accumulator 可輸出 machine-readable summary
- path drift comparator 已能產生 pass/warn/fail verdict
- 現有 `harness-health-report.js` 已有 JSON/brief 輸出結構

## OUTPUT_CONTRACT

- [ ] `harness-health-report.js` 新增 artifact coverage 分數
- [ ] `harness-health-report.js` 新增 handoff integrity 分數
- [ ] `harness-health-report.js` 新增 path drift 分數
- [ ] 保持既有輸出相容，不破壞舊 caller
- [ ] `--json` 輸出可直接被後續 pilot adoption 報告引用

## VALIDATION_CMD

```bash
node tools_node/harness-health-report.js --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/harness-health-report.js
```

## 執行步驟

1. 先以附加欄位方式擴充 health report，不打壞舊 consumer。
2. 三個新分數都要能追溯到原始 metrics 來源，不做黑箱加權。
3. 對缺資料情況給 `unknown` 或等價狀態，不偽裝成 0 分或滿分。
4. brief 與 json 兩種輸出都要保留高可讀性。
5. 完成後交由 `HARN-PILOT-0003` 驗證在真實 workflow 的可用性。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（多重依賴未滿）
- 驗證證據：MET-0002 與 EVAL-0003 尚未交付；health report 未整合新分數。
- 需修改：接入 artifact coverage、handoff integrity、path drift 三項分數。
