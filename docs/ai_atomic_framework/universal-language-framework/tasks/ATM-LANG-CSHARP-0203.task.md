---
doc_id: doc_other_0960
task_id: ATM-LANG-CSHARP-0203
title: C# csproj deep profile parsing
atomic_map: ATM-MAP-LANG-CSHARP-0203
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T19:56:00+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T20:10:00+08:00
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
  - packages/language-csharp/src/csharp-profile.ts
  - tests/fixtures/language-csharp/sample-project/src/MyApp.csproj
  - tests/fixtures/language-csharp/sample-project/src/Shared/Shared.csproj
  - tests/fixtures/language-csharp/sample-project/tests/MyApp.Tests.csproj
  - tests/fixtures/language-csharp/sample-project/Directory.Build.props
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 實際還原完整 MSBuild evaluation
  - 任何會修改 host 專案檔的行為
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 .sln/.csproj/Directory.Build.props 深度解析，輸出 tfm/test/reference evidence 並納入 profile confidence | 阻塞: none"
---

# ATM-LANG-CSHARP-0203 C# csproj deep profile parsing

## Outputs

- [x] `.sln` / `.csproj` / `Directory.Build.props` 深度解析落地
- [x] profile evidence 改為可機讀的 `#tfm=...` / `#projects=...` 格式
- [x] fixture 新增 multi-target、project reference、test project 驗證

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 新增 .sln/.csproj/Directory.Build.props 深度解析，輸出 tfm/test/reference evidence 並納入 profile confidence | 阻塞: none
