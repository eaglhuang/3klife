---
doc_id: doc_other_0965
task_id: ATM-LANG-CSHARP-0208
title: C# legacy route deep planning
atomic_map: ATM-MAP-LANG-CSHARP-0208
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T20:24:00+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T20:50:00+08:00
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
  - ATM-LANG-CSHARP-0206
allowed_files:
  - packages/language-csharp/src/csharp-legacy-route.ts
  - scripts/validate-language-csharp.ts
  - tests/atm-lang-csharp.test.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 在 route plan 中直接產生 apply mutation
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: legacy route 依 profile/solution/risk 自適應步驟與 warning，並保留 advisory-only 模式 | 阻塞: none"
---

# ATM-LANG-CSHARP-0208 C# legacy route deep planning

## Outputs

- [x] route steps 會反映 profile / solution graph / csproj risk
- [x] routeId 加入 profile label，便於追蹤
- [x] review gate 依 blocking risk 升級為 dual-review 建議

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: legacy route 依 profile/solution/risk 自適應步驟與 warning，並保留 advisory-only 模式 | 阻塞: none
