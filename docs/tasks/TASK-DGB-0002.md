---
id: "TASK-DGB-0002"
title: "Encoding Guard profile 升級"
owner: "ClaudeCode_Haiku"
priority: "P0"
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

# TASK-DGB-0002 Encoding Guard profile 升級

## 摘要
- 把現有 encoding guard 邏輯轉化為可設定的 default profile capability，補足 policy parameters 與 validator。

## 驗證條件
- Encoding guard 規則可從 profile config 讀取 / 驗證能鑑出 BOM/U+FFFD/mojibake

## 交付物
- encoding-guard-profile.json / encoding-guard-validator.js

## 相關聯任務卡
- 無

## 備註
- 2026-05-17 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無
