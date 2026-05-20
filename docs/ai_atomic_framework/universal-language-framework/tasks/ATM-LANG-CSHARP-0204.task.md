---
doc_id: doc_other_0961
task_id: ATM-LANG-CSHARP-0204
title: C# cross-file symbol reference index
atomic_map: ATM-MAP-LANG-CSHARP-0204
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T20:20:00+08:00
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
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0202
allowed_files:
  - packages/language-csharp/src/csharp-symbol-index.ts
  - scripts/validate-language-csharp.ts
  - tests/atm-lang-csharp.test.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 導入 Roslyn runtime dependency
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: 新增 cross-file symbol reference index（resolved/ambiguous/unresolved）與 validator 斷言 | 阻塞: none"
---

# ATM-LANG-CSHARP-0204 C# cross-file symbol reference index

## Outputs

- [x] `buildCSharpSymbolReferenceIndex` 落地
- [x] 引用解析結果提供 `resolved / ambiguous / unresolved` 統計
- [x] validator 與 smoke test 補強

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: 新增 cross-file symbol reference index（resolved/ambiguous/unresolved）與 validator 斷言 | 阻塞: none
