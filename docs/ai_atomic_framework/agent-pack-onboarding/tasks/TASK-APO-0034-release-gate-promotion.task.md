---
doc_id: doc_other_0240
task_id: TASK-APO-0034
title: Release gate promotion for adopter validation
milestone: M9
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0031]
owner: atm-core
priority: P2
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: release-gate
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/.github/workflows/**
  - C:/Users/User/AI-Atomic-Framework/docs/DEPRECATIONS.md
  - C:/Users/User/AI-Atomic-Framework/docs/LONGTAIL_USERS.md
forbidden_files:
  - 要求所有 PR clone private repo 才能通過
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0034 — Release gate promotion for adopter validation

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

在 synthetic fixture 與 optional external profile 穩定後，定義哪些 adopter validation 可升級為 release gate。

## 前置依賴

[TASK-APO-0031]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- release gate policy update
- sentinel stability report
- rollback fixture evidence
- private repo skip policy

## 驗收條件

- [ ] release gate 不因 private repo 缺 secret false fail
- [ ] synthetic fixture blocking
- [ ] external profile 升級條件明確
- [ ] rollback gate 只在 tooling 成熟後啟用

## 影響檔案

### 允許修改

- C:/Users/User/AI-Atomic-Framework/.github/workflows/**
- C:/Users/User/AI-Atomic-Framework/docs/DEPRECATIONS.md
- C:/Users/User/AI-Atomic-Framework/docs/LONGTAIL_USERS.md

### 禁止修改

- 要求所有 PR clone private repo 才能通過

## 驗證方式

~~~bash
release workflow dry-run or sentinel validate; rollback fixture test
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待 sentinel 穩定多輪 | 阻塞: TASK-APO-0031