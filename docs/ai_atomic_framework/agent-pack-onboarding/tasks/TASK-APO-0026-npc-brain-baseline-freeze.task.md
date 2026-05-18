---
doc_id: doc_other_0232
task_id: TASK-APO-0026
title: npc-brain baseline freeze and eligibility report
milestone: M1
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0025]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: npc-brain
hostKind: external-adopter
alphaGate: validate:standard
public_tracking: false
executionMode: adopter-baseline
allowed_files:
  - C:/Users/User/3klife-npc-brain/docs/atm-adoption/**
  - C:/Users/User/3klife-npc-brain/.git/**
forbidden_files:
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3KLife/.atm-temp/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0026 — npc-brain baseline freeze and eligibility report

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

固定 npc-brain 驗收 baseline，建立 atm-validation-base branch 或 tag，並在 adopter repo 內寫入 eligibility report。

## 前置依賴

[TASK-APO-0025]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- atm-validation-base branch or tag
- docs/atm-adoption/ADOPTER_ELIGIBILITY.md
- exact baseline commit
- L1/L2/L3 cleanliness decision

## 驗收條件

- [ ] baseline 不使用 moving main
- [ ] eligibility report 記錄 L1/L2/L3 判定
- [ ] Node / Python / Docker / 中文路徑條件已記錄
- [ ] M2 可用 exact commit 重建 lab

## 影響檔案

### 允許修改

- C:/Users/User/3klife-npc-brain/docs/atm-adoption/**
- C:/Users/User/3klife-npc-brain/.git/**

### 禁止修改

- C:/Users/User/3KLife/.atm/**
- C:/Users/User/3KLife/.atm-temp/**
- C:/Users/User/AI-Atomic-Framework/packages/**

## 驗證方式

~~~bash
git status; git rev-parse HEAD; encoding check for ADOPTER_ELIGIBILITY.md
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待 owner 決定 baseline commit 並建立 validation branch | 阻塞: baseline 未凍結