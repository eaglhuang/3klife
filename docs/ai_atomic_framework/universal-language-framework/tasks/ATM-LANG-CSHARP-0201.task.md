---
doc_id: doc_other_0958
task_id: ATM-LANG-CSHARP-0201
title: C# legacy route planning integration
atomic_map: ATM-MAP-LANG-CSHARP-0201
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T19:54:00+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T20:10:00+08:00
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
  - ATM-LANG-TABLE-0009
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0200
allowed_files:
  - packages/language-csharp/src/csharp-legacy-route.ts
  - packages/language-csharp/src/adapter.ts
  - packages/language-csharp/src/index.ts
  - scripts/validate-language-csharp.ts
  - tests/atm-lang-csharp.test.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 在 core guidance 寫死語言特化 regex
  - 跳過人工 review gate
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: 新增 C# legacy route planner，adapter capabilities 升級為 legacyRoutePlanning=partial，完成 delegated route 驗證 | 阻塞: none"
---

# ATM-LANG-CSHARP-0201 C# legacy route planning integration

## Outputs

- [x] `buildCSharpLegacyRoutePlan` 與 `parseCSharpLegacyRouteIntent` 完成
- [x] adapter `legacyRoutePlanning` 能力由 `none` 提升到 `partial`
- [x] 透過 `planLegacyRouteWithAdapter` 驗證 delegated mode

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: 新增 C# legacy route planner，adapter capabilities 升級為 legacyRoutePlanning=partial，完成 delegated route 驗證 | 阻塞: none
