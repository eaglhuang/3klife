---
doc_id: doc_other_0233
task_id: TASK-APO-0027
title: Disposable lab first-touch evidence
milestone: M2
status: open
started_at: ""
started_by_agent: ""
blocked_by: [TASK-APO-0026]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: npc-brain
hostKind: external-adopter
alphaGate: validate:standard
public_tracking: false
executionMode: lab-validation
allowed_files:
  - C:/tmp/npc-brain-atm-lab/**
  - C:/Users/User/3klife-npc-brain/evidence/**
forbidden_files:
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3KLife/tools_node/atomic-framework/**
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0027 — Disposable lab first-touch evidence

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

在 C:/tmp/npc-brain-atm-lab 以凍結 baseline 執行 official ATM first-touch commands，產生可重複 evidence。

## 前置依賴

[TASK-APO-0026]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- lab command transcript
- evidence/YYYY-MM-DD-npc-brain-first-touch.md
- generated file inventory
- friction report

## 驗收條件

- [ ] lab 可刪除重建
- [ ] 所有命令有 exit code 與 stdout/stderr 摘要
- [ ] 不使用 3KLife local fork
- [ ] host doc_id 慣例未被覆蓋
- [ ] 中文路徑無 mojibake

## 影響檔案

### 允許修改

- C:/tmp/npc-brain-atm-lab/**
- C:/Users/User/3klife-npc-brain/evidence/**

### 禁止修改

- C:/Users/User/3KLife/.atm/**
- C:/Users/User/3KLife/tools_node/atomic-framework/**

## 驗證方式

~~~bash
node atm.mjs bootstrap --json; node atm.mjs welcome --json; node atm.mjs next --json; node atm.mjs doctor --json
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 等待 baseline freeze 後開始 lab dry run | 阻塞: TASK-APO-0026