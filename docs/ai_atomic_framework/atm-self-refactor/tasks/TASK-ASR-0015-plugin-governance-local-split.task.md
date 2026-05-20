---
doc_id: doc_other_asr_0015
task_id: TASK-ASR-0015
title: plugin-governance-local 完整拆分（bootstrap / prompt / budget）
layer: L3-complete
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:governance-local
public_tracking: false
public_surface_risk: none
allowed_files:
  - packages/plugin-governance-local/src/index.ts
  - packages/plugin-governance-local/src/bootstrap/types.ts
  - packages/plugin-governance-local/src/bootstrap/budget.ts
  - packages/plugin-governance-local/src/bootstrap/prompt.ts
  - packages/plugin-governance-local/src/bootstrap/bootstrap.ts
created_at: 2026-05-20T09:30:00+08:00
created_by_agent: ClaudeCode_Opus4.7
started_at: 2026-05-20T09:30:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T10:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: 1cbf229
---

# TASK-ASR-0015 — plugin-governance-local 完整拆分（bootstrap / prompt / budget）

## 目標

把 `packages/plugin-governance-local/src/index.ts`（1431 行）依職責完整拆開：

1. **`bootstrap/types.ts`**：所有公開介面型別（LocalGovernanceConfig, LocalGovernanceBootstrapOptions, LocalGovernanceBootstrapResult, LocalGovernancePinnedRunnerResult, LocalGovernanceScriptInstallResult, ContinuationContractInput）
2. **`bootstrap/budget.ts`**：context budget 估算與評估（estimateContextBudgetTokens, createDefaultContextBudgetPolicy, evaluateContextBudget, createContextBudgetSummary, sanitizeBudgetFileId）
3. **`bootstrap/prompt.ts`**：continuation prompt / summary 合約（createContinuationSummaryRecord, createContinuationRunReport, renderContextSummaryMarkdown）
4. **`bootstrap/bootstrap.ts`**：核心 bootstrap 流程（adoptLocalGovernanceBundle, installRootDropScripts, createOfficialBootstrapCommand, createRecommendedPrompt, createSelfHostingAlphaPrompt）
5. **`index.ts`**（縮小）：只保留 pluginGovernanceLocalPackage + createLocalGovernanceAdapter + 薄 re-export（~70 行）

## 背景

- `default-guards.ts`, `layout.ts`, `stores.ts` 已在前期抽出
- index.ts 目前 1431 行，包含 bootstrap、budget、prompt、template/IO helper 四個職責
- 驗收閘門：validate:governance-local ok + validate:bootstrap ok + validate:quick ok 4/4

## 驗收條件

- [x] `npm run typecheck` 0 errors
- [x] `npm run validate:governance-local` ok
- [x] `npm run validate:bootstrap` ok
- [x] `npm run validate:quick` ok 4/4
- [x] index.ts 行數從 1431 降至 54 行（-96%）

## Invariant

| Invariant | 說明 | 策略 |
|-----------|------|------|
| I5 manifest hash | install-uninstall roundtrip shape | validate:governance-local |

## DAG 依賴圖

```
bootstrap/types.ts   → @ai-atomic-framework/core, plugin-sdk (types only)
bootstrap/budget.ts  → @ai-atomic-framework/plugin-sdk (types), no internal deps
bootstrap/prompt.ts  → ./types.ts, @ai-atomic-framework/core (types)
bootstrap/bootstrap.ts → ./types.ts, ./budget.ts, ./prompt.ts, ../default-guards.ts, ../stores.ts
index.ts             → bootstrap/*, layout.ts, stores.ts, default-guards.ts (thin re-exports)
```
