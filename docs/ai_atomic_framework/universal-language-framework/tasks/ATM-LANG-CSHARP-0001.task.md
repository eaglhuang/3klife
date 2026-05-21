---
doc_id: doc_other_0944
task_id: ATM-LANG-CSHARP-0001
title: C# adapter package skeleton
atomic_map: ATM-MAP-LANG-CSHARP-0001
milestone: CSHARP-M1
status: done
started_at: 2026-05-20T17:24:45+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T18:05:00+08:00
owner: atm-core
priority: P1
type: implementation
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:language-csharp
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0006
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-1002
allowed_files:
  - packages/language-csharp/**
  - tests/fixtures/language-csharp/**
  - tests/atm-lang-csharp.test.ts
  - package.json
  - docs/ai_atomic_framework/universal-language-framework/**
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不把 C# 標成 official support。
  - 不執行 MSBuild、dotnet 或 Unity Editor。
  - 不修改任何 host C# 專案檔。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: open | 驗證: pending | 變更: opened C# adapter package skeleton task card | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-393Z-migrate-legacy-ledger-4a9c8b2ec143
lastTransitionAt: 2026-05-21T10:29:44.393Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.393Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:26f781f50cd3d745b116ac34530107065327ab69c2abd2695e6702ae1b366771
---

# ATM-LANG-CSHARP-0001 C# adapter package skeleton

## Background

本任務開啟 C# future adapter 的第一層骨架。它承接 ATM-LANG-1002 的 future adapter conformance checklist，但只建立可被後續任務擴充的 package surface，不宣稱 C# 已成為正式支援語言。

## Dependencies

- ATM-LANG-1002

## Inputs

- 主計畫書：docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
- 英文 companion：docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
- Adapter contract：packages/plugin-sdk/src/language-adapter.ts
- Atomic Map：ATM-MAP-LANG-CSHARP-0001
- 相關表格：ATM-LANG-TABLE-0006、ATM-LANG-TABLE-0010

## Outputs

- [ ] `packages/language-csharp` package skeleton
- [ ] `createCSharpLanguageAdapter` factory
- [ ] `csharpLanguageAdapterV2` export
- [ ] conservative capability declaration
- [ ] package-level README or inline docs for future feasibility status

## Acceptance Criteria

- [ ] C# adapter export 可被型別檢查為 `LanguageAdapterV2`。
- [ ] capability 必須保守標示為 future / experimental / partial，不得寫成 official support。
- [ ] skeleton 不執行 MSBuild、dotnet、Unity Editor 或任何 host 專案指令。
- [ ] package surface 保留給 profile detection、source inventory、diagnostics parser、dry-run planner 擴充。
- [ ] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- packages/language-csharp/**
- tests/fixtures/language-csharp/**
- tests/atm-lang-csharp.test.ts
- package.json

## Atomic Maps Tables

- ATM-LANG-TABLE-0006
- ATM-LANG-TABLE-0010

## Validation Commands

```bash
npm run validate:language-csharp
```

## Implementation Notes

- 這張卡只做 adapter package 的入口與骨架，不放入完整 parser。
- 若需要新增 workspace/package 設定，必須保持 upstream AI-Atomic-Framework 中立命名。
- 正式拿卡時，先依 repo 規則執行 `task-lock.js check` 與 `task-lock.js lock`，並更新 frontmatter 的 status / started_at / started_by_agent。

## Checklist

- [ ] Scope confirmed against master plan.
- [ ] Atomic table impact checked.
- [ ] Implementation completed.
- [ ] Validation command executed.
- [ ] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:guide（PASS）; npm run validate:full（PASS） | 變更: 完成 C# adapter package skeleton 與 profile/inventory/dry-run 接線 | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: codex-gpt-5 接手 C# adapter package skeleton | 阻塞: none
2026-05-20 | 狀態: open | 驗證: pending | 變更: opened C# adapter package skeleton task card | 阻塞: none
