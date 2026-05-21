---
doc_id: doc_other_0970
task_id: ATM-LANG-CSHARP-0302
title: C# csproj and solution deep profile v2
atomic_map: ATM-MAP-LANG-CSHARP-0302
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
  - ATM-LANG-CSHARP-0301
allowed_files:
  - packages/language-csharp/src/csharp-profile.ts
  - packages/language-csharp/src/csharp-csproj-risk.ts
  - tests/fixtures/language-csharp/sample-project/**
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 執行 MSBuild
created_at: 2026-05-20T21:45:08+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: 完成 Directory.Packages.props / conditional group 深解析，並補 central package management 相關 risk rules | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-421Z-migrate-legacy-ledger-048d6961de01
lastTransitionAt: 2026-05-21T10:29:44.421Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.421Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:f32efb0e66d8b27c293195b406a060165be2940f38d014ef21a8a98140c29999
---

# ATM-LANG-CSHARP-0302 C# csproj and solution deep profile v2

## Outputs

- [x] Directory.Packages.props 掃描
- [x] csproj conditional PropertyGroup/ItemGroup 掃描
- [x] risk model 補 central package management / conditional config 規則

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: 完成 Directory.Packages.props / conditional group 深解析，並補 central package management 相關 risk rules | 阻塞: none
