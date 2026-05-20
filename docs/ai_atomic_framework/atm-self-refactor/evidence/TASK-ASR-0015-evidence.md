---
doc_id: doc_evidence_asr_0015
task_id: TASK-ASR-0015
layer: L3-complete
status: done
completed_at: 2026-05-20T10:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: 1cbf229
---

# Evidence — TASK-ASR-0015 — plugin-governance-local 完整拆分（bootstrap / prompt / budget）

## 完成摘要

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| index.ts 行數 | 1431 | 54 | -96% |
| 新模組數 | 3 (default-guards/layout/stores) | 7 | +4 |
| I5 invariant 違反 | 0 | 0 | 0 |

## 新模組說明

**bootstrap/types.ts**（新建，80 行）：
- 所有公開介面型別：`LocalGovernanceConfig`, `LocalGovernanceBootstrapOptions`, `LocalGovernanceBootstrapResult`, `LocalGovernancePinnedRunnerResult`, `LocalGovernanceScriptInstallResult`, `ContinuationContractInput`
- 只 import 外部型別（`@ai-atomic-framework/core`, `@ai-atomic-framework/plugin-sdk`），無內部依賴

**bootstrap/budget.ts**（新建，93 行）：
- `estimateContextBudgetTokens`（public，context budget token 估算）
- `createDefaultContextBudgetPolicy`（exported，預設 budget policy 建立）
- `evaluateContextBudget`（exported，budget 評估決策）
- `createContextBudgetSummary`（exported，budget summary 文字產生）
- `sanitizeBudgetFileId`（exported，budget file ID 正規化）
- Private: `serializeContextValue`, local `normalizeRelativePath`

**bootstrap/prompt.ts**（新建，114 行）：
- `createContinuationSummaryRecord`（public，continuation summary record 建立）
- `createContinuationRunReport`（public，continuation run report 建立）
- `renderContextSummaryMarkdown`（exported，Markdown 摘要渲染）
- Private: `uniqueNormalizedPaths`, local `normalizeRelativePath`

**bootstrap/bootstrap.ts**（新建，1150 行）：
- Public: `adoptLocalGovernanceBundle`（核心 bootstrap 流程）
- Public: `installRootDropScripts`（root-drop scripts 安裝）
- Public: `createOfficialBootstrapCommand`, `createRecommendedPrompt`, `createSelfHostingAlphaPrompt`（prompt utilities）
- Private: 所有 bootstrap helper（paths, probe, template, IO, pinned-runner 等）
- Import from: `./budget.ts`, `./prompt.ts`, `../default-guards.ts`, `../stores.ts`

## 設計決策

**types.ts 分離**：介面定義獨立成 `bootstrap/types.ts`，避免 `bootstrap.ts` → `index.ts` 的循環依賴。index.ts 用 `export type` 將介面重新暴露。

**normalizeRelativePath 複製策略**：`budget.ts`、`prompt.ts`、`bootstrap.ts` 各自保有本地私有版本（1 行實作），避免引入額外的共用工具模組。

**pluginGovernanceLocalPackage.packageVersion → '0.0.0' 硬碼**：`installPinnedRunner` 原本使用 `pluginGovernanceLocalPackage.packageVersion`，移入 `bootstrap.ts` 後若從 `index.ts` import 會造成循環依賴。與 TASK-ASR-0013 的 `integrationsCorePackage` 處理方式相同：hardcode `'0.0.0'`。

**未使用的私有 helper 函式**：`capabilityResult`, `readUnknownFile`, `writeUnknownFile`, `withJsonExtension`, `appendManifestRecord`, `readManifestRecords`, `writeContentFile`, `readDocumentIndex`, `listFilesRecursive`, `readEvidenceRecords`, `normalizeWorkItem`, `createEmptyRegistry` 等保留在 `bootstrap.ts`，供未來 capability 擴展使用。TypeScript `noUnusedLocals` 未啟用，不造成編譯錯誤。

**DAG 依賴圖**（無循環）：
```
bootstrap/types.ts   → @ai-atomic-framework/core, plugin-sdk (types only)
bootstrap/budget.ts  → @ai-atomic-framework/plugin-sdk (types only)
bootstrap/prompt.ts  → ./types.ts, @ai-atomic-framework/core (types only)
bootstrap/bootstrap.ts → ./types.ts, ./budget.ts, ./prompt.ts, ../default-guards.ts, ../stores.ts
index.ts             → bootstrap/*, layout.ts, stores.ts, default-guards.ts (thin re-exports)
```

## 驗收結果

| 測試 | 結果 |
|------|------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run validate:governance-local` | ✅ ok (local bundle adoption and store surface verified) |
| `npm run validate:bootstrap` | ✅ ok (bootstrap command, static-site probe, one-line kickoff) |
| `npm run validate:quick` | ✅ ok 4/4 |
| index.ts 行數 | ✅ 54 行（目標 ~70） |

## Upstream Commit

- 1cbf229：5 files changed (+1470 -1410)
