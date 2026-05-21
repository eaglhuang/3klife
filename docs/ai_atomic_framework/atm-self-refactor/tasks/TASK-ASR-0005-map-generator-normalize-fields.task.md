---
doc_id: doc_other_asr_0005
task_id: TASK-ASR-0005
title: map-generator.ts 抽出 normalize-fields + errors
layer: L2
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:quick
public_tracking: false
allowed_files:
  - packages/core/src/manager/map-generator.ts
  - packages/core/src/manager/map-generator/errors.ts
  - packages/core/src/manager/map-generator/normalize-fields.ts
created_at: 2026-05-20T01:15:00+08:00
created_by_agent: ClaudeCode_Opus4.7
started_at: 2026-05-20T01:15:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T01:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: fcd4184
lastTransitionId: 2026-05-21T10-29-44-188Z-migrate-legacy-ledger-58a43ef33e33
lastTransitionAt: 2026-05-21T10:29:44.188Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.188Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:90b60a09813e212490d45e7ddc33371adf686fc551375ea511ff63c439902c88
---

# TASK-ASR-0005 — map-generator.ts 抽出 normalize-fields + errors

## 目標

按 SPLIT_PLAN execution order #1，抽出 7 個 per-field normalizer。同時建立共用的 `errors.ts`（GeneratorError type + createGeneratorError factory），讓後續 lineage card 共用。

## 輸出

- `packages/core/src/manager/map-generator/errors.ts`（new）
- `packages/core/src/manager/map-generator/normalize-fields.ts`（new）

## 驗收條件

- [x] `npm run validate:quick` ok (4/4)
- [x] `npm run typecheck` 0 new errors
- [x] I2 (upgrade proposal) 不變：error code `ATM_MAP_GENERATOR_*` 與 regex shape 保留

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: validate:quick ok 4/4, typecheck 0 errors | 變更: 7 個 per-field normalizer 抽到 `map-generator/normalize-fields.ts`；GeneratorError + createGeneratorError 抽到 `map-generator/errors.ts`；commit fcd4184。
