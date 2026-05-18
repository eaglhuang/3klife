---
doc_id: doc_other_0236
task_id: TASK-APO-0030
title: npc-brain candidate official onboarding branch
milestone: M5
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0029]
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: npc-brain
hostKind: external-adopter
alphaGate: validate:standard
public_tracking: false
executionMode: candidate-onboarding
allowed_files:
  - C:/Users/User/3klife-npc-brain/.atm/**
  - C:/Users/User/3klife-npc-brain/docs/atm-adoption/**
forbidden_files:
  - C:/Users/User/3klife-npc-brain/main direct commit
  - C:/Users/User/3KLife/tools_node/atomic-framework/**
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0030 — npc-brain candidate official onboarding branch

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

在 npc-brain candidate branch 執行修補後的 official onboarding，產生 VERIFICATION.md 與 .atm commit policy。

## 前置依賴

[TASK-APO-0029]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- candidate branch
- VERIFICATION.md
- .atm commit policy
- onboarding evidence bundle

## 驗收條件

- [ ] 不 commit 到 main
- [ ] .atm runtime/cache 不誤 commit
- [ ] welcome / next / verify / doctor 通過或有 known limitation
- [ ] upgrade plan 可跑且不寫檔

## 影響檔案

### 允許修改

- C:/Users/User/3klife-npc-brain/.atm/**
- C:/Users/User/3klife-npc-brain/docs/atm-adoption/**

### 禁止修改

- C:/Users/User/3klife-npc-brain/main direct commit
- C:/Users/User/3KLife/tools_node/atomic-framework/**

## 驗證方式

~~~bash
node atm.mjs welcome --json; node atm.mjs next --json; node atm.mjs atm-chart verify --json; node atm.mjs doctor --json
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待 upstream blocker 修補 | 阻塞: TASK-APO-0029