---
doc_id: doc_task_0222
id: HARN-GOV-0005
priority: P2
phase: M0
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: Antigravity
status: open
type: implementation
chain_id: HARN-CHAIN-GOV
chain_step: 5/5
sensor_triggered_by: harness-engineering-gap-audit
depends: []
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生 HARN rich brief | 阻塞: none"
---
# [HARN-GOV-0005] 強制 Agent 開發合約：所有代碼變動必須通過 compute-gate

> **Harness rollout 開卡** — 目前 compute-gate 雖已就位但尚未寫入正式開發合約（agent-collaboration.instructions.md）中。若無強制要求，後進 Agent 可能略過閘門直接提交，導致邊界治理的成果無法持續維持。
> **定位**：Phase G+1 / Governance
> **前置依賴**：無

## 問題描述

待補：說明這張卡要修正或補齊的核心問題。

## INPUT_CONTRACT

- compute-gate.js 已就位並通過
- agent-collaboration.instructions.md 已存在

## OUTPUT_CONTRACT

- [ ] agent-collaboration.instructions.md 新增強制 compute-gate 條目
- [ ] pre-flight checklist 明確要求執行 --gates import-boundary
- [ ] 更新 keep-status.md 記錄此合約生效

## HARNESS_EVIDENCE

- handoff diff status：pending

## VALIDATION_CMD

```bash
grep -r 'compute-gate' .github/instructions/agent-collaboration.instructions.md
```

## ROLLBACK_HINT

```bash
git checkout .github/instructions/agent-collaboration.instructions.md
```

## 執行步驟

1. 讀取現有 agent-collaboration.instructions.md 規則
2. 在 Pre-flight 區塊新增 compute-gate 強制規則
3. 補充違規處置說明（禁止 merge 直到 gate pass）
4. 更新 keep-status.md 的治理章節
5. 通知現有 Agent 合約已更新

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-04*
