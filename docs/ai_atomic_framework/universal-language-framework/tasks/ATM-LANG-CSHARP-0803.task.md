---
doc_id: doc_other_1213
task_id: ATM-LANG-CSHARP-0803
title: C# readiness gate lock-file checks
atomic_map: ATM-MAP-LANG-CSHARP-0803
milestone: CSHARP-M9
status: done
started_at: 2026-05-21T08:40:31+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-21T08:45:51+08:00
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
  - ATM-LANG-CSHARP-0802
allowed_files:
  - packages/language-csharp/src/csharp-readiness.ts
  - tests/fixtures/language-csharp/readiness-thresholds.json
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
  - Do not alter map decomposition contracts.
created_at: 2026-05-21T08:40:31+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: readiness gate 新增 packages lock profile 檢查與 threshold 控制 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-448Z-migrate-legacy-ledger-4722c6fe5470
lastTransitionAt: 2026-05-21T10:29:44.448Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.448Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:80732e9315ac87969d173e0b793c831ac791fc6455f559813d6dce166e820f18
---

# ATM-LANG-CSHARP-0803 C# readiness gate lock-file checks

## Outputs

- [x] Add readiness check for packages lock profile coverage
- [x] Keep threshold-driven enable/disable behavior
- [x] Update validator and smoke tests for new readiness check

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: readiness gate 新增 packages lock profile 檢查與 threshold 控制 | 阻塞: none
