---
doc_id: doc_other_0235
task_id: TASK-APO-0029
title: Upstream blocker repair batch
milestone: M4
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0028]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/**
  - C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts
  - C:/Users/User/AI-Atomic-Framework/docs/AGENT_PACK_ONBOARDING.md
forbidden_files:
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3klife-npc-brain/.atm/**
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0029 — Upstream blocker repair batch

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

只修阻擋 official onboarding 的 AI-Atomic-Framework upstream bug，避免在 adopter repo 私下 patch。

## 前置依賴

[TASK-APO-0028]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- upstream issues or PRs
- validator updates
- release candidate commit
- blocker resolution evidence

## 驗收條件

- [ ] 只處理 M3 標為 upstream blocker / P1 的項目
- [ ] 不 hard-code npc-brain 或 3KLife
- [ ] 通過 upstream validation profile
- [ ] known limitations 有清楚文字

## 影響檔案

### 允許修改

- C:/Users/User/AI-Atomic-Framework/packages/cli/**
- C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts
- C:/Users/User/AI-Atomic-Framework/docs/AGENT_PACK_ONBOARDING.md

### 禁止修改

- C:/Users/User/3KLife/.atm/**
- C:/Users/User/3klife-npc-brain/.atm/**

## 驗證方式

~~~bash
npm run validate:standard in AI-Atomic-Framework; targeted command repro
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待 evidence triage | 阻塞: TASK-APO-0028