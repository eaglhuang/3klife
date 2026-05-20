---
doc_id: doc_other_0936
task_id: ATM-LANG-1000
title: Java/C#/Go adapter feasibility notes
atomic_map: ATM-MAP-LANG-1000
milestone: M6
status: open
owner: atm-core
priority: P1
type: docs
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:neutrality
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0010
depends:
  - ATM-LANG-0903
allowed_files:
  - docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
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
notes: "2026-05-20 | 狀態: open | 驗證: pending | 變更: 由 ATM 通用語言框架計畫書開立 | 阻塞: none"
---

# ATM-LANG-1000 Java/C#/Go adapter feasibility notes

## Background

本任務屬於 ATM-MAP-LANG-1000，用來把 ATM 通用語言框架計畫書中的對應能力落成可交辦工作。它的核心責任是守住 owned surface、Atomic Maps table traceability，以及 upstream AI-Atomic-Framework 的語言中立邊界。

## Dependencies

- ATM-LANG-0903

## Inputs

- 主計畫書：docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
- 英文 companion：docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
- Atomic Map：ATM-MAP-LANG-1000
- 相關表格：ATM-LANG-TABLE-0010

## Outputs

- [ ] Java feasibility notes
- [ ] C# feasibility notes
- [ ] Go future status notes

## Acceptance Criteria

- [ ] owned surface 與主計畫書、tasks/README.md 完全一致。
- [ ] 相關 Atomic Maps table 已更新，或在 Notes 明確標記本卡不需更新表格。
- [ ] 若有程式或 schema 變更，核心邏輯落在 package module / atomized implementation，不落在 CLI/script facade。
- [ ] 若有 public-facing 文件變更，文件仍維持 ATM framework 中立，不引用採用者私有語意。
- [ ] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md

## Atomic Maps Tables

- ATM-LANG-TABLE-0010

## Validation Commands

```bash
npm run validate:neutrality
```

## Implementation Notes

- 不得宣稱 Java/C#/Go 已正式支援。
- 正式拿卡時，先依 repo 規則執行 task-lock.js check 與 task-lock.js lock，並更新 frontmatter 的 status / started_at / started_by_agent。
- 若任務需要跨出 allowed_files，先回主計畫書補 contract delta 或拆 coordination task。

## Checklist

- [ ] Scope confirmed against master plan.
- [ ] Atomic table impact checked.
- [ ] Implementation or document update completed.
- [ ] Validation command executed.
- [ ] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-1000 delivery | 阻塞: none
