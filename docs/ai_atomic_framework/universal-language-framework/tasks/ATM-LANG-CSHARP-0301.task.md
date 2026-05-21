---
doc_id: doc_other_0969
task_id: ATM-LANG-CSHARP-0301
title: C# symbol resolution hardening for alias static and generic calls
atomic_map: ATM-MAP-LANG-CSHARP-0301
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
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0300
allowed_files:
  - packages/language-csharp/src/csharp-symbol-index.ts
  - packages/language-csharp/src/csharp-inventory.ts
  - tests/fixtures/language-csharp/sample-project/**
  - scripts/validate-language-csharp.ts
  - tests/atm-lang-csharp.test.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 執行 dotnet build/test
created_at: 2026-05-20T21:45:08+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: symbol reference index 新增 alias/static/generic/arg-count 解析與過濾，resolved coverage 提升 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-420Z-migrate-legacy-ledger-1a4e0e7dd33c
lastTransitionAt: 2026-05-21T10:29:44.420Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.420Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:bdbacc7e363e4ec20867464766439ed16bf28c3f02e0eb990352028ff4016bae
---

# ATM-LANG-CSHARP-0301 C# symbol resolution hardening for alias static and generic calls

## Outputs

- [x] symbol reference index 支援 using alias / using static
- [x] generic call 與 argument count 過濾
- [x] validator 補 resolved/ambiguous/unresolved 斷言

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; node tests/atm-lang-csharp.test.ts（PASS）; npm run validate:full（PASS） | 變更: symbol reference index 新增 alias/static/generic/arg-count 解析與過濾，resolved coverage 提升 | 阻塞: none
