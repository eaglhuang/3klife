---
doc_id: doc_other_0978
task_id: ATM-LANG-CSHARP-0501
title: C# diagnostics parsing full promotion
atomic_map: ATM-MAP-LANG-CSHARP-0501
milestone: CSHARP-M6
status: done
started_at: 2026-05-20T23:18:39+08:00
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
  - ATM-LANG-TABLE-0009
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0500
allowed_files:
  - packages/language-csharp/src/adapter.ts
  - packages/language-csharp/src/csharp-diagnostics.ts
  - scripts/validate-language-csharp.ts
  - tests/fixtures/language-csharp/capability-baseline.json
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 新增非必要的 diagnostics 類型推論
created_at: 2026-05-20T23:18:39+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: diagnostics parser 補 compact 格式、code normalization、dedupe；validator 補對應斷言 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-430Z-migrate-legacy-ledger-233ca52f6173
lastTransitionAt: 2026-05-21T10:29:44.430Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.430Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:de0175ff75066627c676f5a1c9d7f98ce99a16cfc63ede5a9d8da5c062a24035
---

# ATM-LANG-CSHARP-0501 C# diagnostics parsing full promotion

## Outputs

- [x] C# diagnostics parsing capability 由 partial 提升為 full
- [x] parser 支援 compact location 格式並進行 code/message 正規化
- [x] validator 補上 dedupe 與 compact fixture 行為驗證

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: diagnostics parser 補 compact 格式、code normalization、dedupe；validator 補對應斷言 | 阻塞: none
