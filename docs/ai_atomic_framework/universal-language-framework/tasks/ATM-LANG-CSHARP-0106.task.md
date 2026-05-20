---
doc_id: doc_other_0956
task_id: ATM-LANG-CSHARP-0106
title: C# equivalence contract fixture implementation
atomic_map: ATM-MAP-LANG-CSHARP-0106
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
  - ATM-LANG-TABLE-0007
  - ATM-LANG-TABLE-0009
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0105
allowed_files:
  - packages/language-csharp/src/csharp-equivalence.ts
  - tests/fixtures/language-csharp/equivalence-fixtures.json
  - packages/language-csharp/src/adapter.ts
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不把 equivalence fixture 當成 production guarantee。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 computeCSharpEquivalenceContract 與 fixture cases | 阻塞: none"
---

# ATM-LANG-CSHARP-0106 C# equivalence contract fixture implementation

## Outputs

- [x] `computeCSharpEquivalenceContract()` 實作
- [x] fixture `equivalence-fixtures.json` 建立
- [x] adapter capability `equivalenceContract` 升級為 `partial`

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 computeCSharpEquivalenceContract 與 fixture cases | 阻塞: none
