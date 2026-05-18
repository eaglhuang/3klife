---
doc_id: doc_other_0238
task_id: TASK-ATS-0008
title: Adopter sentinel integration and evidence routing
owner: atm-core
priority: P1
status: open
milestone: M7
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0007
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0008 — Adopter sentinel integration and evidence routing

## 背景

把 npc-brain 驗收接入 AI-Atomic-Framework 既有 adopter sentinel，並建立 evidence 分流規則。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [ ] 不另造第二套 3KLife 私有 adopter CI。
- [ ] evidence 可分成 upstream-blocker、adopter-local、host-governance-overlap。
- [ ] sentinel output 可被 upstream maintainer 解讀。
- [ ] 失敗案例不含 3KLife local fork 假設。

## 產出

- sentinel case definition
- evidence routing SOP
- sample reports

## 驗證

- adopter sentinel dry run
- report classification review

## 依賴

- TASK-ATS-0007

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求重開為 TASK-ATS 序列並按執行優先序排序 | 阻塞: none
