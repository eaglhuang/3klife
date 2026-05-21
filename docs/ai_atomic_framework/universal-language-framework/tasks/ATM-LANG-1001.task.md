---
doc_id: doc_other_0937
task_id: ATM-LANG-1001
title: PHP dynamic include RFC
atomic_map: ATM-MAP-LANG-1000
milestone: M6
status: done
started_at: 2026-05-20T16:30:57.9936763+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T16:34:02.4629933+08:00
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
  - ATM-LANG-1000
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
notes: "2026-05-20 | 狀態: done | 驗證: npm run validate:neutrality（failed: Missing script）; npm run validate:guide（PASS）; npm run check:encoding:touched（PASS） | 變更: 補齊 PHP dynamic include RFC、advisory symbol policy、future constraints | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-386Z-migrate-legacy-ledger-ed40be39ecd3
lastTransitionAt: 2026-05-21T10:29:44.386Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.386Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:718b7e6df1ff4d8a765105302179f709895a1228130c9ccd8bf6b128dfe10f35
---

# ATM-LANG-1001 PHP dynamic include RFC

## Background

本任務屬於 ATM-MAP-LANG-1000，用來把 ATM 通用語言框架計畫書中的對應能力落成可交辦工作。它的核心責任是守住 owned surface、Atomic Maps table traceability，以及 upstream AI-Atomic-Framework 的語言中立邊界。

## Dependencies

- ATM-LANG-1000

## Inputs

- 主計畫書：docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
- 英文 companion：docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
- Atomic Map：ATM-MAP-LANG-1000
- 相關表格：ATM-LANG-TABLE-0010

## Outputs

- [x] PHP include/autoload risks
- [x] advisory symbol resolution policy
- [x] future adapter constraints

## Acceptance Criteria

- [x] owned surface 與主計畫書、tasks/README.md 完全一致。
- [x] 相關 Atomic Maps table 已更新，或在 Notes 明確標記本卡不需更新表格。
- [x] 若有程式或 schema 變更，核心邏輯落在 package module / atomized implementation，不落在 CLI/script facade。
- [x] 若有 public-facing 文件變更，文件仍維持 ATM framework 中立，不引用採用者私有語意。
- [x] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md

## Atomic Maps Tables

- ATM-LANG-TABLE-0010

## Validation Commands

```bash
npm run validate:neutrality
```

## Implementation Notes

- PHP dynamic include 風險要明確寫成 RFC，不要混入 core contract。
- 正式拿卡時，先依 repo 規則執行 task-lock.js check 與 task-lock.js lock，並更新 frontmatter 的 status / started_at / started_by_agent。
- 若任務需要跨出 allowed_files，先回主計畫書補 contract delta 或拆 coordination task。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:neutrality（failed: Missing script）; npm run validate:guide（PASS）; npm run check:encoding:touched（PASS） | 變更: PHP dynamic include RFC 與 unresolved include policy 完成 | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: codex-gpt-5 接手 PHP dynamic include RFC | 阻塞: none
2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-1000 delivery | 阻塞: none
