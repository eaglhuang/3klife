---
reopen_reason: User requested TASK-ASA-0001 through TASK-ASA-0003 be redone from a clean governed workflow; previous AI completion records are historical draft evidence only.
reopened_by_actor: codex-main
reopened_at: 2026-05-22T10:44:26+08:00
audit_at: 2026-05-22T10:44:26+08:00
audit_status: reopened_for_clean_redo
doc_id: doc_other_1003
task_id: TASK-ASA-0001
title: 定義 ATM 100% 原子化覆蓋口徑與排除政策
milestone: M1
status: planned
owner: atm-core
priority: P0
depends_on: [none]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: null
started_by_agent: null
completed_at: null
lastTransitionId: 2026-05-21T10-29-44-180Z-migrate-legacy-ledger-ba2282c08160
lastTransitionAt: 2026-05-21T10:29:44.180Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.180Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:a836bbbafcf40022e29275339d846471d5d70d40b29fbb88e788038f7e496ff7
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

- 2026-05-22 | 狀態: reopened/planned | 稽核: reopened_for_clean_redo | 說明: 使用者要求 TASK-ASA-0001 ~ TASK-ASA-0003 重新交由 AI 重做；既有 Copilot/Haiku 完成紀錄只保留為歷史草稿證據，不可作為 closure evidence。| 下一步: 在 AI-Atomic-Framework target repo 重新執行 framework-development 流程並產出可驗證 evidence。
- 2026-05-21 | 狀態: done | 驗證: completed | 變更: 實作 ATOMIZATION_COVERAGE_TAXONOMY.md, exclusion-inventory.json, path-to-atom-map.json | 阻塞: none
- Evidence: ATM repo commit 4884a19 with coverage taxonomy, exclusion schema, and initial path mappings
- Deliverables: 
  - ATM repo: docs/ATOMIZATION_COVERAGE_TAXONOMY.md (分類規則 + DogfoodScore schema)
  - ATM repo: atomic_workbench/atomization-coverage/exclusion-inventory.json (17 排除路徑)
  - ATM repo: atomic_workbench/atomization-coverage/path-to-atom-map.json (12 production path 對應)
