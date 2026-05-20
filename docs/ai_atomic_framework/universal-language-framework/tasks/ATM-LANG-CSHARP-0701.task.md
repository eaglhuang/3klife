---
doc_id: doc_other_1201
task_id: ATM-LANG-CSHARP-0701
title: C# reproducible-restore risk findings from project evidence
atomic_map: ATM-MAP-LANG-CSHARP-0701
milestone: CSHARP-M8
status: done
started_at: 2026-05-21T00:33:49+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-21T00:41:58+08:00
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
  - ATM-LANG-CSHARP-0700
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
  - Do not claim official C# production readiness.
created_at: 2026-05-21T00:33:49+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: csproj risk model 新增 sdk pin / source mapping / restore locked mode 治理訊號 | 阻塞: none"
---

# ATM-LANG-CSHARP-0701 C# reproducible-restore risk findings from project evidence

## Outputs

- [x] Add risk findings for sdk pinning and NuGet source governance
- [x] Keep existing risk findings backward compatible
- [x] Add validator assertions for new risk signals

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: csproj risk model 新增 sdk pin / source mapping / restore locked mode 治理訊號 | 阻塞: none
