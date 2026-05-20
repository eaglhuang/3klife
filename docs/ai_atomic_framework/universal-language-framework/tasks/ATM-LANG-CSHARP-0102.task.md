---
doc_id: doc_other_0952
task_id: ATM-LANG-CSHARP-0102
title: C# partial declaration merge index
atomic_map: ATM-MAP-LANG-CSHARP-0102
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
  - ATM-LANG-CSHARP-0101
allowed_files:
  - packages/language-csharp/src/csharp-inventory.ts
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不進行 semantic merge 或跨專案重寫。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 buildCSharpPartialDeclarationIndex 與 partial group evidence | 阻塞: none"
---

# ATM-LANG-CSHARP-0102 C# partial declaration merge index

## Outputs

- [x] `buildCSharpPartialDeclarationIndex()` 實作
- [x] inventory report 可附帶 partial group warnings
- [x] validator 檢查 partial type key

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 buildCSharpPartialDeclarationIndex 與 partial group evidence | 阻塞: none
