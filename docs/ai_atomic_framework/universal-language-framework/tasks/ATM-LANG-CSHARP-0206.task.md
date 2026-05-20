---
doc_id: doc_other_0963
task_id: ATM-LANG-CSHARP-0206
title: C# csproj risk rules
atomic_map: ATM-MAP-LANG-CSHARP-0206
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T20:22:00+08:00
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
  - ATM-LANG-TABLE-0009
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0205
allowed_files:
  - packages/language-csharp/src/csharp-csproj-risk.ts
  - packages/language-csharp/src/csharp-legacy-route.ts
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 修改 host csproj 內容
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 csproj risk model（multi-target/legacy/warnings-as-errors/reference drift）並串接 legacy route gate | 阻塞: none"
---

# ATM-LANG-CSHARP-0206 C# csproj risk rules

## Outputs

- [x] `buildCSharpCsprojRiskModel` 落地
- [x] 風險分類包含 multi-target / missing reference / TreatWarningsAsErrors
- [x] legacy route 會帶入風險摘要與 gate 建議

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 csproj risk model（multi-target/legacy/warnings-as-errors/reference drift）並串接 legacy route gate | 阻塞: none
