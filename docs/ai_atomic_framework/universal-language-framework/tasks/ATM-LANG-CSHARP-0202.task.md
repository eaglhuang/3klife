---
doc_id: doc_other_0959
task_id: ATM-LANG-CSHARP-0202
title: C# symbol stability hardening
atomic_map: ATM-MAP-LANG-CSHARP-0202
milestone: CSHARP-M3
status: done
started_at: 2026-05-20T19:55:00+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T20:10:00+08:00
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
  - ATM-LANG-CSHARP-0200
allowed_files:
  - packages/language-csharp/src/csharp-inventory.ts
  - packages/language-csharp/src/adapter.ts
  - tests/fixtures/language-csharp/sample-project/src/Core/Overloads.cs
  - tests/fixtures/language-csharp/expected-report.json
  - scripts/validate-language-csharp.ts
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 導入 Roslyn runtime 解析
  - 放寬 dry-run 無變更保證
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 修正 brace scope 追蹤，導入 method signature symbolId，重載方法 symbolId 穩定且唯一 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-409Z-migrate-legacy-ledger-ba4f240d06d7
lastTransitionAt: 2026-05-21T10:29:44.409Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.409Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:861259c10b6925702f42543fea2b9fc2b97f18eae5fe68a07029d109d7f05d9d
---

# ATM-LANG-CSHARP-0202 C# symbol stability hardening

## Outputs

- [x] 修正 class/method 換行大括號的 scope 追蹤
- [x] method symbolId 加入 signature，重載不再碰撞
- [x] 新增 overload fixture 與穩定性驗證

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 修正 brace scope 追蹤，導入 method signature symbolId，重載方法 symbolId 穩定且唯一 | 阻塞: none
