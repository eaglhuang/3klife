---
doc_id: doc_other_0951
task_id: ATM-LANG-CSHARP-0101
title: C# fixture expansion for modern syntax surface
atomic_map: ATM-MAP-LANG-CSHARP-0101
milestone: CSHARP-M2
status: done
started_at: 2026-05-20T18:24:00+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T18:40:00+08:00
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
  - ATM-LANG-CSHARP-0007
allowed_files:
  - tests/fixtures/language-csharp/**
  - packages/language-csharp/src/csharp-inventory.ts
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不宣稱 C# 已 official support。
  - 不執行 dotnet / msbuild。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: fixture 補齊 record/generic/nested/attribute/top-level/global using | 阻塞: none"
---

# ATM-LANG-CSHARP-0101 C# fixture expansion for modern syntax surface

## Outputs

- [x] Fixture 新增 `GlobalUsings.cs`、`Models/ApiResult.cs`、`TopLevelRunner.cs`
- [x] `expected-report.json` 更新 modern syntax coverage
- [x] validator fixture assertions 更新

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: fixture 補齊 record/generic/nested/attribute/top-level/global using | 阻塞: none
