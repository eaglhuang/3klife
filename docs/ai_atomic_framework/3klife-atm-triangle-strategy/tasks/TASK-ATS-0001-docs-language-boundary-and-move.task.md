---
doc_id: doc_other_0231
task_id: TASK-ATS-0001
title: Public docs language gate and strategy directory migration
owner: atm-core
priority: P0
status: completed
milestone: M0
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: none
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
completed_at: 2026-05-18T00:00:00+08:00
---

# TASK-ATS-0001 — Public docs language gate and strategy directory migration

## 背景

把三角策略從 agent-pack-onboarding 搬到獨立目錄，重開 TASK-ATS 任務序列，並完成 AI-Atomic public docs 中文內容盤點。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [x] 三角策略規劃書位於 docs/ai_atomic_framework/3klife-atm-triangle-strategy/。
- [x] agent-pack-onboarding/tasks 只保留 TASK-APO-0000 到 TASK-APO-0024。
- [x] AI-Atomic-Framework docs 中文掃描結果寫入 audit 文件。
- [x] doc-id registry 更新到新路徑。

## 產出

- 新目錄與計畫書
- TASK-ATS 任務索引
- AI-Atomic docs public-language audit
- 執行證據：../evidence/TASK-ATS-0001-public-docs-language-gate.md

## 驗證

- npm run check:encoding:touched -- --files <touched-files>
- git diff --check

## 依賴

- 無

## Notes

2026-05-18 | 狀態: completed | 驗證: PASS | 變更: 完成 M0 gate 複核；AI-Atomic docs CJK scan 為 0，APO 任務序列保留 0000-0024，registry 已指向三角策略新路徑 | 阻塞: none
