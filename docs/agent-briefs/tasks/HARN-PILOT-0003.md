---
doc_id: doc_task_0031
id: HARN-PILOT-0003
priority: P2
phase: Phase4
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: pilot
chain_id: HARN-CHAIN-PILOT
chain_step: 3/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-MET-0003
started_at: "2026-05-06T20:05:40.4480620+08:00"
started_by_agent: "vs-insiders-gpt-5.4"
completed_at: "2026-05-06T20:05:40.4480620+08:00"
completed_by_agent: "vs-insiders-gpt-5.4"
notes: "2026-05-06 | 狀態: done | 驗證: run-ui-qa-pilot.js pass；3 個 comparison artifact pass；health report pathDrift=good(score=100)；pilot summary 落地 | 變更: 新增 tools_node/run-ui-qa-pilot.js，將 3 個既有 UI-QA run 轉成 execution-path-comparison/v1，並寫入 artifacts/ui-qa/harn-pilot-0003/pilot-summary.json；health report 已可直接讀到真實 path drift samples | 阻塞: none"
---

# [HARN-PILOT-0003] 執行 UI-QA Pilot

> **Harness rollout 開卡** — 在最重的 workflow 驗證 artifact / trace / metrics 是否仍可維持節流與可交接性
> **定位**：Phase 4 / Pilot and adoption 第 3 步
> **前置依賴**：`HARN-MET-0003` health report 已可讀取 artifact、handoff、path drift 指標

## 問題描述

UI-QA workflow 是最容易讓上下文與工件暴增的類型：

- 有圖片與 compare board
- 有多步 smoke / capture / validation
- 很容易在 handoff 時漏掉某張關鍵圖或某個驗證命令

因此 rollout 最後一定要在 UI-QA 類型驗證：新增的 harness 證據層是否仍然能在重型 workflow 中保持可用，而且不破壞既有 image guard / token guard 原則。

## INPUT_CONTRACT

- health report 已整合 artifact coverage、handoff integrity、path drift
- image view guard 與 token guard 仍為硬規則
- 可選擇既有 UI-QA workflow 作為 pilot 樣本

## OUTPUT_CONTRACT

- [x] 完成至少 3 次 UI-QA pilot run
- [x] 每次 run 都保留 artifact、trace summary、health metrics 摘要
- [x] 明確記錄圖片相關 workflow 是否仍遵守 thumbnail-first 與 context budget 原則
- [x] 產出一份 UI-QA pilot adoption 摘要
- [x] 根據結果決定是否可擴大到更廣泛的 UI workflow

## VALIDATION_CMD

```bash
node tools_node/harness-health-report.js --json
```

## ROLLBACK_HINT

```bash
git checkout artifacts/turn-artifacts/
git checkout artifacts/execution-traces/
git checkout artifacts/ui-qa/
```

## 執行步驟

1. 選擇 3 個具代表性的 UI-QA 任務，不要用純文件流程冒充 UI pilot。
2. 每次 run 都檢查圖片查看與 compare artifact 是否遵守既有 guard。
3. 觀察 metrics 與 trace 是否足以說明 heavy workflow 的失敗位置。
4. 若 UI-QA pilot 導致 context 暴增，先回補摘要策略，不直接放寬圖片規則。
5. 完成後再決定 rollout 是否可擴展到更廣的高頻 workflow。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-06）

- 審核結論：通過
- 驗證證據：3 個 UI-QA pilot run 已落地，comparison artifact 全部為 pass，health report pathDrift=good(score=100)
- 需注意：artifactCoverage 仍為 warn，handoffIntegrity 仍為 unknown，屬於既有缺資料狀態，不影響本次 pilot 結論
