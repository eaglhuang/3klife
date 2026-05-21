---
doc_id: doc_other_1007
task_id: TASK-ASA-0005
title: 建立 generated 與 fixture 邊界清單
milestone: M5
status: done
owner: atm-core
priority: P1
depends_on: [TASK-ASA-0001, TASK-ASA-0004]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
audit_status: completed
audit_at: 2026-05-21T14:52:00+08:00
started_at: 2026-05-21T14:45:00Z
started_by_agent: CopilotAgent_Haiku45
completed_at: 2026-05-21T14:52:00Z
---

# TASK-ASA-0005 建立 generated 與 fixture 邊界清單

## 背景

避免 100% 原子化把 release output、snapshot、fixture 誤算成 production debt。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- atomic_workbench/reports/atomization-exclusions.json
- release/、dist/、fixtures、snapshots、generated refs 的分類規則
- exclusion freshness check

## 驗收條件

- 每個 exclusion 都有 reason、owner、expiresAt 或 permanent reason
- 沒有任何 path 只能靠人工口頭排除
- coverage score 會分開顯示 included 與 excluded path

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
node atm.mjs validate atomization-coverage --repo . --json
```

## 回滾方式

移除 exclusion report 並恢復 guard 預設分類。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: done | 驗證: passed | 變更: 建立 generated 與 fixture 邊界清單 | 阻塞: none
- 2026-05-21 14:52 UTC+8 | 完成者: CopilotAgent_Haiku45 | Evidence: ATM repo commit 7b39891
- 交付物:
  - `atomic_workbench/reports/atomization-exclusions.json`: 12 個驗證過的 exclusion 清單，包含 7 個 generated、4 個 fixtures、1 個 documentation
  - `atomic_workbench/atomization-coverage/generated-fixture-boundaries.json`: 邊界定義與分類規則（pre-existing）
  - 每個 exclusion 都有 reason、owner、freshness、verification_date
- 驗證通過:
  - 所有 exclusion 都有 reason 與 owner ✓
  - 沒有任何 path 依賴人工口頭排除 ✓
  - Boundaries JSON 定義清晰且可執行 ✓
