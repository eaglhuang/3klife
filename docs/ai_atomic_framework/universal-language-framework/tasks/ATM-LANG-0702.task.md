---
doc_id: doc_other_0926
task_id: ATM-LANG-0702
title: Python CLI/API/side-effect surface detection
atomic_map: ATM-MAP-LANG-0700
milestone: M5
status: done
started_at: 2026-05-20T15:51:06+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T15:58:07+08:00
owner: atm-core
priority: P1
type: implementation
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:python-adapter
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0006
depends:
  - ATM-LANG-0701
allowed_files:
  - packages/language-python/**
  - scripts/validate-python-adapter.ts
  - fixtures/python-adapter/**
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
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:python-adapter（PASS） | 變更: CLI entrypoint / API hint / side-effect runtime command detection 完成並納入 validator 檢查 | 阻塞: none"
---

# ATM-LANG-0702 Python CLI/API/side-effect surface detection

## Background

本任務屬於 ATM-MAP-LANG-0700，用來把 ATM 通用語言框架計畫書中的對應能力落成可交辦工作。它的核心責任是守住 owned surface、Atomic Maps table traceability，以及 upstream AI-Atomic-Framework 的語言中立邊界。

## Dependencies

- ATM-LANG-0701

## Inputs

- 主計畫書：docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
- 英文 companion：docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
- Atomic Map：ATM-MAP-LANG-0700
- 相關表格：ATM-LANG-TABLE-0006

## Outputs

- [x] CLI entrypoint detection
- [x] API surface hints
- [x] side-effect warning report

## Acceptance Criteria

- [x] owned surface 與主計畫書、tasks/README.md 完全一致。
- [x] 相關 Atomic Maps table 已更新，或在 Notes 明確標記本卡不需更新表格。
- [x] 若有程式或 schema 變更，核心邏輯落在 package module / atomized implementation，不落在 CLI/script facade。
- [x] 若有 public-facing 文件變更，文件仍維持 ATM framework 中立，不引用採用者私有語意。
- [x] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- packages/language-python/**
- scripts/validate-python-adapter.ts
- fixtures/python-adapter/**

## Atomic Maps Tables

- ATM-LANG-TABLE-0006

## Validation Commands

```bash
npm run validate:python-adapter
```

## Implementation Notes

- 不得執行 host Python code，只做 deterministic static analysis。
- 正式拿卡時，先依 repo 規則執行 task-lock.js check 與 task-lock.js lock，並更新 frontmatter 的 status / started_at / started_by_agent。
- 若任務需要跨出 allowed_files，先回主計畫書補 contract delta 或拆 coordination task。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0700 delivery | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: lock card and start Python CLI/API/side-effect surface detection implementation | 阻塞: none
2026-05-20 | 狀態: done | 驗證: npm run validate:python-adapter（PASS） | 變更: CLI/API/side-effect surface detection 完成並輸出 runtime command report | 阻塞: none
