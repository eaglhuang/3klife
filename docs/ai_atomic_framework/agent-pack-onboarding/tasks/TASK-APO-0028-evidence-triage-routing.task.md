---
doc_id: doc_other_0234
task_id: TASK-APO-0028
title: Evidence triage and upstream routing
milestone: M3
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0027]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: cross-repo
hostKind: evidence-routing
alphaGate: validate:standard
public_tracking: false
executionMode: triage
allowed_files:
  - docs/ai_atomic_framework/agent-pack-onboarding/evidence/**
  - C:/Users/User/3klife-npc-brain/evidence/**
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/packages/**
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0028 — Evidence triage and upstream routing

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

將 M2 first-touch evidence 分級並決定 upstream issue、adopter-local note、host-governance-overlap 或 out-of-scope。

## 前置依賴

[TASK-APO-0027]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- triage report
- blocker list
- known limitations
- upstream issue candidates
- adopter-local notes

## 驗收條件

- [ ] 每個 evidence item 有 classification、severity、owner、repro command
- [ ] 新增 host-governance-overlap 分類
- [ ] Blocker 與 adopter-local 不混淆
- [ ] 可直接餵給 TASK-APO-0029

## 影響檔案

### 允許修改

- docs/ai_atomic_framework/agent-pack-onboarding/evidence/**
- C:/Users/User/3klife-npc-brain/evidence/**

### 禁止修改

- C:/Users/User/AI-Atomic-Framework/packages/**

## 驗證方式

~~~bash
encoding check for evidence report; manual traceability review
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待 M2 evidence | 阻塞: TASK-APO-0027