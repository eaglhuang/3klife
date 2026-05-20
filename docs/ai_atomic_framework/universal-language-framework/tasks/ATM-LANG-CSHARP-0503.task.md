---
doc_id: doc_other_0980
task_id: ATM-LANG-CSHARP-0503
title: C# equivalence contract full promotion
atomic_map: ATM-MAP-LANG-CSHARP-0503
milestone: CSHARP-M6
status: done
started_at: 2026-05-20T23:18:34+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T23:29:50+08:00
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
  - ATM-LANG-CSHARP-0502
allowed_files:
  - packages/language-csharp/src/adapter.ts
  - packages/language-csharp/src/csharp-equivalence.ts
  - scripts/validate-language-csharp.ts
  - tests/fixtures/language-csharp/equivalence-fixtures.json
  - tests/fixtures/language-csharp/capability-baseline.json
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 引入非 deterministic 的語意模型比較
created_at: 2026-05-20T23:18:34+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: equivalence evaluator 改 requiredAll/requiredAny/forbidden 規則，fixture 擴充為 4 cases，capability 升 full | 阻塞: none"
---

# ATM-LANG-CSHARP-0503 C# equivalence contract full promotion

## Outputs

- [x] equivalence contract capability 由 partial 提升為 full
- [x] 規則式 evaluator（requiredAll/requiredAny/forbidden）落地
- [x] fixture matrix 擴充並由 validator 驗證

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: equivalence evaluator 改 requiredAll/requiredAny/forbidden 規則，fixture 擴充為 4 cases，capability 升 full | 阻塞: none
