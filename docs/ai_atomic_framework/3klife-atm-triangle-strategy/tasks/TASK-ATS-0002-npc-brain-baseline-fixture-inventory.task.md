---
doc_id: doc_other_0232
task_id: TASK-ATS-0002
title: npc-brain baseline freeze and fixture inventory
owner: atm-core
priority: P0
status: open
milestone: M1
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0001
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0002 — npc-brain baseline freeze and fixture inventory

## 背景

凍結 npc-brain 驗收基準，盤點 legacy Python 腳本與可用 fixture，避免後續行為驗證沒有共同起點。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [ ] 記錄 npc-brain repo path、branch、HEAD、baseline tag 或 branch。
- [ ] 盤點至少三類 legacy Python 候選：parser、service helper、workflow 或 ETL。
- [ ] 每個候選都有 source URI、風險、預期原子行為與 rollback 注意事項。
- [ ] baseline 可在乾淨 checkout 上重跑。

## 產出

- baseline report
- legacy Python fixture inventory
- risk matrix

## 驗證

- git status / branch / HEAD transcript
- fixture inventory review

## 依賴

- TASK-ATS-0001

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求重開為 TASK-ATS 序列並按執行優先序排序 | 阻塞: none
