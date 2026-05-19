---
doc_id: doc_other_asr_0007
task_id: TASK-ASR-0007
title: propose.ts 抽出 failure-reason renderers
layer: L3
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:quick
public_tracking: false
allowed_files:
  - packages/core/src/upgrade/propose.ts
  - packages/core/src/upgrade/propose/failure-reason.ts
created_at: 2026-05-20T01:40:00+08:00
created_by_agent: ClaudeCode_Opus4.7
started_at: 2026-05-20T01:40:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T01:50:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: 6823fe7
---

# TASK-ASR-0007 — propose.ts 抽出 failure-reason renderers

## 目標

按 propose.SPLIT_PLAN，抽出最小、最低耦合的兩個 failure reason render 函式作為 Layer 3 的第一張卡。

## 輸出

`packages/core/src/upgrade/propose/failure-reason.ts`（new）：
- `gateFailureSummary`
- `qualityComparisonFailureReason`

## 驗收條件

- [x] `npm run validate:quick` ok (4/4)
- [x] I2 不變：rendered string 嵌入 upgrade proposal JSON

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: validate:quick ok 4/4 | 變更: 2 個 failure-reason render 函式抽到 `propose/failure-reason.ts`；commit 6823fe7。
