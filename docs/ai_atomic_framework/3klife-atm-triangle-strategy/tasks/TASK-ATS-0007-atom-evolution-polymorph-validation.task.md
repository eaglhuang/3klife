---
doc_id: doc_other_0237
task_id: TASK-ATS-0007
title: Atom evolution and polymorphize validation
owner: atm-core
priority: P1
status: open
milestone: M6
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0006
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0007 — Atom evolution and polymorphize validation

## 背景

對接 AI-Atomic-Framework 的 ATOM_EVOLUTION_PLAN，驗證 evolve、polymorphize 與 map-level evolution 只能產生可審查 proposal。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [ ] evolve 從 evidence pattern 產 UpgradeProposal draft，不直接改 registry。
- [ ] polymorphize 產生 impact report 並標示 downstream map 風險。
- [ ] sweep / expire 與 evolution proposal 的 stale gate 有交叉測試。
- [ ] proposal 含 base version、evidence watermark、reversibility 與 review gate。

## 產出

- evolution evidence report
- UpgradeProposal draft
- polymorph impact report

## 驗證

- validate:upgrade-proposal or equivalent
- evolution dry-run transcript

## 依賴

- TASK-ATS-0006

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求重開為 TASK-ATS 序列並按執行優先序排序 | 阻塞: none
