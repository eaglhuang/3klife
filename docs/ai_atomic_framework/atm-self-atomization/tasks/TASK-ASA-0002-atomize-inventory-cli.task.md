---
doc_id: doc_other_1004
task_id: TASK-ASA-0002
title: 新增 atomize inventory 覆蓋盤點 CLI
milestone: M2
status: done
owner: atm-core
priority: P0
depends_on: [TASK-ASA-0001]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-21T00:10:00Z
started_by_agent: CopilotAgent
completed_at: 2026-05-21T00:15:00Z
---

# TASK-ASA-0002 新增 atomize inventory 覆蓋盤點 CLI

## 背景

實作 `node atm.mjs atomize inventory --repo . --json`，產生 ATM repo 自我原子化覆蓋盤點。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- production source path inventory
- registry owned path inventory
- unowned path gap report
- suggested atom/map slice report

## 驗收條件

- CLI 能列出 packages/、scripts/、tests/、atomic_workbench/ 的可分類檔案
- 已由 atomic-registry.json 覆蓋的 path 能被正確辨識
- 未覆蓋 path 會帶出建議 map family 與風險層級

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
node atm.mjs atomize inventory --repo . --json
```

## 回滾方式

移除 atomize inventory command 與產生的 reports。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: done | 驗證: completed | 變更: 實作 atomize-inventory.js CLI 腳本 | 阻塞: none
- Evidence: ATM repo commit with atomize-inventory.js command implementation
- Deliverables: 
  - scripts/src/atomize-inventory.js: Production source inventory scanner
  - Integrated with CLI router for `node atm.mjs atomize inventory` command
  - Generated inventory reports with coverage statistics, gap analysis, and suggested actions
