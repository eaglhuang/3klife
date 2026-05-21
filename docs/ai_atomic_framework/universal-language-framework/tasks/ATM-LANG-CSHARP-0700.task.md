---
doc_id: doc_other_1200
task_id: ATM-LANG-CSHARP-0700
title: C# global.json and NuGet.Config profile detection
atomic_map: ATM-MAP-LANG-CSHARP-0700
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
  - ATM-LANG-CSHARP-0604
allowed_files:
  - packages/language-csharp/src/csharp-profile.ts
  - packages/language-csharp/src/index.ts
  - tests/fixtures/language-csharp/sample-project/global.json
  - tests/fixtures/language-csharp/sample-project/NuGet.Config
  - tests/fixtures/language-csharp/enterprise-solution/global.json
  - tests/fixtures/language-csharp/enterprise-solution/NuGet.Config
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
  - Do not execute dotnet/msbuild commands directly.
created_at: 2026-05-21T00:33:49+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: 新增 global.json / NuGet.Config profile detection，sample+enterprise fixture 補齊並完成 validator 驗證 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-440Z-migrate-legacy-ledger-c7e946f66099
lastTransitionAt: 2026-05-21T10:29:44.440Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.440Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:bd7647cbc4a6722b49987bd0c482804b0d36208b68ff2567d4785f0f037d2a1d
---

# ATM-LANG-CSHARP-0700 C# global.json and NuGet.Config profile detection

## Outputs

- [x] Extend C# project evidence to include global.json and NuGet.Config profiles
- [x] Add fixture files for sample/enterprise repositories
- [x] Expand validator checks for new profile evidence

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: 新增 global.json / NuGet.Config profile detection，sample+enterprise fixture 補齊並完成 validator 驗證 | 阻塞: none
