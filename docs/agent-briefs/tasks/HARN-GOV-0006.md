---
doc_id: doc_task_0223
id: HARN-GOV-0006
priority: P1
phase: M0
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-05T11:42:24+08:00
started_by_agent: GitHubCopilot
completed_at: 2026-05-05T11:55:00+08:00
completed_by_agent: GitHubCopilot
type: implementation
chain_id: HARN-CHAIN-TASK-SCOPE
chain_step: 1/1
sensor_triggered_by: user-request-task-scope-guard
depends: []
notes: "2026-05-05 | 狀態: done | 驗證: compute-gate task-scope/import-boundary PASS；check-task-scope 對 HARN-GOV-0006 PASS with legacy warnings；check-encoding-touched PASS | 變更: 新增 task-scope gate、補強 handoff-diff-core scope 比對、協作規範回寫 --files 與 task-scope 流程 | 阻塞: 舊 lock PROG-2-0002/0003 files[] 仍為空，暫列 advisory warning"
---
# [HARN-GOV-0006] 建立 Task Scope Gate 與任務範圍守衛

> **Harness rollout 開卡** — 把 task card scope 與 lock.files 轉成可執行 gate，避免 Agent 修改未授權檔案或默默擴大範圍。
> **定位**：Phase G+2 / Governance
> **前置依賴**：無

## 問題描述

讓任務卡與 task lock 的檔案範圍成為可計算的開發合約，並在 compute-gate 中自動檢查實際 git 變更是否超出允許範圍。

## INPUT_CONTRACT

- task-lock.js 已支援 --files
- compute-gate import-boundary 已就位
- handoff-diff-core 已可讀 task lock/frontmatter

## OUTPUT_CONTRACT

- [x] 新增 task-scope gate 腳本
- [x] git changed files 可對照 lock.files 驗證
- [x] 協作規範補入 task scope 自我驗證

## HARNESS_EVIDENCE

- `node tools_node/check-task-scope.js --task HARN-GOV-0006 --verbose`：scope coverage 正常；僅剩舊 lock 空 `files[]` warning
- `node tools_node/compute-gate.js --gates task-scope import-boundary --agent-feedback`：PASS
- `node tools_node/check-encoding-touched.js --files ...`：PASS

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates task-scope import-boundary
node tools_node/compute-gate.js --profile standard --agent-feedback
```

## ROLLBACK_HINT

```bash
git checkout tools_node/compute-gate-config.json tools_node/lib/handoff-diff-core.js .github/instructions/agent-collaboration.instructions.md docs/agent-collaboration-protocol.md
```

## 執行步驟

1. 建立任務卡與 scope 鎖定
2. 實作 task-scope gate 與共用 helper
3. 把 gate 掛進 compute-gate 與協作規範
4. 跑 focused validation 與標準閘門

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-05*
