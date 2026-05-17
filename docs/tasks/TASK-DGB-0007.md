---
id: "TASK-DGB-0007"
title: "Scope Guard / dirty tree validator"
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

# TASK-DGB-0007 Scope Guard / dirty tree validator

## 摘要
- 實作 scope policy validator、file ownership overlap checker、allowed/forbidden files validator 與 dirty tree separator。

## 驗證條件
- Scope guard 能檢測檔案所有權衝突 / 鎖定可防止 cross-shard duplicate task / dirty tree 能正確分離工作區域

## 交付物
- scope-guard-validator.js / file-ownership-checker.js / dirty-tree-separator.js

## 相關聯任務卡
- 無

## 備註
- 2026-05-17 | 狀態: open | 驗證: pending | 變更: task-card-opener 產生骨架 | 阻塞: 無
