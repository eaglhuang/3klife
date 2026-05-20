---
doc_id: doc_other_0985
task_id: ATM-LANG-CSHARP-0603
title: C# runtime and diagnostics policy matrix integration
atomic_map: ATM-MAP-LANG-CSHARP-0603
milestone: CSHARP-M7
status: done
started_at: 2026-05-21T00:11:31+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-21T00:22:06+08:00
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
  - ATM-LANG-CSHARP-0602
allowed_files:
  - packages/language-csharp/src/csharp-policy-matrix.ts
  - packages/language-csharp/src/csharp-runtime.ts
  - packages/language-csharp/src/csharp-diagnostics.ts
  - tests/fixtures/language-csharp/runtime-diagnostics-policy-matrix.json
  - scripts/validate-language-csharp.ts
  - docs/ai_atomic_framework/universal-language-framework/tasks/README.md
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 執行真實 dotnet 指令
created_at: 2026-05-21T00:11:31+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: 新增 csharp-policy-matrix 與 runtime/diagnostics policy tags，validator 與 fixture 同步檢查 | 阻塞: none"
---

# ATM-LANG-CSHARP-0603 C# runtime and diagnostics policy matrix integration

## Outputs

- [x] runtime/diagnostics policy matrix 常數與解譯器
- [x] runtime warnings 與 diagnostics normalizer 對齊 policy tags
- [x] validator/fixture 驗證 policy matrix 覆蓋

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: 新增 csharp-policy-matrix 與 runtime/diagnostics policy tags，validator 與 fixture 同步檢查 | 阻塞: none
