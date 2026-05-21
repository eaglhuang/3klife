---
doc_id: doc_other_0953
task_id: ATM-LANG-CSHARP-0103
title: C# diagnostics parser multi-format hardening
atomic_map: ATM-MAP-LANG-CSHARP-0103
milestone: CSHARP-M2
status: done
started_at: 2026-05-20T18:24:00+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T18:40:00+08:00
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
  - ATM-LANG-CSHARP-0102
allowed_files:
  - packages/language-csharp/src/csharp-diagnostics.ts
  - tests/fixtures/language-csharp/diagnostics-sample.txt
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不執行實際 compiler。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: diagnostics 支援 analyzer code、short format、multiline continuation | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-403Z-migrate-legacy-ledger-b3e2a105584f
lastTransitionAt: 2026-05-21T10:29:44.403Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.403Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:f91c79bb236bf9550ebfbad7cc0e294981ff5e30456f0d2390ca43a00d4e09b3
---

# ATM-LANG-CSHARP-0103 C# diagnostics parser multi-format hardening

## Outputs

- [x] parser 支援 analyzer `CAxxxx`、short diagnostic line
- [x] parser 支援 continuation line 併入上一筆訊息
- [x] fixture 新增 warning-as-error context

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: diagnostics 支援 analyzer code、short format、multiline continuation | 阻塞: none
