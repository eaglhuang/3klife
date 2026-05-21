---
doc_id: doc_other_1210
task_id: ATM-LANG-CSHARP-0800
title: C# packages.lock.json profile detection
atomic_map: ATM-MAP-LANG-CSHARP-0800
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
  - ATM-LANG-CSHARP-0704
allowed_files:
  - packages/language-csharp/src/csharp-profile.ts
  - packages/language-csharp/src/index.ts
  - tests/fixtures/language-csharp/sample-project/src/packages.lock.json
  - tests/fixtures/language-csharp/enterprise-solution/src/Contoso.App/packages.lock.json
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
  - Do not execute restore/build commands.
created_at: 2026-05-21T08:40:31+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: 新增 packages.lock.json profile 偵測與 sample/enterprise lock fixture | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-445Z-migrate-legacy-ledger-2cfb79a473c7
lastTransitionAt: 2026-05-21T10:29:44.445Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.445Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:7845e09fa7aa53403c688c4e19f4945e19c1f936c5a8dc5ace4042aab50f9117
---

# ATM-LANG-CSHARP-0800 C# packages.lock.json profile detection

## Outputs

- [x] Detect and parse packages.lock.json profile evidence
- [x] Add fixture lock files for sample and enterprise project roots
- [x] Add validator assertions for lock profile evidence

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; node tests/atm-lang-csharp.test.ts PASS; npm run validate:full PASS | 變更: 新增 packages.lock.json profile 偵測與 sample/enterprise lock fixture | 阻塞: none
