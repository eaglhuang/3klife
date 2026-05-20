---
doc_id: doc_other_0949
task_id: ATM-LANG-CSHARP-0006
title: dry-run planner
atomic_map: ATM-MAP-LANG-CSHARP-0006
milestone: CSHARP-M1
status: done
started_at: 2026-05-20T17:24:45+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T18:05:00+08:00
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
  - ATM-LANG-TABLE-0007
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0005
allowed_files:
  - packages/language-csharp/**
  - tests/fixtures/language-csharp/**
  - tests/atm-lang-csharp.test.ts
  - docs/ai_atomic_framework/universal-language-framework/**
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不做真實 atomize/infect 寫檔。
  - 不改 imports、project references 或 generated files。
  - 不宣稱 dry-run 結果等於安全可套用 patch。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: open | 驗證: pending | 變更: opened C# dry-run planner task card | 阻塞: none"
---

# ATM-LANG-CSHARP-0006 dry-run planner

## Background

本任務建立 C# adapter 的 dry-run planner。它只提出 atomize / infect 的可行性、風險、review gate 與 rollback hint，不對 C# source 或 project 檔做任何修改。

## Dependencies

- ATM-LANG-CSHARP-0005

## Inputs

- C# profile detection
- C# source inventory
- C# partial/generated risk model
- C# diagnostics parser fixture
- Atomic Map：ATM-MAP-LANG-CSHARP-0006
- 相關表格：ATM-LANG-TABLE-0007、ATM-LANG-TABLE-0010

## Outputs

- [ ] `planAtomizeDryRun` C# implementation
- [ ] `planInfectDryRun` C# implementation
- [ ] dry-run evidence envelope
- [ ] review gate and rollback hint fixture

## Acceptance Criteria

- [ ] dry-run result 必須標示 `executionMode: dry-run`。
- [ ] dry-run evidence 必須包含 `mutates: []` 或等價的無修改證據。
- [ ] partial/generated risk 必須能降級或阻擋不安全 plan。
- [ ] planner 不寫檔、不產生 patch、不修改 imports 或 project references。
- [ ] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- packages/language-csharp/src/csharp-dry-run.ts
- tests/fixtures/language-csharp/**
- tests/atm-lang-csharp.test.ts

## Atomic Maps Tables

- ATM-LANG-TABLE-0007
- ATM-LANG-TABLE-0010

## Validation Commands

```bash
npm run validate:language-csharp
```

## Implementation Notes

- dry-run planner 應先把 C# 定位為 feasibility report，不要直接承諾可改檔。
- rollback hint 可描述「不要套用，需人工 review」，而不是提供自動 revert 指令。
- 正式拿卡時，先依 repo 規則執行 `task-lock.js check` 與 `task-lock.js lock`，並更新 frontmatter 的 status / started_at / started_by_agent。

## Checklist

- [ ] Scope confirmed against master plan.
- [ ] Atomic table impact checked.
- [ ] Implementation completed.
- [ ] Validation command executed.
- [ ] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 完成 atomize/infect dry-run planner，evidence.mutates=[] 與 rollback/review gate | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: codex-gpt-5 接手 C# dry-run planner | 阻塞: none
2026-05-20 | 狀態: open | 驗證: pending | 變更: opened C# dry-run planner task card | 阻塞: none
