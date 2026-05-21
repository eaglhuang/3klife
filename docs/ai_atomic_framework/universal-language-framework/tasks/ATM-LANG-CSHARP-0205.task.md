---
doc_id: doc_other_0962
task_id: ATM-LANG-CSHARP-0205
title: C# solution and project graph
atomic_map: ATM-MAP-LANG-CSHARP-0205
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T20:21:00+08:00
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
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0203
allowed_files:
  - packages/language-csharp/src/csharp-profile.ts
  - packages/language-csharp/src/csharp-solution-graph.ts
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 執行 dotnet restore/build
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 建立 solution/project graph（solution-includes + project-reference edges）並納入 deep profile evidence | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-412Z-migrate-legacy-ledger-67bbed0c9ebb
lastTransitionAt: 2026-05-21T10:29:44.412Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.412Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:880dd04e855e3891f98fccd884f2e1d237312f30fe20c6c1ed9e84a005ce3e5a
---

# ATM-LANG-CSHARP-0205 C# solution and project graph

## Outputs

- [x] `.sln` 專案 entry 深度解析
- [x] `buildCSharpSolutionProjectGraph` 建立多專案 graph
- [x] validator 驗證 project-reference edges

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 建立 solution/project graph（solution-includes + project-reference edges）並納入 deep profile evidence | 阻塞: none
