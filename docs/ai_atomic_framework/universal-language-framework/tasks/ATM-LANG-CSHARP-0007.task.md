---
doc_id: doc_other_0950
task_id: ATM-LANG-CSHARP-0007
title: validate-language-csharp validator
atomic_map: ATM-MAP-LANG-CSHARP-0007
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
  - ATM-LANG-TABLE-0006
  - ATM-LANG-TABLE-0007
  - ATM-LANG-TABLE-0009
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0006
allowed_files:
  - scripts/validate-language-csharp.ts
  - packages/language-csharp/**
  - tests/fixtures/language-csharp/**
  - tests/atm-lang-csharp.test.ts
  - package.json
  - docs/ai_atomic_framework/universal-language-framework/**
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不在 validator script 實作 C# parser。
  - 不把 C# validator 預設掛進 release gate，除非 C# package 已完成 fixture baseline。
  - 不執行 dotnet、MSBuild 或 Unity Editor。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: open | 驗證: pending | 變更: opened validate-language-csharp validator task card | 阻塞: none"
---

# ATM-LANG-CSHARP-0007 validate-language-csharp validator

## Background

本任務建立 C# future adapter 的專屬 validator。validator 負責檢查 skeleton、profile detection、source inventory、risk model、diagnostics parser 與 dry-run planner 的 fixture baseline，但不把 C# 直接升級成正式支援語言。

## Dependencies

- ATM-LANG-CSHARP-0006

## Inputs

- C# adapter package
- C# fixture baseline
- Existing validator facade conventions
- Atomic Map：ATM-MAP-LANG-CSHARP-0007
- 相關表格：ATM-LANG-TABLE-0006、ATM-LANG-TABLE-0007、ATM-LANG-TABLE-0009、ATM-LANG-TABLE-0010

## Outputs

- [ ] `scripts/validate-language-csharp.ts`
- [ ] `npm run validate:language-csharp`
- [ ] validator fixture assertions
- [ ] failure mode summary

## Acceptance Criteria

- [ ] validator script 必須是 thin facade，只能呼叫 package module。
- [ ] validator 必須覆蓋 capability、profile detection、inventory、risk、diagnostics、dry-run fixture。
- [ ] validator 必須確認 C# support level 仍是 future / experimental / partial。
- [ ] validator 不得執行 dotnet、MSBuild、Unity Editor 或修改 host project。
- [ ] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- scripts/validate-language-csharp.ts
- packages/language-csharp/**
- tests/fixtures/language-csharp/**
- tests/atm-lang-csharp.test.ts
- package.json

## Atomic Maps Tables

- ATM-LANG-TABLE-0006
- ATM-LANG-TABLE-0007
- ATM-LANG-TABLE-0009
- ATM-LANG-TABLE-0010

## Validation Commands

```bash
npm run validate:language-csharp
```

## Implementation Notes

- `validate:language-csharp` 可先保持獨立，不一定立刻掛進 `validate:full`。
- 若後續要把 C# 納入 full gate，必須另外更新計畫書 support level 與 validator ownership。
- 正式拿卡時，先依 repo 規則執行 `task-lock.js check` 與 `task-lock.js lock`，並更新 frontmatter 的 status / started_at / started_by_agent。

## Checklist

- [ ] Scope confirmed against master plan.
- [ ] Atomic table impact checked.
- [ ] Implementation completed.
- [ ] Validation command executed.
- [ ] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:guide（PASS）; npm run validate:full（PASS） | 變更: 完成 validate-language-csharp、fixture baseline 與 full validator 接線 | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: codex-gpt-5 接手 validate-language-csharp validator | 阻塞: none
2026-05-20 | 狀態: open | 驗證: pending | 變更: opened validate-language-csharp validator task card | 阻塞: none
