---
doc_id: doc_other_0979
task_id: ATM-LANG-CSHARP-0504
title: C# validator and capability full-baseline hardening
atomic_map: ATM-MAP-LANG-CSHARP-0504
milestone: CSHARP-M6
status: done
started_at: 2026-05-20T23:18:44+08:00
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
  - ATM-LANG-CSHARP-0503
allowed_files:
  - scripts/validate-language-csharp.ts
  - tests/fixtures/language-csharp/capability-baseline.json
  - docs/ai_atomic_framework/universal-language-framework/tasks/README.md
  - docs/ai_atomic_framework/universal-language-framework/tasks/ATM-LANG-CSHARP-050*.task.md
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 降級任何已完成的 C# full capability
created_at: 2026-05-20T23:18:44+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: validator 全面改成 full baseline 斷言（runtime/diagnostics/dry-run/equivalence/resolver），並回寫 0500~0504 任務卡與索引 | 阻塞: none"
---

# ATM-LANG-CSHARP-0504 C# validator and capability full-baseline hardening

## Outputs

- [x] `validate-language-csharp` 斷言更新為 full baseline
- [x] resolver fallback 斷言改為「full capability 無 advisory」
- [x] `0500~0504` 任務卡與 task index 完整回寫 done

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: validator 全面改成 full baseline 斷言（runtime/diagnostics/dry-run/equivalence/resolver），並回寫 0500~0504 任務卡與索引 | 阻塞: none
