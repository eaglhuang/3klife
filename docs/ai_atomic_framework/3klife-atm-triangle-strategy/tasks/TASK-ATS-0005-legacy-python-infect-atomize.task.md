---
doc_id: doc_other_0235
task_id: TASK-ATS-0005
title: Legacy Python infect and atomize validation
owner: atm-core
priority: P0
status: open
milestone: M4
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0004
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0005 — Legacy Python infect and atomize validation

## 背景

在 npc-brain legacy Python 腳本上驗證 infect + atomize 的 strangler 能力，這是本計畫的高價值核心驗收。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [ ] atomize 能從 legacy Python 腳本產生 governed atom 草案。
- [ ] infect 能產生 downstream dry-run patch 與 propagation impact。
- [ ] review 前不得修改原始 Python 腳本。
- [ ] proposal 必須附 source URI、neutrality scan、rollback note 與 evidenceRefs。

## 產出

- legacy route plan
- atomize proposal draft
- infect dry-run patch
- review packet

## 驗證

- proposal schema validation
- dry-run patch review
- no direct mutation check

## 依賴

- TASK-ATS-0004

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求重開為 TASK-ATS 序列並按執行優先序排序 | 阻塞: none
