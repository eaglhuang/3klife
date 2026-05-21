---
doc_id: doc_other_0964
task_id: ATM-LANG-CSHARP-0207
title: C# diagnostics parser SARIF expansion
atomic_map: ATM-MAP-LANG-CSHARP-0207
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T20:23:00+08:00
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
  - ATM-LANG-CSHARP-0206
allowed_files:
  - packages/language-csharp/src/csharp-diagnostics.ts
  - tests/fixtures/language-csharp/diagnostics-sarif.json
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 導入第三方 SARIF parser package
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: diagnostics parser 新增 SARIF JSON 支援與 fixture 驗證 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-414Z-migrate-legacy-ledger-db438526981a
lastTransitionAt: 2026-05-21T10:29:44.414Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.414Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:bbe6d3722b1570fcd581e23f3255d4757d3a97135938b2e7824be44b9510345f
---

# ATM-LANG-CSHARP-0207 C# diagnostics parser SARIF expansion

## Outputs

- [x] `parseSarifDiagnostics` 新增
- [x] 文字 log 與 SARIF 解析路徑共存
- [x] SARIF fixture + validator 斷言

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: diagnostics parser 新增 SARIF JSON 支援與 fixture 驗證 | 阻塞: none
