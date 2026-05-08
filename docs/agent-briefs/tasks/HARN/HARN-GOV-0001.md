---
doc_id: doc_task_0015
id: HARN-GOV-0001
priority: P1
phase: Phase3
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: governance-doc
chain_id: HARN-CHAIN-GOVERNANCE
chain_step: 1/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-HDO-0003
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Harness Capability Boundary Matrix 任務卡 | 阻塞: depends HARN-HDO-0003"
---

# [HARN-GOV-0001] 建立 Harness Capability Boundary Matrix

> **Harness rollout 開卡** — 將 L1 / L2 / L3 邊界從概念寫成正式治理文件
> **定位**：Phase 3 / Governance and rollout 第 1 步
> **前置依賴**：`HARN-HDO-0003` 已讓 artifact 與 handoff 成為正式收工證據

## 問題描述

從學習筆記到目前的 rollout 決策，都反覆提到 boundary design：

- L1 runtime / tool substrate
- L2 repo harness / validation / artifact
- L3 product judgment / human approval

但 repo 內尚未有一份正式矩陣，明確定義每層誰負責、需要什麼 evidence、什麼情況必須人工批准。

## INPUT_CONTRACT

- artifact、handoff validator 已初步落地
- repo 已有 AGENTS、keep.summary、agent-briefs 作為治理入口
- 這張卡以文件與矩陣為主，不直接更改工具邏輯

## OUTPUT_CONTRACT

- [ ] 新增一份 Harness Capability Boundary Matrix 文件
- [ ] 明確列出 L1 runtime、L2 repo harness、L3 product judgment 的責任邊界
- [ ] 每層需標明 evidence 來源與 approval owner
- [ ] 定義哪些決策屬於 deterministic sensor 可自動處理，哪些必須升級人工判斷
- [ ] 文件需可被後續 AGENTS / Readme 更新直接引用

## VALIDATION_CMD

```bash
npm.cmd run check:encoding:touched -- --files docs/harness-capability-boundary-matrix.md
```

## ROLLBACK_HINT

```bash
git checkout docs/harness-capability-boundary-matrix.md
```

## 執行步驟

1. 以邊界與責任為主，不把文件寫成新的大百科全書。
2. 每層都要寫清楚 evidence 與 approval owner，避免只剩抽象描述。
3. 明確區分可由 tool 自動裁決的事項與需要人類仲裁的事項。
4. 文件完成後應能被 AGENTS / keep / agent-briefs 以摘要方式引用。
5. 完成後再由 `HARN-GOV-0002` 將強制規則寫回正式入口。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：HDO-0003 尚未交付；未見 Harness capability boundary matrix 文件。
- 需修改：等 handoff finalize 完成後定義 L1/L2/L3 evidence 與 approval owner。
