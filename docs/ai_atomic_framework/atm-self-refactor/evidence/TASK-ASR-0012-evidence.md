---
doc_id: doc_evidence_asr_0012
task_id: TASK-ASR-0012
layer: L3-complete
status: done
completed_at: 2026-05-20T06:30:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: c46e690
---

# Evidence — TASK-ASR-0012 — propose.ts 完整拆分（normalize-input + gates）

## 完成摘要

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| propose.ts 行數 | 995 | 443 | -55% |
| 新模組數 | 1 (failure-reason.ts) | 3 | +2 |
| 外部 import 在 propose.ts | 9 | 5 | -4 |
| I2 invariant 違反 | 0 | 0 | 0 |

## 新模組說明

**propose/normalize-input.ts**（新建，157 行）：
- `INPUT_KIND_PRIORITY` 常數
- `inferInputKind`, `unwrapKnownInputDocument`, `resolveInputSchemaId`, `createInputSummary`
- `normalizeInputDocument`, `findInput`, `requireInput`, `buildInputRefs`

**propose/gates.ts**（新建，280 行）：
- `normalizeGateResult`
- `buildGateResult`（共用基礎 gate 函式）
- `buildQualityComparisonGate`, `buildRegistryCandidateGate`, `buildMapEquivalenceGate`, `buildPolymorphImpactGate`, `buildRollbackProofGate`, `buildPropagationReportGate`, `buildReviewAdvisoryGate`, `buildHumanReviewGate`, `buildRetirementProofGate`
- `safeValidateRollbackProof`, `safeValidateRetirementProof`, `safeValidatePropagationReport`（private）
- `sameStringSet`, `normalizeStringSet`（private，只被 buildPolymorphImpactGate 用）

## 驗收結果

| 測試 | 結果 |
|------|------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run validate:upgrade-proposal` | ✅ ok (schema, invariants, core proposer, CLI replay, metric-driven track, evolution-loop fixtures, charter promotion gate, and conversation patch draft bridge) |
| `npm run validate:quick` | ✅ ok 4/4 |

## 設計決策

**不需要額外建立 snapshot diff fixture：** `validate:upgrade-proposal` 已有完整的 fixture 覆蓋（schema 驗證、invariant 驗證、多種 fixture 場景），足以作為 acceptance gate。

**sameStringSet 跟著 buildPolymorphImpactGate 走：** 這個工具函式只被 `buildPolymorphImpactGate` 使用，邏輯上屬於 gate 的內部實作細節，不需要 export。

## Upstream Commit

- c46e690：3 files changed (+634 -586)
