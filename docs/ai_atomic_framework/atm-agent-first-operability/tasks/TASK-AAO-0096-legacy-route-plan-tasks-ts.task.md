---
doc_id: doc_other_1429
id: "TASK-AAO-0096"
title: "LegacyRoutePlan for tasks.ts — 工具實戰 + 校驗"
owner: "GitHubCopilot"
priority: "P1"
status: "open"
type: "implementation"
phase: "M0"
created: "2026-05-30"
created_by_agent: "GitHubCopilot"
related_cards: []
depends: []
notes: "2026-05-30 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無"
---

# TASK-AAO-0096 LegacyRoutePlan for tasks.ts — 工具實戰 + 校驗

## 摘要
跑 atm start --legacy-flow 對 tasks.ts (5305 行) 產出 LegacyRoutePlan JSON，作為後續 wave 3-B/C/D 的共用 plan。同時拿 0095 已切的 parse-options 對照 plan 建議，驗證工具判斷準確性。

雙重價值：
1. Plan 產出：後續 wave 卡引用，省每卡 1 次「哪些函數安全可移」調研
2. Dogfood ATM guidance pipeline：證明 ATM 能分析自己

## 驗證條件
- node atm.mjs hook pre-commit --json → ok:true
- npm run typecheck（保險）
- node atm.mjs atomize score → score ≥ 95（不退步）
- plan JSON 檔 valid + 非空
- cross-check.md 6 段齊備

## 交付物
- .atm/history/guidance/TASK-AAO-0096-legacy-route-plan.json
- .atm/history/guidance/TASK-AAO-0096-cross-check.md

## 相關聯任務卡
- depends_on=[TASK-AAO-0095]

## 備註
- 2026-05-30 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無

