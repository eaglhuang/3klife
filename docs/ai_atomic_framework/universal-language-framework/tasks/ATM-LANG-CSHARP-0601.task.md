---
doc_id: doc_other_0983
task_id: ATM-LANG-CSHARP-0601
title: C# symbol resolution precision for extension/qualified calls
atomic_map: ATM-MAP-LANG-CSHARP-0601
milestone: CSHARP-M7
status: done
started_at: 2026-05-21T00:11:31+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-21T00:22:06+08:00
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
  - ATM-LANG-CSHARP-0600
allowed_files:
  - packages/language-csharp/src/csharp-symbol-index.ts
  - tests/fixtures/language-csharp/sample-project/src/Core/SyntaxPlayground.cs
  - tests/fixtures/language-csharp/expected-report.json
  - scripts/validate-language-csharp.ts
  - docs/ai_atomic_framework/universal-language-framework/tasks/README.md
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 重新實作整套 call graph parser
created_at: 2026-05-21T00:11:31+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: extension-style qualified call 解析規則補強並更新 sample fixture/expected-report | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-436Z-migrate-legacy-ledger-391c2a4208f5
lastTransitionAt: 2026-05-21T10:29:44.436Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.436Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:8aa42ddb12e867f64fb221d1abef27204e322119eaf39f765b06ab91d13f294b
---

# ATM-LANG-CSHARP-0601 C# symbol resolution precision for extension/qualified calls

## Outputs

- [x] qualified call 對 extension method 的解析優先規則補強
- [x] fixture 擴充 extension-style 寫法案例
- [x] validator 補對應解析精度斷言

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: extension-style qualified call 解析規則補強並更新 sample fixture/expected-report | 阻塞: none
