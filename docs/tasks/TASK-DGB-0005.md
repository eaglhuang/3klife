---
id: "TASK-DGB-0005"
title: "Document Sharding manager / health check"
owner: "ClaudeCode_Haiku"
priority: "P1"
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

# TASK-DGB-0005 Document Sharding manager / health check

## 摘要
- 實作 shard manager 與 health check，支援 markdown-heading / json-array / json-object 分片模式，檢測 shard 新鮮度與索引一致性。

## 驗證條件
- Shard index 能自動重建 / health check 鑑出 stale/missing shard / auto-parts 自動分割超出 threshold 的大片段

## 交付物
- shard-manager.js / shard-health-check.js / shard config schema

## 相關聯任務卡
- 無

## 備註
- 2026-05-17 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無
