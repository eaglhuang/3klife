---
doc_id: doc_other_0975
task_id: ATM-LANG-CSHARP-0402
title: C# dependency and artifact graph full promotion
atomic_map: ATM-MAP-LANG-CSHARP-0402
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
  - ATM-LANG-TABLE-0008
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0401
allowed_files:
  - packages/language-csharp/src/adapter.ts
  - packages/language-csharp/src/csharp-inventory.ts
  - scripts/validate-language-csharp.ts
  - tests/fixtures/language-csharp/capability-baseline.json
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 改寫 map decomposition contract
created_at: 2026-05-20T23:01:12+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: dependencyGraph/artifactGraph capability 升級 full，graph baseline 與 validator 對齊 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-427Z-migrate-legacy-ledger-2d0b1f6d284e
lastTransitionAt: 2026-05-21T10:29:44.427Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.427Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:f3ec63a6e3b9c8e792e689faad5a6dd7b7f4abee1a2ccbb99d006ff479f8a1a7
---

# ATM-LANG-CSHARP-0402 C# dependency and artifact graph full promotion

## Outputs

- [x] adapter capability `dependencyGraph` / `artifactGraph` 升級為 `full`
- [x] inventory graph edge 排序穩定化，避免跨平台順序漂移
- [x] validator 與 capability baseline fixture 對齊 graph 能力值

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: dependencyGraph/artifactGraph capability 升級 full，graph baseline 與 validator 對齊 | 阻塞: none
