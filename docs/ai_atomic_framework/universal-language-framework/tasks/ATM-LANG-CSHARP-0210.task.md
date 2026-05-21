---
doc_id: doc_other_0967
task_id: ATM-LANG-CSHARP-0210
title: C# enterprise multi-project smoke fixture
atomic_map: ATM-MAP-LANG-CSHARP-0210
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T20:26:00+08:00
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
  - ATM-LANG-TABLE-0008
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0209
allowed_files:
  - tests/fixtures/language-csharp/enterprise-solution/**
  - tests/fixtures/language-csharp/diagnostics-sarif.json
  - scripts/validate-language-csharp.ts
  - tests/atm-lang-csharp.test.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 把 enterprise fixture 當作 runtime 可執行 sample
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: 新增 enterprise multi-project fixture 與 smoke expectation，覆蓋 map large-threshold / symbol index / solution graph / csproj risk | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-417Z-migrate-legacy-ledger-78d1cb9ef343
lastTransitionAt: 2026-05-21T10:29:44.417Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.417Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:8b38e9afc8b2298c0873a79434679cc49849a3580364e5eb32ec1413b8490117
---

# ATM-LANG-CSHARP-0210 C# enterprise multi-project smoke fixture

## Outputs

- [x] enterprise fixture（4 csproj / 14 cs files）落地
- [x] enterprise smoke expectation 與 validator 斷言補齊
- [x] SARIF diagnostics fixture 併入完整 C# 驗證鏈

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: 新增 enterprise multi-project fixture 與 smoke expectation，覆蓋 map large-threshold / symbol index / solution graph / csproj risk | 阻塞: none
