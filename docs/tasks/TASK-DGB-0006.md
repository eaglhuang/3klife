---
id: "TASK-DGB-0006"
title: "Markdown task card adapter"
owner: "ClaudeCode_Haiku"
priority: "P2"
status: "done"
type: "implementation"
phase: "M0"
created: "2026-05-17"
created_by_agent: "codex-gpt-5.5"
started_at: "2026-05-18T09:20:00+08:00"
started_by_agent: "vs-code-gpt-5.4-mini"
completed_at: "2026-05-18T09:26:28.4813734+08:00"
related_cards: []
depends:
  - TASK-DGB-0001
notes: "2026-05-18 | 狀態: done | 驗證: markdown-task-adapter read successful + notes-protocol-converter parse+format passed | 變更: 新增 frontmatter-mapping schema、markdown-task-adapter 讀寫、notes-protocol-converter 日誌協作協議 | 阻塞: 無"
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
- 2026-05-18 | 狀態: done | 驗證: markdown-task-adapter read successful + notes-protocol-converter parse+format passed | 變更: 新增 frontmatter-mapping schema、markdown-task-adapter 讀寫、notes-protocol-converter 日誌協作協議 | 阻塞: 無
