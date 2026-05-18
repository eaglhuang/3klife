---
id: "TASK-DGB-0002"
title: "Encoding Guard profile 升級"
owner: "ClaudeCode_Haiku"
priority: "P0"
status: "done"
type: "implementation"
phase: "M0"
created: "2026-05-17"
created_by_agent: "codex-gpt-5.5"
started_at: "2026-05-18T08:55:00+08:00"
started_by_agent: "vs-code-gpt-5.4-mini"
completed_at: "2026-05-18T09:04:34.5112983+08:00"
related_cards: []
depends:
  - TASK-DGB-0001
notes: "2026-05-18 | 狀態: done | 驗證: self-test + touched encoding guard passed | 變更: 新增 canonical encoding profile、validator、shared loader，並讓 adapter / high-risk edit 改讀 profile | 阻塞: 無"
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
- 2026-05-18 | 狀態: done | 驗證: self-test + touched encoding guard passed | 變更: 新增 canonical encoding profile、validator、shared loader，並讓 adapter / high-risk edit 改讀 profile | 阻塞: 無
