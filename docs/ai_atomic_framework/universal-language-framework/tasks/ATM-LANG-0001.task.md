---
doc_id: doc_other_0903
task_id: ATM-LANG-0001
title: 繁中主規劃書與 atomic-map roadmap
atomic_map: ATM-MAP-LANG-0001
milestone: M1
status: done
started_at: 2026-05-20T12:35:00+08:00
started_by_agent: codex-gpt-5
completed_at: 2026-05-20T12:36:47+08:00
owner: atm-core
priority: P1
type: docs
related_plan: docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
english_companion: docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: manual-doc-review
public_tracking: false
executionMode: planned-upstream-change
atomic_tables:
  - ATM-LANG-TABLE-0001
  - ATM-LANG-TABLE-0002
depends:
  []
allowed_files:
  - docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
  - docs/ai_atomic_framework/universal-language-framework/tasks/README.md
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
notes: "2026-05-20 | 狀態: done | 驗證: manual document review + node tools_node/check-encoding-touched.js (passed) | 變更: 完成主計畫書/任務索引 Atomic Maps 規則降複雜度改版 | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-350Z-migrate-legacy-ledger-24c098837980
lastTransitionAt: 2026-05-21T10:29:44.350Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.350Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:8ddef4d83c452280844907f52042fdbe888a82c97da32da7a1ec44a6ef1246fa
---

# ATM-LANG-0001 繁中主規劃書與 atomic-map roadmap

## Background

本任務屬於 ATM-MAP-LANG-0001，用來把 ATM 通用語言框架計畫書中的對應能力落成可交辦工作。它的核心責任是守住 owned surface、Atomic Maps table traceability，以及 upstream AI-Atomic-Framework 的語言中立邊界。

## Dependencies

- 無

## Inputs

- 主計畫書：docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
- 英文 companion：docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md
- Atomic Map：ATM-MAP-LANG-0001
- 相關表格：ATM-LANG-TABLE-0001, ATM-LANG-TABLE-0002

## Outputs

- [x] 繁中主計畫書保留原始需求
- [x] Atomic Maps overview 與 table registry 完整
- [x] tasks/README.md 索引同步

## Acceptance Criteria

- [x] owned surface 與主計畫書、tasks/README.md 完全一致。
- [x] 相關 Atomic Maps table 已更新，或在 Notes 明確標記本卡不需更新表格。
- [x] 若有程式或 schema 變更，核心邏輯落在 package module / atomized implementation，不落在 CLI/script facade。
- [x] 若有 public-facing 文件變更，文件仍維持 ATM framework 中立，不引用採用者私有語意。
- [x] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- docs/ai_atomic_framework/universal-language-framework/ATM通用語言框架計畫書.md
- docs/ai_atomic_framework/universal-language-framework/tasks/README.md

## Atomic Maps Tables

- ATM-LANG-TABLE-0001
- ATM-LANG-TABLE-0002

## Validation Commands

```bash
manual document review + encoding guard
```

## Implementation Notes

- 主計畫書是中文 canonical plan，英文 companion 只能鏡像 adapter author 需要的部分。
- 正式拿卡時，先依 repo 規則執行 task-lock.js check 與 task-lock.js lock，並更新 frontmatter 的 status / started_at / started_by_agent。
- 若任務需要跨出 allowed_files，先回主計畫書補 contract delta 或拆 coordination task。

## Checklist

- [x] Scope confirmed against master plan.
- [x] Atomic table impact checked.
- [x] Implementation or document update completed.
- [x] Validation command executed.
- [x] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: open | 驗證: pending | 變更: opened full task card for ATM-MAP-LANG-0001 delivery | 阻塞: none
2026-05-20 | 狀態: done | 驗證: manual document review + node tools_node/check-encoding-touched.js (passed) | 變更: 主計畫書 §5.1 改為 Core Required/Optional Extension、tasks/README 同步覆蓋規則 | 阻塞: none
