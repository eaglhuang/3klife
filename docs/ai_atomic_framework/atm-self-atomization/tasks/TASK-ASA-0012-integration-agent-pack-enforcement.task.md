---
doc_id: doc_other_1014
task_id: TASK-ASA-0012
title: 更新 integration 與 agent pack enforcement
milestone: M12
status: planned
owner: atm-integration
priority: P0
depends_on: [TASK-ASA-0004]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-ASA-0012 更新 integration 與 agent pack enforcement

## 背景

讓 Codex、Claude、Cursor、Copilot、Gemini 等後續 Agent 都會執行 atomization/readability guard。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- agent pack instruction updates
- integration manifest health check
- entry-only integration resolution plan

## 驗收條件

- 新 Agent 新增 production source 時會被要求跑 atomization-coverage
- 新增 runAtm/runAtmMap 時會被要求跑 atom-callsite-readability
- Codex entry-only 狀態有清楚 graduation 或 exclusion

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
node atm.mjs integration list --json && node atm.mjs validate atomization-coverage --repo . --json
```

## 回滾方式

回復 agent pack instruction 與 integration manifests。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: planned | 驗證: pending | 變更: 建立 ATM 100% 自我原子化任務卡 | 阻塞: none
