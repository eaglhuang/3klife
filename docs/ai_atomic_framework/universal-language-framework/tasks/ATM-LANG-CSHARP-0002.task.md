---
doc_id: doc_other_0945
task_id: ATM-LANG-CSHARP-0002
title: .sln / .csproj profile detection
atomic_map: ATM-MAP-LANG-CSHARP-0002
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
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-CSHARP-0001
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
  - 不呼叫 dotnet restore/build/test。
  - 不解析完整 MSBuild evaluation graph。
  - 不把 Unity/Cocos 專案證據當成 runtime introspection。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: open | 驗證: pending | 變更: opened .sln/.csproj profile detection task card | 阻塞: none"
---

# ATM-LANG-CSHARP-0002 .sln / .csproj profile detection

## Background

本任務建立 C# 專案形態偵測。ATM 需要先知道 workspace 裡是否有 `.sln`、`.csproj`、`Directory.Build.props` 或 Unity/Cocos 類型證據，才能決定 C# adapter 可以提供哪些保守能力。

## Dependencies

- ATM-LANG-CSHARP-0001

## Inputs

- C# adapter package skeleton
- 主計畫書 §10.2 / §10.4 的 C# feasibility notes
- Atomic Map：ATM-MAP-LANG-CSHARP-0002
- 相關表格：ATM-LANG-TABLE-0006、ATM-LANG-TABLE-0010

## Outputs

- [ ] profile detection module
- [ ] `.sln` fixture
- [ ] `.csproj` fixture
- [ ] `Directory.Build.props` fixture
- [ ] Unity-style evidence fixture

## Acceptance Criteria

- [ ] 偵測結果可列出 solution、project、build props 與 Unity/Cocos 類型 evidence。
- [ ] 偵測只讀檔案，不執行 dotnet、MSBuild、Unity Editor 或 Cocos Editor。
- [ ] profile result 必須能明確標示 confidence 與 unsupported reason。
- [ ] Unity/Cocos evidence 只能作為 profile hint，不得變成 runtime introspection。
- [ ] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- packages/language-csharp/src/csharp-profile.ts
- tests/fixtures/language-csharp/**
- tests/atm-lang-csharp.test.ts

## Atomic Maps Tables

- ATM-LANG-TABLE-0006
- ATM-LANG-TABLE-0010

## Validation Commands

```bash
npm run validate:language-csharp
```

## Implementation Notes

- `.csproj` 可先用 XML parser 或 deterministic text scanner，但輸出欄位要穩定。
- profile detection 不應假設真實 C# 專案已打開；fixture 足以驗證第一版行為。
- 正式拿卡時，先依 repo 規則執行 `task-lock.js check` 與 `task-lock.js lock`，並更新 frontmatter 的 status / started_at / started_by_agent。

## Checklist

- [ ] Scope confirmed against master plan.
- [ ] Atomic table impact checked.
- [ ] Implementation completed.
- [ ] Validation command executed.
- [ ] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 完成 .sln/.csproj/Directory.Build.props/Unity evidence profile detection | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: codex-gpt-5 接手 .sln/.csproj profile detection | 阻塞: none
2026-05-20 | 狀態: open | 驗證: pending | 變更: opened .sln/.csproj profile detection task card | 阻塞: none
