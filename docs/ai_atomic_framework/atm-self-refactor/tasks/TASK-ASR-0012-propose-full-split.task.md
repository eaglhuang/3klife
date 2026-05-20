---
doc_id: doc_other_asr_0012
task_id: TASK-ASR-0012
title: propose.ts 完整拆分（normalize-input + gates）
layer: L3-complete
status: done
blocked_by: [TASK-ASR-0007]
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:upgrade-proposal
public_tracking: false
allowed_files:
  - packages/core/src/upgrade/propose.ts
  - packages/core/src/upgrade/propose/normalize-input.ts
  - packages/core/src/upgrade/propose/gates.ts
created_at: 2026-05-20T05:30:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
started_at: 2026-05-20T05:30:00+08:00
started_by_agent: ClaudeCode_Sonnet4.6
completed_at: 2026-05-20T06:30:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: c46e690
---

# TASK-ASR-0012 — propose.ts 完整拆分（normalize-input + gates）

## 目標

把 propose.ts 的三個職責完整分開：
1. **`propose/normalize-input.ts`**：input 規範化相關（inferInputKind, normalizeInputDocument, findInput, requireInput, buildInputRefs, resolveInputSchemaId, createInputSummary, unwrapKnownInputDocument）+ INPUT_KIND_PRIORITY 常數
2. **`propose/gates.ts`**：所有 gate builders（buildGateResult, build*Gate ×9）+ safeValidate* ×3 + normalizeGateResult
3. **`propose.ts`**（縮小）：只保留主函式 proposeAtomicUpgrade + 業務邏輯函式（normalizeRequest, normalizeTarget, normalizeRequestedReplacementMode, buildRequiredJustification, buildActiveReplacementRationale, createProposalId 等）

## 背景

- TASK-ASR-0007 已抽出 failure-reason.ts
- propose.ts 目前 995 行，alphaGate validate:upgrade-proposal 已通過
- 無需另建 snapshot diff fixture，validate:upgrade-proposal 已涵蓋完整 fixture 測試

## 驗收條件

- [x] `npm run validate:upgrade-proposal` ok
- [x] `npm run typecheck` 0 errors
- [x] `npm run validate:quick` ok 4/4
- [x] propose.ts 行數從 995 降至 443（-55%）

## Invariant

| Invariant | 說明 | 策略 |
|-----------|------|------|
| I2 Schema/manifest | upgrade proposal JSON shape | validate:upgrade-proposal 驗收 |
