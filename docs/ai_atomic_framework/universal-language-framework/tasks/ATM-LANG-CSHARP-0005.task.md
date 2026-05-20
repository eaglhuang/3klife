---
doc_id: doc_other_0948
task_id: ATM-LANG-CSHARP-0005
title: diagnostics parser fixture
atomic_map: ATM-MAP-LANG-CSHARP-0005
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
  - ATM-LANG-TABLE-0009
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0004
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
  - 不執行 compiler。
  - 不呼叫 dotnet build。
  - 不把 diagnostics parser 放進 script facade。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: open | 驗證: pending | 變更: opened diagnostics parser fixture task card | 阻塞: none"
---

# ATM-LANG-CSHARP-0005 diagnostics parser fixture

## Background

本任務建立 C# diagnostics parser 的 fixture-first 實作。ATM 需要把 Roslyn / MSBuild 常見輸出轉成中立 diagnostics schema，但第一版只解析已保存的 fixture，不啟動 compiler。

## Dependencies

- ATM-LANG-CSHARP-0004

## Inputs

- C# risk model
- Adapter diagnostics schema
- Atomic Map：ATM-MAP-LANG-CSHARP-0005
- 相關表格：ATM-LANG-TABLE-0006、ATM-LANG-TABLE-0009、ATM-LANG-TABLE-0010

## Outputs

- [ ] diagnostics parser module
- [ ] Roslyn diagnostic fixture
- [ ] MSBuild diagnostic fixture
- [ ] normalized diagnostic output fixture

## Acceptance Criteria

- [ ] parser 可抽出 severity、code、message、file、line、column。
- [ ] parser 對 fixture deterministic，且不依賴本機 dotnet 安裝。
- [ ] 無法解析的行要保留 raw evidence，不可靜默丟失。
- [ ] `validate:language-csharp` 必須呼叫 package parser，不得在 script 內重寫 parser。
- [ ] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- packages/language-csharp/src/csharp-diagnostics.ts
- tests/fixtures/language-csharp/diagnostics/**
- tests/atm-lang-csharp.test.ts

## Atomic Maps Tables

- ATM-LANG-TABLE-0006
- ATM-LANG-TABLE-0009
- ATM-LANG-TABLE-0010

## Validation Commands

```bash
npm run validate:language-csharp
```

## Implementation Notes

- 常見格式可涵蓋 `path(line,column): error CS0000: message` 與 MSBuild summary 行。
- script facade 只能載入 package module 後檢查輸出，不可持有解析規則。
- 正式拿卡時，先依 repo 規則執行 `task-lock.js check` 與 `task-lock.js lock`，並更新 frontmatter 的 status / started_at / started_by_agent。

## Checklist

- [ ] Scope confirmed against master plan.
- [ ] Atomic table impact checked.
- [ ] Implementation completed.
- [ ] Validation command executed.
- [ ] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 完成 Roslyn/MSBuild diagnostics parser fixture 與 deterministic parsing | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: codex-gpt-5 接手 diagnostics parser fixture | 阻塞: none
2026-05-20 | 狀態: open | 驗證: pending | 變更: opened diagnostics parser fixture task card | 阻塞: none
