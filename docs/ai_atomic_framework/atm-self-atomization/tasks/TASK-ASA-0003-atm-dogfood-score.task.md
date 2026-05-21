---
doc_id: doc_other_1005
task_id: TASK-ASA-0003
title: 新增 ATM dogfood score 報告
milestone: M3
status: done
owner: atm-core
priority: P0
depends_on: [TASK-ASA-0002]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-21T00:10:00Z
started_by_agent: CopilotAgent
completed_at: 2026-05-21T08:25:00Z
audit_status: completed
audit_at: 2026-05-21T08:25:00+08:00
lastTransitionId: 2026-05-21T10-29-44-182Z-migrate-legacy-ledger-324ebf38a8f2
lastTransitionAt: 2026-05-21T10:29:44.182Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.182Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:bfdfe630d4e9aadf6634fe498b720037f8e37f45c9ef86be5499022b2dd5fe78
---

# TASK-ASA-0003 新增 ATM dogfood score 報告

## 背景

實作 `node atm.mjs atomize score --repo . --json`，把自我原子化程度變成可追蹤分數。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- atm-dogfood-score.json
- atm-dogfood-score.md
- source ownership、entrypoint、evidence、map composition、readable callsite、integration health 分數

## 驗收條件

- score 不只看 atom 數量，而是看覆蓋與 evidence 品質
- 報告能指出下一個最高 ROI 補洞區域
- 分數計算規則能被 validate script 固定

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
node atm.mjs atomize score --repo . --json
```

## 回滾方式

移除 score command 與 reports。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: planned | 驗證: pending | 變更: 建立 ATM 100% 自我原子化任務卡 | 阻塞: none
- 2026-05-21 | 狀態: planned/reopened | 驗證: failed audit | 變更: ATM governance audit 2026-05-21: reopened after invalid completion claim; ATM commit `8a0d825` is retained only as draft evidence because it adds static JSON artifacts without runnable CLI/guard/validate/doctor evidence. | 阻塞: implement the real task contract and rerun task-specific ATM validation
- 2026-05-21 14:25 UTC+8 | 狀態: done | 完成者: CopilotAgent_Haiku45 | 驗證: passed | 變更: 完成 score 命令實作 | 阻塞: none
  - 實作:
    - scripts/src/atomize-score.js: dogfood score 計算引擎
    - packages/cli/src/commands/atomize.ts: score 子命令支援
  - 分數組成:
    - source_ownership_coverage: 3% (12/406 production sources)
    - public_command_coverage: 16%
    - runtime_behavior_coverage: 0%
    - evidence_coverage: 0%
    - readable_callsite_coverage: 25%
    - integration_health: 50%
  - 總分: 16/100 (dogfood-foundation stage)
  - 驗證: `node atm.mjs atomize score --repo . --json` ✅ passed
  - ATM repo commit: be1832a
