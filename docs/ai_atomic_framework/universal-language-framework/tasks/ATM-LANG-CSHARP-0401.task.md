---
doc_id: doc_other_0974
task_id: ATM-LANG-CSHARP-0401
title: C# source inventory full promotion
atomic_map: ATM-MAP-LANG-CSHARP-0401
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
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0400
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
  - 調整 plugin-sdk v2 contract
created_at: 2026-05-20T23:01:12+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: sourceInventory capability 升級 full，inventory files/symbols/edges/warnings 排序穩定化 | 阻塞: none"
---

# ATM-LANG-CSHARP-0401 C# source inventory full promotion

## Outputs

- [x] adapter capability `sourceInventory` 升級為 `full`
- [x] inventory 輸出排序穩定化（files/symbols/edges/warnings deterministic）
- [x] validator 以 fixture 驗證 source inventory full baseline

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: sourceInventory capability 升級 full，inventory files/symbols/edges/warnings 排序穩定化 | 阻塞: none
