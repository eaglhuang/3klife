---
id: "TASK-DGB-0004"
title: "Document Identity registry schema / resolver"
owner: "ClaudeCode_Haiku"
priority: "P1"
status: "done"
type: "implementation"
phase: "M0"
created: "2026-05-17"
created_by_agent: "codex-gpt-5.5"
related_cards: []
depends:
  - TASK-DGB-0001
started_at: "2026-05-18T09:11:00+08:00"
started_by_agent: "vs-code-gpt-5.4-mini"
completed_at: "2026-05-18T09:14:30.3842956+08:00"
notes: "2026-05-18 | 狀態: done | 驗證: schema parse + resolver lookup + registry verify executed | 變更: 新增 document-id schema 與 assign 包裝入口，沿用既有 resolver / registry 實作 | 阻塞: 無"
---

# TASK-DGB-0004 Document Identity registry schema / resolver

## 摘要
- 建立 document identity registry schema、assign 工具、resolve 與 search 函式，確保文件 ID 穩定不重複。

## 驗證條件
- 新文件能自動分配 ID / resolver 能快速定位 / rebuild 不改既有 ID

## 交付物
- document-id.schema.json / assign-doc-id.js / resolve-doc-id.js

## 相關聯任務卡
- 無

## 備註
- 2026-05-18 | 狀態: done | 驗證: schema parse + resolver lookup + registry verify executed | 變更: 新增 document-id schema 與 assign 包裝入口，沿用既有 resolver / registry 實作 | 阻塞: 無
