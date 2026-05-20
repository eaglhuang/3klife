---
doc_id: doc_other_0934
task_id: ATM-LANG-0902
title: English guide: Go atom/map development example
atomic_map: ATM-MAP-LANG-0900
milestone: M6
status: done
started_at: 2026-05-20T16:19:58+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T16:23:48+08:00
owner: atm-core
priority: P1
type: docs
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:guide
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0008
depends:
  - ATM-LANG-0901
allowed_files:
  - docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
forbidden_files:
  - assets/**
  - library/**
  - temp/**
  - profiles/**
  - settings/**
non_goals:
  - 不建立第二套 active ATM task state。
  - 不把 3KLife 遊戲 runtime 規則寫入 ATM framework contract。
  - 不繞過主計畫書 §5.1 的 Atomic Maps table registry。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:guide（PASS） | 變更: Go capability atom table 與 atomic map YAML（members/edges/entrypoints）完成 | 阻塞: none"
---

# ATM-LANG-0902 English guide: Go atom/map development example

## Background

本任務屬於 ATM-MAP-LANG-0900，用來把 ATM 通用語言框架計畫書中的對應能力落成可交辦工作。它的核心責任是守住 owned surface、Atomic Maps table traceability，以及 upstream AI-Atomic-Framework 的語言中立邊界。

## Dependencies

- ATM-LANG-0901

## Inputs

- 主計畫書：docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
- 英文 companion：docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
- Atomic Map：ATM-MAP-LANG-0900
- 相關表格：ATM-LANG-TABLE-0008

## Outputs

- [x] Go capability atoms table
- [x] Go atomic map YAML example
- [x] members/edges/entrypoints explanation

## Acceptance Criteria

- [x] owned surface 與主計畫書、tasks/README.md 完全一致。
- [x] 相關 Atomic Maps table 已更新，或在 Notes 明確標記本卡不需更新表格。
- [x] 若有程式或 schema 變更，核心邏輯落在 package module / atomized implementation，不落在 CLI/script facade。
- [x] 若有 public-facing 文件變更，文件仍維持 ATM framework 中立，不引用採用者私有語意。
- [x] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md

## Atomic Maps Tables

- ATM-LANG-TABLE-0008

## Validation Commands

```bash
npm run validate:guide
```

## Implementation Notes

- 強調 adapter 不應是一支大型 script。
- 正式拿卡時，先依 repo 規則執行 task-lock.js check 與 task-lock.js lock，並更新 frontmatter 的 status / started_at / started_by_agent。
- 若任務需要跨出 allowed_files，先回主計畫書補 contract delta 或拆 coordination task。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0900 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start Go atom/map guide example | 阻塞: none
2026-05-20 | 狀態: done | 驗證: npm run validate:guide（PASS） | 變更: Go atom/map development example 完成，強調 adapter 不應成為單支大型 script | 阻塞: none
