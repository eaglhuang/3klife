---
doc_id: doc_other_0984
task_id: ATM-LANG-CSHARP-0602
title: C# large-solution benchmark baseline and determinism checks
atomic_map: ATM-MAP-LANG-CSHARP-0602
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
  - ATM-LANG-TABLE-0008
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0601
allowed_files:
  - packages/language-csharp/src/csharp-benchmark.ts
  - tests/fixtures/language-csharp/benchmark-thresholds.json
  - scripts/validate-language-csharp.ts
  - docs/ai_atomic_framework/universal-language-framework/tasks/README.md
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 引入不穩定的真實執行壓測流程
created_at: 2026-05-21T00:11:31+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: 新增 csharp-benchmark 模組與 benchmark-thresholds fixture，validator 補 sample/enterprise baseline 檢查 | 阻塞: none"
---

# ATM-LANG-CSHARP-0602 C# large-solution benchmark baseline and determinism checks

## Outputs

- [x] benchmark 評估模組與 threshold fixture
- [x] sample/enterprise pipeline baseline 驗證
- [x] validator 補 benchmark + determinism gate

## Notes

2026-05-21 | 狀態: done | 驗證: npm run validate:language-csharp PASS; npm run validate:full PASS | 變更: 新增 csharp-benchmark 模組與 benchmark-thresholds fixture，validator 補 sample/enterprise baseline 檢查 | 阻塞: none
