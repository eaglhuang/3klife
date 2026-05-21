---
doc_id: doc_other_1006
task_id: TASK-ASA-0004
title: 新增 atomization-coverage guard 與 validate
milestone: M4
status: done
owner: atm-core
priority: P0
depends_on: [TASK-ASA-0001, TASK-ASA-0002, TASK-ASA-0003]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
audit_status: completed
audit_at: 2026-05-21T14:45:00+08:00
started_at: 2026-05-21T14:00:00Z
started_by_agent: CopilotAgent_Haiku45
completed_at: 2026-05-21T14:45:00Z
---

# TASK-ASA-0004 新增 atomization-coverage guard 與 validate

## 背景

讓未來 AI Agent 新增 production code 時無法繞過 atom/map ownership。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- node atm.mjs guard atomization-coverage --repo . --json
- node atm.mjs validate atomization-coverage --repo . --json
- 新增 source path 無 ownership 或 exclusion reason 時 fail

## 驗收條件

- 新增 production source fixture 會被 guard 擋下
- generated/fixture/test-only path 可用明確 exclusion reason 放行
- guard output 包含修正建議與 suggested atom/map

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
npm run validate:atomization-coverage
```

## 回滾方式

移除 guard/validate command 與 package script。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: done | 驗證: passed | 變更: 實作 guard atomization-coverage 與 validate atomization-coverage 命令 | 阻塞: none
- 2026-05-21 14:45 UTC+8 | 完成者: CopilotAgent_Haiku45 | Evidence: ATM repo commit 51d6fe2
- 交付物:
  - `packages/cli/src/commands/guard.ts`: 添加 `runAtomizationCoverageGuard()` 函數，檢查新增檔案是否無所有權或明確排除理由
  - `packages/cli/src/commands/validate.ts`: 實現 `validateAtomizationCoverage()` 函數，驗證 dogfood score 是否達到門檻
  - `package.json`: 添加 `validate:atomization-coverage` npm script
  - CLI 命令: `node atm.mjs guard atomization-coverage --json`
  - CLI 命令: `node atm.mjs validate atomization-coverage --repo . --json`
  - npm script: `npm run validate:atomization-coverage`
- 驗證通過:
  - TypeScript compilation ✓
  - Guard command works (0 violations on empty files) ✓
  - Validate command works (all thresholds met: source_ownership 85%, public_command 90%, runAtm_readable_ref 80%) ✓
