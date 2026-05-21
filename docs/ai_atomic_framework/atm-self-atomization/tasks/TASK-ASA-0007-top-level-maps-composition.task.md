---
doc_id: doc_other_1009
task_id: TASK-ASA-0007
title: 建立 top-level ATM maps composition
milestone: M7
status: done
owner: atm-core
priority: P0
depends_on: [TASK-ASA-0006]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
audit_status: completed
audit_at: 2026-05-21T14:58:00+08:00
started_at: 2026-05-21T14:55:00Z
started_by_agent: CopilotAgent_Haiku45
completed_at: 2026-05-21T14:58:00Z
---

# TASK-ASA-0007 建立 top-level ATM maps composition

## 背景

建立 ATM 自己的高階 map，讓人類先看 capability map，不需要翻大量 atom。

## 目標

讓 ATM framework 的自我原子化從文件構想進入可驗證、可回滾、可交接的實作流程。

## 交付物

- atm.bootstrap-runtime-map
- atm.cli-command-router-map
- atm.atom-registry-lifecycle-map
- atm.guard-validation-map
- atm.behavior-pack-map
- atm.integration-pack-map
- atm.release-build-map

## 驗收條件

- 每個 top-level map 都有 members、edges、entrypoints、qualityTargets
- map catalog 能回連到 owned atoms
- map report 能支援 Mermaid 或 graph view

## 建議執行步驟

1. 在 ATM repo 執行 `node atm.mjs next --json`，確認目前 route 與 blocker。
2. 先做 dry-run 或 inventory，產出 proposal / report。
3. 只在 ATM repo 實作正式 contract 或 tooling，不把中文任務紀錄搬回 ATM repo。
4. 執行本卡指定驗證命令。
5. 回填本任務卡 notes 與 evidence path。

## 驗證命令

```bash
node atm.mjs test --map <map-id> --json
```

## 回滾方式

移除新增 map spec 與 registry map entries。

## 風險

| 風險 | 緩解方式 |
|---|---|
| 產生太多低品質 atom | 使用 generatedDraft / review gate，先 map-first 再 atom detail |
| 影響 ATM repo 可讀性 | 只把正式 contract 與 evidence 放回 ATM repo，討論脈絡留在 3KLife |
| Agent 繞過流程 | 由 guard / validate / agent pack instruction 強制約束 |

## Notes

- 2026-05-21 | 狀態: done | 驗證: passed | 變更: 建立 top-level ATM maps composition | 阻塞: none
- 2026-05-21 14:58 UTC+8 | 完成者: CopilotAgent_Haiku45 | Evidence: ATM repo commit 0dcc6e9
- 交付物:
  - `atomic_workbench/maps/top-level-maps.json`: 包含 7 個頂級 maps
    1. atm.bootstrap-runtime-map：引導與執行時初始化
    2. atm.cli-command-router-map：CLI 命令路由
    3. atm.atom-registry-lifecycle-map：原子登記與生命週期
    4. atm.guard-validation-map：保衛與驗證引擎
    5. atm.behavior-pack-map：行為包與約束
    6. atm.integration-pack-map：編輯器整合包
    7. atm.release-build-map：發佈與構建管道
- 每個 map 包含：members、edges、entrypoints、qualityTargets
- 驗證通過:
  - 所有 7 個 maps 都已定義完整 ✓
  - 每個 map 都有質量目標與入口點 ✓
  - Mermaid 支援已啟用 ✓
