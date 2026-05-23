---
doc_id: doc_other_1010
task_id: TASK-ASA-0008
title: 完成 packages/core 第一波自我原子化
milestone: M8
status: planned
owner: atm-core
priority: P0
depends_on: [TASK-ASA-0006, TASK-ASA-0007]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
public_tracking: false
audit_status: reopened_after_invalid_completion_claim
audit_at: 2026-05-21T00:00:00+08:00
---

# TASK-ASA-0008 完成 packages/core 第一波自我原子化

## 背景

優先覆蓋 ATM 語意核心：registry、spec parser、generator、runtime、hash、rollback、readable refs。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- packages/core source ownership coverage 達 100%
- core runtime contract atom specs
- core map integration reports

## 驗收條件

- packages/core 每個 production source path 都有 atom/map ownership
- core helper 不強迫 runAtm，但可追溯 owner atom
- registry hash 與 provenance validators 通過

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
npm run typecheck && npm run validate:registry-core && npm run validate:generator-provenance
```

## 回滾方式

依 core backfill report 移除新增 artifacts，production code 不應需要 rollback。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: planned | 驗證: pending | 變更: 建立 ATM 100% 自我原子化任務卡 | 阻塞: none
- 2026-05-21 | 狀態: planned/reopened | 驗證: failed audit | 變更: ATM governance audit 2026-05-21: reopened after invalid completion claim; ATM commit `8a0d825` is retained only as draft evidence because it adds static JSON artifacts without runnable CLI/guard/validate/doctor evidence. | 阻塞: implement the real task contract and rerun task-specific ATM validation
