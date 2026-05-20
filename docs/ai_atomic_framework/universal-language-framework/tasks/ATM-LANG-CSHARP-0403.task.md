---
doc_id: doc_other_0976
task_id: ATM-LANG-CSHARP-0403
title: C# validator and readiness baseline hardening
atomic_map: ATM-MAP-LANG-CSHARP-0403
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
  - ATM-LANG-CSHARP-0402
allowed_files:
  - scripts/validate-language-csharp.ts
  - tests/fixtures/language-csharp/capability-baseline.json
  - docs/ai_atomic_framework/universal-language-framework/tasks/README.md
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 放寬 C# readiness gate
created_at: 2026-05-20T23:01:12+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: validator 改為 capability baseline 驗證，resolver fallback 斷言調整為 runtimeCommandDetection advisory | 阻塞: none"
---

# ATM-LANG-CSHARP-0403 C# validator and readiness baseline hardening

## Outputs

- [x] validator 直接驗證 capability baseline fixture
- [x] capability 升級後的 fallback/advisory 斷言更新
- [x] C# 任務索引補齊 0400~0403 並與 task card 狀態一致

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: validator 改為 capability baseline 驗證，resolver fallback 斷言調整為 runtimeCommandDetection advisory | 阻塞: none
