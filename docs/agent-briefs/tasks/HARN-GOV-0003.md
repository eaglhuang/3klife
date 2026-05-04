---
doc_id: doc_task_0017
id: HARN-GOV-0003
priority: P2
phase: Phase3
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T17:06:48.0654784+08:00
started_by_agent: GitHubCopilot
type: template-update
chain_id: HARN-CHAIN-GOVERNANCE
chain_step: 3/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-GOV-0002
notes: "2026-05-04 | 狀態: done | 驗證: task-card-opener dry-run harn-rich ok + encoding ok | 變更: GitHubCopilot 已同步 task-card-opener.js、task-card-opener skill、UI/UCUF task card template 到最新 HARN rich brief 與 Harness evidence 規格 | 阻塞: none"
---

# [HARN-GOV-0003] 更新 Task Card Template 的 Harness 欄位

> **Harness rollout 開卡** — 把 artifact / validation evidence / handoff status 納入任務卡樣板
> **定位**：Phase 3 / Governance and rollout 第 3 步
> **前置依賴**：`HARN-GOV-0002` 已將規則寫回正式入口

## 問題描述

若任務卡模板沒有跟上，之後新卡仍然會缺：

- artifact path
- validation evidence
- handoff diff status
- trace / metrics 相關欄位

這張卡的目的，是把 rollout 中已成熟的證據欄位寫進任務卡模板或 canonical 樣例，讓後續開卡不必再靠口頭提醒。

## INPUT_CONTRACT

- Governance 入口文件已定義新規則
- 現有 HARN rich brief 可作為 canonical 實例
- task-card-opener 與人工模板都需要同一套欄位語意

## OUTPUT_CONTRACT

- [ ] 更新對應 task card template 或 canonical sample
- [ ] 新增 artifact path / handoff diff / validation evidence 欄位說明
- [ ] 若 task-card-opener 有對應模板輸出，也需同步補欄位
- [ ] 文件要說明哪些欄位是必填、哪些是 rollout 後期選填
- [ ] 新模板需與既有 rich brief 風格相容

## VALIDATION_CMD

```bash
npm.cmd run check:encoding:touched -- --files docs/agent-briefs/UI-task-card-template.md docs/agent-briefs/UCUF-task-card-template.md
```

## ROLLBACK_HINT

```bash
git checkout docs/agent-briefs/UI-task-card-template.md
git checkout docs/agent-briefs/UCUF-task-card-template.md
git checkout tools_node/task-card-opener.js
```

## 執行步驟

1. 先決定哪些欄位對所有新卡都成立，哪些只屬於 Harness workflow。
2. 模板說明要清楚標示必填 / 選填，避免後續卡片再長出平行格式。
3. 若 task-card-opener 有輸出欄位需求，模板與 CLI skeleton 必須同步。
4. 以最小欄位擴充為原則，不把模板膨脹成完整規劃書。
5. 完成後交由 pilot adoption 實際驗證這些欄位是否真的夠用。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：達成（前置例外）
- 驗證證據：task-card-opener HARN dry-run 可正常產生 harn-rich；HARN-DEMO-0003 實寫卡 doc_id 已同步。 skill 與 UI/UCUF task templates 已同步。
- 需修改：GOV-0002 仍需在入口文件收斂完整硬規則一致性。
