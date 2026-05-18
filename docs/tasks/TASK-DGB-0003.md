---
id: "TASK-DGB-0003"
title: "Context Budget policy 配置化"
owner: "ClaudeCode_Haiku"
priority: "P0"
status: "done"
type: "implementation"
phase: "M0"
created: "2026-05-17"
created_by_agent: "codex-gpt-5.5"
started_at: "2026-05-18T09:05:00+08:00"
started_by_agent: "vs-code-gpt-5.4-mini"
completed_at: "2026-05-18T09:08:16.4034478+08:00"
related_cards: []
depends:
  - TASK-DGB-0001
notes: "2026-05-18 | 狀態: done | 驗證: policy loader + check-context-budget JSON output passed | 變更: 新增 context budget policy / loader，讓 check-context-budget 從 policy 讀取 token / image 閾值與策略 | 阻塞: 無"
---

# TASK-DGB-0003 Context Budget policy 配置化

## 摘要
- 把現有 token / artifact / image 節流閾值萃取成 policy 參數，支援 host 調整而不改代碼。

## 驗證條件
- Context budget 所有數值都來自 profile config / policy 可調參不落 hardcode

## 交付物
- context-budget-policy.json / thresholds configuration

## 相關聯任務卡
- 無

## 備註
- 2026-05-18 | 狀態: done | 驗證: policy loader + check-context-budget JSON output passed | 變更: 新增 context budget policy / loader，讓 check-context-budget 從 policy 讀取 token / image 閾值與策略 | 阻塞: 無
