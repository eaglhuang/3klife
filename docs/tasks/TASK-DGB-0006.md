---
id: "TASK-DGB-0006"
title: "Markdown task card adapter"
owner: "ClaudeCode_Haiku"
priority: "P2"
status: "open"
type: "implementation"
phase: "M0"
created: "2026-05-17"
created_by_agent: "codex-gpt-5.5"
related_cards: []
depends:
  - TASK-DGB-0001
notes: "2026-05-17 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無"
---

# TASK-DGB-0006 Markdown task card adapter

## 摘要
- 建立 Markdown task card ↔ JSON WorkItem 雙向 adapter，支援 frontmatter 映射與 notes 協作欄位轉換。

## 驗證條件
- Task card frontmatter 能正確映射到 WorkItem 欄位 / notes 事件日誌能正向反向轉換

## 交付物
- markdown-task-adapter.js / frontmatter-mapping.json / notes-protocol-converter.js

## 相關聯任務卡
- 無

## 備註
- 2026-05-17 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無
