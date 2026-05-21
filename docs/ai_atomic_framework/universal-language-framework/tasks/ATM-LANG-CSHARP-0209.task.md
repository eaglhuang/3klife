---
doc_id: doc_other_0966
task_id: ATM-LANG-CSHARP-0209
title: C# atomic map large-solution threshold profile
atomic_map: ATM-MAP-LANG-CSHARP-0209
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T20:25:00+08:00
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
  - ATM-LANG-TABLE-0008
  - ATM-LANG-TABLE-0009
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0208
allowed_files:
  - packages/language-csharp/src/csharp-map.ts
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 變更 plugin-sdk 公共 contract
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: map decomposition 新增 small/medium/large threshold profile 與 evidenceGate 訊息化 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-416Z-migrate-legacy-ledger-661a39c5cc83
lastTransitionAt: 2026-05-21T10:29:44.416Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.416Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:f7d3a7a6245cb87f0023e9c5d6ddb56b2ce7f459cef96c2adf1c9bee1d08e156
---

# ATM-LANG-CSHARP-0209 C# atomic map large-solution threshold profile

## Outputs

- [x] `deriveCSharpMapThresholdProfile` 新增
- [x] evidenceGate requiredEvidence 帶入 threshold profile
- [x] large solution 啟用專屬 warning/threshold message

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: map decomposition 新增 small/medium/large threshold profile 與 evidenceGate 訊息化 | 阻塞: none
