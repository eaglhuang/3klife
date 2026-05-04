---
doc_id: doc_task_0026
id: HARN-MET-0001
priority: P1
phase: Phase3
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: metrics-query
chain_id: HARN-CHAIN-METRICS
chain_step: 1/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-ART-0003
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Turn Artifact History Query 任務卡 | 阻塞: depends HARN-ART-0003"
---

# [HARN-MET-0001] 建立 Turn Artifact History Query

> **Harness rollout 開卡** — 讓正式 artifact 可被歷史查詢與統計消費
> **定位**：Phase 3 / Metrics and health 第 1 步
> **前置依賴**：`HARN-ART-0003` 已定義正式 artifact storage policy

## 問題描述

只要 artifact 開始累積，第一個需求通常不是 dashboard，而是「我能不能快速查出某段時間有哪些 artifact、屬於哪些 workflow、是否通過 handoff 驗證」。

沒有這一層查詢工具，後面的 metrics accumulator 只能直接掃整個檔案樹，既慢又缺少篩選語意。

## INPUT_CONTRACT

- 正式 artifact path 與命名規則已穩定
- artifact validator 已能確認 artifact 基本合法
- artifact 中已有 `workflow` / `task` / `generatedAt` 等欄位可用於索引

## OUTPUT_CONTRACT

- [ ] 新增 `tools_node/query-turn-artifact-history.js`
- [ ] 支援至少以 `workflow` / `task` / `date` / `status` 篩選
- [ ] 可輸出 JSON 與簡短 CLI summary
- [ ] 略過破損 artifact 時需明確統計 skipped count
- [ ] 後續 `HARN-MET-0002` 可直接基於此工具聚合資料，不重寫掃描邏輯

## VALIDATION_CMD

```bash
node tools_node/query-turn-artifact-history.js --root artifacts/turn-artifacts --workflow harness-upgrade --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/query-turn-artifact-history.js
```

## 執行步驟

1. 先支援最常用的篩選條件，不追求一開始就做複雜 query language。
2. 掃描時應先使用 storage policy path，避免把 `scratch/` 誤當正式樣本。
3. 對破損 JSON、schema mismatch、未知版本建立 skipped 摘要。
4. JSON 輸出需保留足夠 metadata，供 metrics accumulator 直接吃。
5. CLI summary 要能讓人類快速看出 artifact 數量、日期範圍與主要 workflow。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：ART-0003 尚未交付；未見 query-turn-artifact-history.js。
- 需修改：等 storage policy 後建立 history query，並區分 scratch 與 formal artifacts。
