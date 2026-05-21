---
doc_id: doc_other_asr_0013
task_id: TASK-ASR-0013
title: integrations-core 完整 compiler/manifest/verify split
layer: L3-complete
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:integration-adapter
public_tracking: false
public_surface_risk: none
allowed_files:
  - packages/integrations-core/src/index.ts
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/integrations-core/src/compiler/compile.ts
  - packages/integrations-core/src/manifest/types.ts
  - packages/integrations-core/src/manifest/schema.ts
  - packages/integrations-core/src/manifest/construct.ts
  - packages/integrations-core/src/verify/types.ts
  - packages/integrations-core/src/verify/verify-installed.ts
  - packages/integrations-core/src/verify/uninstall-safety.ts
created_at: 2026-05-20T07:00:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
started_at: 2026-05-20T07:00:00+08:00
started_by_agent: ClaudeCode_Sonnet4.6
completed_at: 2026-05-20T07:45:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: 613dd73
lastTransitionId: 2026-05-21T10-29-44-196Z-migrate-legacy-ledger-024ab29d0ead
lastTransitionAt: 2026-05-21T10:29:44.196Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.196Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:44e4d634aeddf3a34ec7d89e13f5f87dde4996d8efb7b5095ae2ad6c3e9092f3
---

# TASK-ASR-0013 — integrations-core 完整 compiler/manifest/verify split

## 目標

把 `integrations-core/src/index.ts`（707 行）的三個職責完整拆開：

1. **`compiler/skill-templates.ts`**：template 解析/載入（parseSkillTemplate, loadSkillTemplates, loadMinimumAtmSkillTemplates, minimumAtmEntrySkillDefinitions）+ 相關 types
2. **`compiler/compile.ts`**：adapter 編譯器（compileSkillTemplatesForAdapter, compileSkillTemplate）+ 私有 renderSkillTemplateBody, compileCopilotRootInstructions, escapeTomlBasicString + renderCharterInvariantsBlock wrapper
3. **`manifest/types.ts`**：IntegrationInstallContext + 全部 InstallManifest* + IntegrationAdapter 等 interface types
4. **`manifest/schema.ts`**：installManifestSchemaVersion 常數 + schema validators
5. **`manifest/construct.ts`**：createInstallManifest + helpers + sha256* + createStaticIntegrationAdapter + createCodexSkillsAdapter
6. **`verify/types.ts`**：IntegrationFinding* type aliases + verify/uninstall result types
7. **`verify/verify-installed.ts`**：verifyManifestFiles + hash compare
8. **`verify/uninstall-safety.ts`**：uninstallManifestFiles + preserve-if-modified
9. **`index.ts`**（縮小）：只保留 integrationsCorePackage + 頂層 adapter id/format aliases + re-export from submodules（~80 行）

## 背景

- TASK-ASR-0008 已抽出 compiler/charter-block.ts
- index.ts 目前 707 行，三個職責混在一起
- Invariant I5：manifest hash stability，任何欄位改名/重排都會破壞下游

## 驗收條件

- [x] `npm run typecheck` 0 errors
- [x] `npm run validate:integration-adapter` ok
- [x] `npm run validate:governance-local` ok
- [x] `npm run validate:quick` ok 4/4
- [x] index.ts 行數從 707 降至 79 行（-89%）

## Invariant

| Invariant | 說明 | 策略 |
|-----------|------|------|
| I5 Manifest hash | .atm/integrations/*.manifest.json schema 與 hash 為 public contract | validate:integration-adapter 驗收 |
