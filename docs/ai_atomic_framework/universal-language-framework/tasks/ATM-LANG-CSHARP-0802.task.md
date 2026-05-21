---
doc_id: doc_other_1212
task_id: ATM-LANG-CSHARP-0802
title: C# runtime lock-governance policy tags
atomic_map: ATM-MAP-LANG-CSHARP-0802
milestone: CSHARP-M9
status: done
started_at: 2026-05-21T08:40:31+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-21T08:45:51+08:00
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
  - ATM-LANG-CSHARP-0801
allowed_files:
  - packages/language-csharp/src/csharp-policy-matrix.ts
  - packages/language-csharp/src/csharp-runtime.ts
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
  - Do not introduce command execution behavior.
created_at: 2026-05-21T08:40:31+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: runtime policy matrix 增加 packages lock policy row 與 warning tag 投影 | 阻塞: none"
---

# ATM-LANG-CSHARP-0802 C# runtime lock-governance policy tags

## Outputs

- [x] Add runtime policy row for lock-file governance evidence
- [x] Project policy tags into runtime warnings
- [x] Sync matrix fixture and validator checks

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: runtime policy matrix 增加 packages lock policy row 與 warning tag 投影 | 阻塞: none
