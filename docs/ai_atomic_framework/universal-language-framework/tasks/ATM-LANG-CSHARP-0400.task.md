---
doc_id: doc_other_0973
task_id: ATM-LANG-CSHARP-0400
title: C# capability baseline realignment
atomic_map: ATM-MAP-LANG-CSHARP-0400
milestone: CSHARP-M5
status: done
started_at: 2026-05-20T23:01:12+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T23:05:14+08:00
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
  - ATM-LANG-CSHARP-0304
allowed_files:
  - packages/language-csharp/src/adapter.ts
  - scripts/validate-language-csharp.ts
  - docs/ai_atomic_framework/universal-language-framework/tasks/README.md
  - docs/ai_atomic_framework/universal-language-framework/tasks/ATM-LANG-CSHARP-040*.task.md
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 將 C# adapter 宣告為 official support
created_at: 2026-05-20T23:01:12+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: capability baseline fixture 建立並對齊 C# adapter/validator 宣告 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-425Z-migrate-legacy-ledger-ffbc69fe96bb
lastTransitionAt: 2026-05-21T10:29:44.425Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.425Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:2b991af6f92a7dacc7ce9e0fbfccbfd3212fcac86bbff142d9c7479efcafd9c1
---

# ATM-LANG-CSHARP-0400 C# capability baseline realignment

## Outputs

- [x] C# capability baseline 與 validator assertion 對齊
- [x] capability baseline fixture（machine-readable）建立
- [x] task README 的 C# extension pack 索引補入 0400~0403

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: capability baseline fixture 建立並對齊 C# adapter/validator 宣告 | 阻塞: none
