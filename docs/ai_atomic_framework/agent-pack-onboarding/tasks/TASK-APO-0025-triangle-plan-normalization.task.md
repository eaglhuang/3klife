---
doc_id: doc_other_0231
task_id: TASK-APO-0025
title: Triangle strategy plan normalization and task split
milestone: M0
status: done
started_at: 2026-05-18T17:00:11+08:00
started_by_agent: codex
completed_at: 2026-05-18T17:00:11+08:00
completed_by_agent: codex
blocked_by: []
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
targetRepo: 3KLife
hostKind: tracking-docs
alphaGate: validate:standard
public_tracking: false
executionMode: planning-doc-update
allowed_files:
  - docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
  - docs/ai_atomic_framework/agent-pack-onboarding/tasks/**
  - docs/doc-id-registry.json
  - docs/doc-id-registry-shards/registry-other.json
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不清空 3KLife .atm 或 .atm-temp
  - 不使用 3KLife local fork 讓 official onboarding 過關
  - 不把 adopter-specific 邏輯寫進 ATM protected public docs
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APO-0025 — Triangle strategy plan normalization and task split

## 背景

本卡由三角策略規劃書拆分而來，用來把 clean adopter 驗收、3KLife 研發試驗場與 AI-Atomic-Framework upstream 修補分開管理。

## 目標

將三角策略規劃書整理成正式版，移除修訂紀錄，重整 M0-M9 里程碑，並拆出 TASK-APO-0025 到 TASK-APO-0034 任務卡。

## 前置依賴

[]

## 輸入

- 3KLife ATM 採用三角策略規劃書
- ATM 引導工程計畫書
- 相關 repo 的最新 baseline / evidence

## 輸出

- 正式版三角策略規劃書
- TASK-APO-0025~0034 任務卡
- 任務卡 README 索引
- doc-id registry entries

## 驗收條件

- [x] 文件不再含 0.1 / 0.2 修訂紀錄
- [x] 里程碑表能對應到所有新任務卡
- [x] 所有新 task card 均有 doc_id 與驗收條件
- [x] encoding touched guard 通過

## 影響檔案

### 允許修改

- docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
- docs/ai_atomic_framework/agent-pack-onboarding/tasks/**
- docs/doc-id-registry.json
- docs/doc-id-registry-shards/registry-other.json

### 禁止修改

- assets/**
- library/**
- temp/**
- profiles/**
- settings/**

## 驗證方式

~~~bash
npm run check:encoding:touched -- --files <touched docs>; node tools_node/doc-id-registry.js --verify
~~~

## 回滾策略

依 git diff 回退本卡 touched files；若已建立 branch / tag / evidence，必須先保留 evidence 摘要，再用 revert 或刪除 disposable lab 還原，不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: done | 驗證: pending commit hook | 變更: 正式版規劃書與 task cards 拆分 | 阻塞: none