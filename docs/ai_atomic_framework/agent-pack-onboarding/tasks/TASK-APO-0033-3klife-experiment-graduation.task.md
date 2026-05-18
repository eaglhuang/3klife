---
doc_id: doc_other_0239
task_id: TASK-APO-0033
title: 3KLife experiment graduation SOP
milestone: M8
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0025]
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: 3KLife and AI-Atomic-Framework
hostKind: experiment-graduation
alphaGate: validate:standard
public_tracking: false
executionMode: runbook
allowed_files:
  - docs/ai_atomic_framework/agent-pack-onboarding/**
  - docs/ai_atomic_framework/**
forbidden_files:
  - AI-Atomic-Framework protected docs hard-code 3KLife
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0033 — 3KLife experiment graduation SOP

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

定義 3KLife 實驗成果如何去 3KLife 化、evidence 化、validator 化後畢業到 upstream。

## 前置依賴

[TASK-APO-0025]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- graduation SOP
- upstream RFC template
- neutralization checklist
- first candidate list

## 驗收條件

- [ ] 定義可畢業 / 不可直接畢業案例
- [ ] 要求 deterministic validator 與 neutrality scan
- [ ] 不依賴 Cocos / task shard / private path
- [ ] 能連回 upstream issue / PR

## 影響檔案

### 允許修改

- docs/ai_atomic_framework/agent-pack-onboarding/**
- docs/ai_atomic_framework/**

### 禁止修改

- AI-Atomic-Framework protected docs hard-code 3KLife

## 驗證方式

~~~bash
encoding check; manual neutrality checklist
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待第一批 candidate experiment | 阻塞: none