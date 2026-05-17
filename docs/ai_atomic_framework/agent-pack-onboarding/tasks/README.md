---
doc_id: doc_index_0020
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# Agent Pack Onboarding Task Cards

本目錄收錄「ATM Agent Pack / Onboarding 計畫書」的內部任務卡（TASK-APO-0000 ~ TASK-APO-0010）。這批卡屬於 3KLife 對 AI-Atomic-Framework upstream 改造的工作台，不放入 ATM repo，避免污染 ATM 未來開源時的核心文件面。

任務卡 = 一張可獨立認領、可獨立驗收的工作單。每張卡都對應計畫書 §15 的里程碑 checklist，並以目前已收斂的 `ATMChart` / `atm-chart` 命名為準。

## 索引

| Task ID | 標題 | 里程碑 | 狀態 | 阻擋者 |
|---|---|---|---|---|
| [TASK-APO-0000](./TASK-APO-0000-doc-finalize.task.md) | 文件定稿與 cross-link | M1 | done | — |
| [TASK-APO-0001](./TASK-APO-0001-architecture-readme-crosslink.task.md) | 對齊 ATM ARCHITECTURE / README cross-link | M1 | done | 0000 |
| [TASK-APO-0002](./TASK-APO-0002-agent-pack-sdk-manifest.task.md) | Agent Pack SDK 介面 + manifest schema | M2 | done | 0000 |
| [TASK-APO-0003](./TASK-APO-0003-claude-code-pack-mvp.task.md) | Claude Code Pack MVP | M2 | done | 0002 |
| [TASK-APO-0004](./TASK-APO-0004-atmchart-render-pipeline.task.md) | Rule Render / ATMChart Pipeline | M3 | open | 0002 |
| [TASK-APO-0005](./TASK-APO-0005-rule-justification-gate.task.md) | Rule Justification Gate | M4 | open | 0004 |
| [TASK-APO-0006](./TASK-APO-0006-multi-agent-pack-expansion.task.md) | Multi-Agent Pack 擴張 | M5 | open | 0003 |
| [TASK-APO-0007](./TASK-APO-0007-npm-create-atm.task.md) | npm publish + create-atm | M6 | open | 0003 / 0004 |
| [TASK-APO-0008](./TASK-APO-0008-atm-welcome-entry.task.md) | atm welcome 一鍵入口 | M7 | open | 0003 / 0004 |
| [TASK-APO-0009](./TASK-APO-0009-next-action-hint-mrp.task.md) | Slash Command nextActionHint 對接 MRP | M8 | open | 0003 / TASK-MRP-0009 |
| [TASK-APO-0010](./TASK-APO-0010-agent-matrix-generator.task.md) | 多 agent 矩陣自動生成 | M5 | open | 0006 |

## 共通驗收

- 任務卡進入 `done` 前，需提交對應 validation command 與證據摘要。
- 任務卡只能修改自身宣告的檔案；跨卡共修需在 `notes` 註明並建立 lineage 連結。
- Agent-specific 邏輯不得下沉到 `packages/core/`；只能存在於 Agent Operating Layer、Integration Adapter Layer、templates 或 CLI facade。
- 裸 CLI 路徑必須永遠有效：沒有 agent pack、沒有 slash command 時，仍要能用 `node atm.mjs next --json` 完成治理流程。