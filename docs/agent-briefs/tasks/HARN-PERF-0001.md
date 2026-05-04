---
doc_id: doc_task_0220
id: HARN-PERF-0001
priority: P2
phase: M0
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: Antigravity
status: open
type: implementation
chain_id: HARN-CHAIN-PERF
chain_step: 1/2
sensor_triggered_by: harness-engineering-gap-audit
depends: []
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生 HARN rich brief | 阻塞: none"
---
# [HARN-PERF-0001] 建立自動化效能基準線偵測閘門

> **Harness rollout 開卡** — 上一批 Harness 架構治理完成後，模組邊界歸零但尚未建立效能基準線自動偵測。任何後續渲染迴圈或 GC 壓力問題需要有客觀數據門檻才能攔截。
> **定位**：Phase G+1 / Performance
> **前置依賴**：無

## 問題描述

待補：說明這張卡要修正或補齊的核心問題。

## INPUT_CONTRACT

- compute-gate.js 已就位
- import-boundary gate 通過
- UCUFLogger 遷移完成

## OUTPUT_CONTRACT

- [ ] 新增 performance gate
- [ ] 定義 FPS 與 GC 閾值 JSON
- [ ] 整合至 compute-gate --gates performance

## HARNESS_EVIDENCE

- handoff diff status：pending

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates performance
```

## ROLLBACK_HINT

```bash
git checkout tools_node/compute-gate.js
```

## 執行步驟

1. 研究現有 BattleScene profile 數據
2. 定義基準閾值 JSON (fps_min
3. gc_budget_ms)
4. 實作 performance gate 邏輯於 compute-gate.js
5. 整合至 CI 流程
6. 驗證 pass/fail 輸出

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-04*
