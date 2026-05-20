---
doc_id: doc_other_0954
task_id: ATM-LANG-CSHARP-0104
title: C# advisory runtime command detection
atomic_map: ATM-MAP-LANG-CSHARP-0104
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
  - ATM-LANG-CSHARP-0103
allowed_files:
  - packages/language-csharp/src/csharp-runtime.ts
  - packages/language-csharp/src/adapter.ts
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不實際執行任何 dotnet 指令。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 advisory-only runtime command detection（dotnet restore/build/test/format） | 阻塞: none"
---

# ATM-LANG-CSHARP-0104 C# advisory runtime command detection

## Outputs

- [x] `detectCSharpRuntimeCommands()` 實作
- [x] adapter capability `runtimeCommandDetection` 升級為 `partial`
- [x] warnings 明確標示 advisory-only

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 advisory-only runtime command detection（dotnet restore/build/test/format） | 阻塞: none
