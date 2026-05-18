---
doc_id: doc_other_0237
task_id: TASK-APO-0031
title: Existing adopter sentinel integration
milestone: M6
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0030]
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: sentinel-integration
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts
  - C:/Users/User/AI-Atomic-Framework/.github/workflows/adopter-sentinel.yml
  - C:/Users/User/AI-Atomic-Framework/tests/**
forbidden_files:
  - 新增 competing adopter-validation workflow
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0031 — Existing adopter sentinel integration

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

擴充既有 adopter-sentinel，新增 synthetic Python fixture 與 optional external npc-brain profile，避免第二套 CI 真相。

## 前置依賴

[TASK-APO-0030]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- updated adopter-sentinel profile
- synthetic Python fixture
- optional external profile skip policy
- workflow summary

## 驗收條件

- [ ] PR-blocking 不依賴 private repo
- [ ] 缺 secret 時 external profile skip
- [ ] synthetic Python fixture 可重現
- [ ] failure 產生 summary 或 issue

## 影響檔案

### 允許修改

- C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts
- C:/Users/User/AI-Atomic-Framework/.github/workflows/adopter-sentinel.yml
- C:/Users/User/AI-Atomic-Framework/tests/**

### 禁止修改

- 新增 competing adopter-validation workflow

## 驗證方式

~~~bash
node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待 candidate onboarding branch | 阻塞: TASK-APO-0030