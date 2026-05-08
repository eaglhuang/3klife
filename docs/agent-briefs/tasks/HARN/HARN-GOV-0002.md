---
doc_id: doc_task_0016
id: HARN-GOV-0002
priority: P1
phase: Phase3
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: governance-rollout
chain_id: HARN-CHAIN-GOVERNANCE
chain_step: 2/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-GOV-0001
  - HARN-ART-0004
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Agent Collaboration Rule Update 任務卡 | 阻塞: depends HARN-GOV-0001,HARN-ART-0004"
---

# [HARN-GOV-0002] 更新 Agent Collaboration 強制規則入口

> **Harness rollout 開卡** — 將 artifact / handoff 必守規則寫回真正的入口文件
> **定位**：Phase 3 / Governance and rollout 第 2 步
> **前置依賴**：`HARN-GOV-0001` boundary matrix 與 `HARN-ART-0004` artifact 預設路徑已穩定

## 問題描述

治理規則如果只留在 rollout 任務卡內，下一位 Agent 很快就會看不到。真正要生效的規則必須寫回：

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `docs/agent-briefs/Readme.md`
- 必要時補到 `docs/keep.summary.md`

這張卡的目標是把「哪些 workflow 必須產 artifact、何時 handoff validator 是 warning、何時是 blocker」寫成正式共識入口。

## INPUT_CONTRACT

- capability boundary matrix 已明確列出 owner 與 evidence
- finalize 已可支援 artifact 預設路徑與 handoff validator
- 強制規則只應放在真正的入口，不散落在次級文件

## OUTPUT_CONTRACT

- [ ] 更新 `AGENTS.md` 的 Harness rollout 強制規則
- [ ] 更新 `.github/copilot-instructions.md` 的必要操作入口
- [ ] 更新 `docs/agent-briefs/Readme.md` 的 artifact/handoff 流程
- [ ] 視需要補一條 `keep.summary.md` 摘要規則
- [ ] 明確區分 warning-only 與 block-on-fail 的情境

## VALIDATION_CMD

```bash
npm.cmd run check:encoding:touched -- --files AGENTS.md .github/copilot-instructions.md docs/agent-briefs/Readme.md docs/keep.summary.md
```

## ROLLBACK_HINT

```bash
git checkout AGENTS.md
git checkout .github/copilot-instructions.md
git checkout docs/agent-briefs/Readme.md
git checkout docs/keep.summary.md
```

## 執行步驟

1. 先決定哪些規則屬於入口硬規則，哪些只放治理文件摘要。
2. 不在每個文件重述整套背景，只放最小可執行規則與指令。
3. 明確寫出 artifact/handoff 的阻擋條件與例外情境。
4. 保持語言簡潔，避免入口文件變成新一份長篇規劃書。
5. 完成後再由 `HARN-GOV-0003` 把新欄位回寫到 task card 模板。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿，部分前置已先行）
- 驗證證據：boundary matrix 與 artifact defaults 尚未完成；但 GOV-0003 已先補 task-card-opener/template 規則。
- 需修改：等 GOV-0001 與 ART-0004 完成後回寫 AGENTS、copilot instructions、Readme、keep.summary 的硬規則入口。
