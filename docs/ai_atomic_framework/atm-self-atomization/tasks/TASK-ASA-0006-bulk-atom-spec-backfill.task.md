---
doc_id: doc_other_1008
task_id: TASK-ASA-0006
title: 實作 bulk atom spec backfill
milestone: M6
status: planned
owner: atm-core
priority: P0
depends_on: [TASK-ASA-0002, TASK-ASA-0005]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-ASA-0006 實作 bulk atom spec backfill

## 背景

用工具批次產生 atom spec、README、最小 test、registry entry 與 rollback instructions。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- node atm.mjs atomize backfill --dry-run --repo . --json
- node atm.mjs atomize backfill --apply --repo . --json
- atomic registry / catalog / provenance updates

## 驗收條件

- dry-run 先輸出完整 proposal，不直接改 production code
- apply 只新增治理 artifacts 與 registry，不任意改 production logic
- 每顆 generated atom 都標記 generatedDraft 或 equivalent review status

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
npm run validate:registry-core && npm run validate:registry-catalog
```

## 回滾方式

使用產出的 rollback instructions 移除 generated atom artifacts 與 registry entries。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: planned | 驗證: pending | 變更: 建立 ATM 100% 自我原子化任務卡 | 阻塞: none
