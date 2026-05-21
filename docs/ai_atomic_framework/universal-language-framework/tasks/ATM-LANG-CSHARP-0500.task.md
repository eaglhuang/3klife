---
doc_id: doc_other_0977
task_id: ATM-LANG-CSHARP-0500
title: C# runtime command detection full promotion
atomic_map: ATM-MAP-LANG-CSHARP-0500
milestone: CSHARP-M6
status: done
started_at: 2026-05-20T23:18:34+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T23:29:50+08:00
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
  - ATM-LANG-CSHARP-0403
allowed_files:
  - packages/language-csharp/src/adapter.ts
  - packages/language-csharp/src/csharp-runtime.ts
  - scripts/validate-language-csharp.ts
  - tests/fixtures/language-csharp/runtime-command-requests.json
  - tests/fixtures/language-csharp/capability-baseline.json
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 直接執行 dotnet 或 msbuild 指令
created_at: 2026-05-20T23:18:34+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: runtime command 偵測升級為 full，補 safe/risky fixture 與 mutates/warnings 斷言 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-429Z-migrate-legacy-ledger-ad267efc1640
lastTransitionAt: 2026-05-21T10:29:44.429Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.429Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:19cbe5f437ca00ab5a059bb359cb15f592d27b2c4308d7b8d3d73cc311d1e016
---

# ATM-LANG-CSHARP-0500 C# runtime command detection full promotion

## Outputs

- [x] C# runtime command detection capability 由 partial 提升為 full
- [x] safe/risky request fixture 落地並由 validator 驗證
- [x] runtime command warnings 與 mutates 行為改為 deterministic 驗證

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: runtime command 偵測升級為 full，補 safe/risky fixture 與 mutates/warnings 斷言 | 阻塞: none
