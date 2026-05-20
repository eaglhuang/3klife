---
doc_id: doc_other_0971
task_id: ATM-LANG-CSHARP-0303
title: C# diagnostics parser normalization v2
atomic_map: ATM-MAP-LANG-CSHARP-0303
milestone: CSHARP-M4
status: done
started_at: 2026-05-20T21:45:08+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T21:48:52+08:00
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
  - ATM-LANG-CSHARP-0302
allowed_files:
  - packages/language-csharp/src/csharp-diagnostics.ts
  - tests/fixtures/language-csharp/diagnostics-*.json
  - tests/fixtures/language-csharp/diagnostics-sample.txt
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 啟動真實 analyzer 進程
created_at: 2026-05-20T21:45:08+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: diagnostics parser 升級支援 dotnet build/test/publish 常見格式與 SARIF ruleIndex/default level 變體 | 阻塞: none"
---

# ATM-LANG-CSHARP-0303 C# diagnostics parser normalization v2

## Outputs

- [x] dotnet build/test/publish 常見格式一致化
- [x] SARIF ruleIndex/default level 變體支援
- [x] validator fixture 擴充

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: diagnostics parser 升級支援 dotnet build/test/publish 常見格式與 SARIF ruleIndex/default level 變體 | 阻塞: none
