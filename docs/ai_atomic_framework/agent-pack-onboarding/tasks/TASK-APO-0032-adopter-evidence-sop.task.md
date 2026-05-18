---
doc_id: doc_other_0238
task_id: TASK-APO-0032
title: Adopter evidence feedback SOP
milestone: M7
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0028]
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: cross-repo
hostKind: evidence-routing
alphaGate: validate:standard
public_tracking: false
executionMode: runbook
allowed_files:
  - docs/ai_atomic_framework/agent-pack-onboarding/**
  - C:/Users/User/AI-Atomic-Framework/docs/governance/**
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/docs protected public contract hard-code npc-brain
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0032 — Adopter evidence feedback SOP

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

建立 adopter evidence schema、issue labels 與 protected docs / case-study 邊界，讓驗收失敗可回流 upstream。

## 前置依賴

[TASK-APO-0028]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- adopter evidence SOP
- evidence schema example
- issue label convention
- protected-doc boundary

## 驗收條件

- [ ] schema 包含 baseline / command / exitCode / writes / classification / neutralityRisk
- [ ] labels 不污染 protected docs
- [ ] case-study 與 public contract 邊界清楚

## 影響檔案

### 允許修改

- docs/ai_atomic_framework/agent-pack-onboarding/**
- C:/Users/User/AI-Atomic-Framework/docs/governance/**

### 禁止修改

- C:/Users/User/AI-Atomic-Framework/docs protected public contract hard-code npc-brain

## 驗證方式

~~~bash
encoding check; neutrality review
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待 triage taxonomy 穩定 | 阻塞: TASK-APO-0028