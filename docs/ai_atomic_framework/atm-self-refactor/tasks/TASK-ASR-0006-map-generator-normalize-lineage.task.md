---
doc_id: doc_other_asr_0006
task_id: TASK-ASR-0006
title: map-generator.ts 抽出 normalize-lineage
layer: L2
status: done
blocked_by: [TASK-ASR-0005]
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:quick
public_tracking: false
allowed_files:
  - packages/core/src/manager/map-generator.ts
  - packages/core/src/manager/map-generator/normalize-lineage.ts
created_at: 2026-05-20T01:30:00+08:00
created_by_agent: ClaudeCode_Opus4.7
started_at: 2026-05-20T01:30:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T01:40:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: 525381e
lastTransitionId: 2026-05-21T10-29-44-189Z-migrate-legacy-ledger-f1287ccd839c
lastTransitionAt: 2026-05-21T10:29:44.189Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.189Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:6f974752df889949dff6efb6ca481f0c38a3e86d2c0e56537c9e510038d2ef07
---

# TASK-ASR-0006 — map-generator.ts 抽出 normalize-lineage

## 目標

按 SPLIT_PLAN execution order #2，抽出 6 個 replacement / lineage normalizer。同步把只被 lineage 用的三個 Set 常數（memberRoles / edgeKinds / replacementModes）一併搬入新檔。

## 輸出

`packages/core/src/manager/map-generator/normalize-lineage.ts`（new）

## 驗收條件

- [x] `npm run validate:quick` ok (4/4)
- [x] I2 不變：legacy:// URI pattern、localeCompare 排序、error codes

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: validate:quick ok 4/4 | 變更: 6 個 lineage normalizer + 3 個 Set 常數抽到 `map-generator/normalize-lineage.ts`；commit 525381e。
