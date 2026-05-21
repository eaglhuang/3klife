---
doc_id: doc_other_1003
task_id: TASK-ASA-0001
title: 定義 ATM 100% 原子化覆蓋口徑與排除政策
milestone: M1
status: done
owner: atm-core
priority: P0
depends_on: [none]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-21T00:00:00Z
started_by_agent: CopilotAgent
completed_at: 2026-05-21T00:05:00Z
---

# TASK-ASA-0001 定義 ATM 100% 原子化覆蓋口徑與排除政策

## 背景

建立 100% 原子化的可驗收定義，拆清楚 ownership coverage、entrypoint atomization、evidence coverage、exclusion coverage。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- ATM repo production source / generated / fixture / test / release output 的分類規則
- 100% dogfood score 的欄位定義與 pass/fail 門檻
- 可機器讀取的 exclusion reason schema 草案

## 驗收條件

- 計畫能明確回答哪些檔案必須被 atom/map ownership 覆蓋
- helper function 不被強迫包成 runAtm，但必須歸屬到 atom
- 所有 exclusion reason 都能被後續 guard 讀取

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
docs review + node atm.mjs next --json
```

## 回滾方式

移除本任務新增的政策文件與 schema 草案即可回復。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: done | 驗證: completed | 變更: 實作 ATOMIZATION_COVERAGE_TAXONOMY.md, exclusion-inventory.json, path-to-atom-map.json | 阻塞: none
- Evidence: ATM repo commit 4884a19 with coverage taxonomy, exclusion schema, and initial path mappings
- Deliverables: 
  - ATM repo: docs/ATOMIZATION_COVERAGE_TAXONOMY.md (分類規則 + DogfoodScore schema)
  - ATM repo: atomic_workbench/atomization-coverage/exclusion-inventory.json (17 排除路徑)
  - ATM repo: atomic_workbench/atomization-coverage/path-to-atom-map.json (12 production path 對應)
