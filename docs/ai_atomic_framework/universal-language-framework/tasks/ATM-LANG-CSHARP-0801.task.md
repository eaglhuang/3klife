---
doc_id: doc_other_1211
task_id: ATM-LANG-CSHARP-0801
title: C# lock-file governance risk model expansion
atomic_map: ATM-MAP-LANG-CSHARP-0801
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
  - ATM-LANG-CSHARP-0800
allowed_files:
  - packages/language-csharp/src/csharp-csproj-risk.ts
  - scripts/validate-language-csharp.ts
  - tests/atm-lang-csharp.test.ts
  - docs/ai_atomic_framework/universal-language-framework/tasks/README.md
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - Do not change advisory-only execution boundary.
created_at: 2026-05-21T08:40:31+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: csproj risk model 新增 packages lock 缺失與版本異常治理風險 | 阻塞: none"
---

# ATM-LANG-CSHARP-0801 C# lock-file governance risk model expansion

## Outputs

- [x] Add packages lock governance findings to csproj risk model
- [x] Keep existing risk summary behavior compatible
- [x] Expand validator assertions for new findings

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: csproj risk model 新增 packages lock 缺失與版本異常治理風險 | 阻塞: none
