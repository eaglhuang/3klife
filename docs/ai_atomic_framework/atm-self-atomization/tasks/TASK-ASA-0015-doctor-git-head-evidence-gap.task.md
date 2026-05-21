---
doc_id: doc_other_1017
task_id: TASK-ASA-0015
title: 關閉 doctor Git HEAD evidence gap
milestone: M15
status: planned
owner: atm-governance
priority: P1
depends_on: [TASK-ASA-0010, TASK-ASA-0012]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-ASA-0015 關閉 doctor Git HEAD evidence gap

## 背景

讓 ATM 自己的 latest Git HEAD 也有 ATM evidence，不再只是工具可用但自我證據不足。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- Git HEAD evidence attachment policy
- doctor evidence check repair
- release readiness evidence bundle

## 驗收條件

- node atm.mjs doctor --json 不再回報 latest Git HEAD missing ATM evidence
- commit-level evidence 可追到 atom/map/test report
- 缺 evidence 時 doctor 提供明確 next action

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
node atm.mjs doctor --json
```

## 回滾方式

回復 doctor evidence policy 與相關 reports。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: planned | 驗證: pending | 變更: 建立 ATM 100% 自我原子化任務卡 | 阻塞: none
