---
doc_id: doc_evidence_asr_0013
task_id: TASK-ASR-0013
layer: L3-complete
status: done
completed_at: 2026-05-20T07:45:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: 613dd73
---

# Evidence — TASK-ASR-0013 — integrations-core 完整 compiler/manifest/verify split

## 完成摘要

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| index.ts 行數 | 707 | 79 | -89% |
| 新模組數 | 1 (charter-block.ts) | 9 | +8 |
| 外部 import 在 index.ts | 5 | 0 | -5 |
| I5 invariant 違反 | 0 | 0 | 0 |

## 新模組說明

**compiler/skill-templates.ts**（新建，149 行）：
- `minimumAtmEntrySkillDefinitions` 常數（8 個 ATM skill entry）
- `defaultSkillTemplateDirectory` 計算常數
- Types: `SkillTemplateAdapterTarget`, `AtmSkillTemplateFrontmatter`, `AtmSkillTemplate`, `CompileSkillTemplateOptions`
- `parseSkillTemplate`, `loadSkillTemplates`, `loadMinimumAtmSkillTemplates`
- Private: `parseSkillTemplateFrontmatter`, `parseFrontmatterScalar`

**compiler/compile.ts**（新建，205 行）：
- `renderCharterInvariantsBlock`（wrapper with default arg）
- `compileSkillTemplatesForAdapter`（claude-code/copilot/cursor/gemini/codex）
- `compileSkillTemplate`（所有 adapter target）
- Private: `renderSkillTemplateBody`, `compileCopilotRootInstructions`, `escapeTomlBasicString`

**manifest/types.ts**（新建，110 行）：
- Adapter ID / format / placeholder 型別別名（`KnownIntegrationAdapterId` 等 6 個）
- `IntegrationInstallContext`, `IntegrationSourceFile`, `InstallManifestFile`, `InstallManifest`
- `CreateInstallManifestInput`, `IntegrationInstallResult`, `IntegrationAdapter`
- `StaticIntegrationAdapterInput`, `CodexSkillsAdapterOptions`
- Re-exports `IntegrationVerifyResult`, `IntegrationUninstallResult` from `../verify/types.ts`

**manifest/schema.ts**（新建，50 行）：
- `installManifestSchemaVersion` 常數
- `sha256Bytes`, `sha256File`, `formatInstallManifest`（共用序列化/hash utils）
- `normalizeManifestPath`, `resolveRepositoryPath`（共用 path 安全工具）

**manifest/construct.ts**（新建，177 行）：
- `createInstallManifest`, `createManifestFileRecord`
- `createCodexSkillsAdapter`, `createStaticIntegrationAdapter`
- Private: `resolveIntegrationSourceFiles`, `installSourceFiles`, `combineManifestPath`

**verify/types.ts**（新建，33 行）：
- `IntegrationFindingLevel`, `IntegrationFindingCode`, `IntegrationFinding`
- `IntegrationVerifyResult`, `IntegrationUninstallResult`

**verify/verify-installed.ts**（新建，55 行）：
- `verifyManifestFiles`（hash-compare drift detection）
- Private: `createFinding`

**verify/uninstall-safety.ts**（新建，80 行）：
- `uninstallManifestFiles`（preserve-if-modified uninstall）
- Private: `createFinding`

## 設計決策

**No circular dependencies**: 依賴圖嚴格為有向無環圖（DAG）。
`verify/types.ts` → 無依賴；`manifest/types.ts` → `verify/types.ts`；
`manifest/schema.ts` → `manifest/types.ts`；
`manifest/construct.ts` → `manifest/schema.ts` + `manifest/types.ts` + `verify/*.ts`；
`compiler/*.ts` → `manifest/types.ts`（型別 import 用）。

**manifest/schema.ts 作為共用工具層**: `sha256Bytes/sha256File/formatInstallManifest/normalizeManifestPath/resolveRepositoryPath` 在 construct 和 verify 都需要用到，集中放在 schema.ts 避免 construct → verify → construct 的循環依賴。

**atmFirstCommand/charterInvariantsPlaceholder 保留在 index.ts**: 同時也在 compile.ts 以 private 常數內嵌，避免 compile.ts → index.ts 的循環依賴。

**createCodexSkillsAdapter 版本預設值**: 原本用 `integrationsCorePackage.packageVersion`（`'0.0.0'`）；construct.ts 直接內嵌 `'0.0.0'` 避免從 index.ts 引入造成循環依賴。

## 驗收結果

| 測試 | 結果 |
|------|------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run validate:integration-adapter` | ✅ ok (interface, manifest schema, Codex reference factory, 6 adapters install/verify/uninstall) |
| `npm run validate:governance-local` | ✅ ok (local bundle adoption and store surface verified) |
| `npm run validate:quick` | ✅ ok 4/4 |

## Upstream Commit

- 613dd73：9 files changed (+927 -696)
