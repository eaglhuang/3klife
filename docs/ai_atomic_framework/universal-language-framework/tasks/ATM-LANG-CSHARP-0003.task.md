---
doc_id: doc_other_0946
task_id: ATM-LANG-CSHARP-0003
title: C# source inventory and symbol range
atomic_map: ATM-MAP-LANG-CSHARP-0003
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
  - ATM-LANG-CSHARP-0002
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
  - 不建立完整 Roslyn semantic model。
  - 不跨檔推導真實 call graph。
  - 不改寫 C# source。
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5
notes: "2026-05-20 | 狀態: open | 驗證: pending | 變更: opened C# source inventory and symbol range task card | 阻塞: none"
lastTransitionId: 2026-05-21T10-29-44-395Z-migrate-legacy-ledger-5d1f686bd9b1
lastTransitionAt: 2026-05-21T10:29:44.395Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.395Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:268e92f8a22bf67a8ff22416237f29766d7796e054538dbd42b19b3c3dd859fc
---

# ATM-LANG-CSHARP-0003 C# source inventory and symbol range

## Background

本任務建立 C# source inventory 的第一版能力。它的目標是讓 ATM 能穩定知道 `.cs` 檔裡有哪些 namespace、type、method、property 或 field，並回傳可用於 dry-run 報告的 source range。

## Dependencies

- ATM-LANG-CSHARP-0002

## Inputs

- C# profile detection result
- Adapter source inventory schema
- Atomic Map：ATM-MAP-LANG-CSHARP-0003
- 相關表格：ATM-LANG-TABLE-0006、ATM-LANG-TABLE-0010

## Outputs

- [ ] C# source inventory module
- [ ] symbol id normalization rule
- [ ] source range extraction
- [ ] fixture covering namespace, class, interface, enum, struct, method, property, field

## Acceptance Criteria

- [ ] `scanSourceInventory` 可回傳檔案、symbol、symbol kind、normalized id 與 source range。
- [ ] source range 必須包含 start/end line 與足夠的 evidence。
- [ ] inventory 不需要完整 semantic binding，但必須對 fixture deterministic。
- [ ] 無法安全解析時，回傳 degraded capability 與 reason，而不是猜測成功。
- [ ] 完成前 Notes 寫入實際 validation command 與結果。

## Target Files / Surfaces

- packages/language-csharp/src/csharp-inventory.ts
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

- 第一版可以先以語法範圍與 fixture 為核心，不必進入完整 Roslyn compiler pipeline。
- symbol range 要服務 dry-run planner，所以欄位命名要與既有 adapter schema 對齊。
- 正式拿卡時，先依 repo 規則執行 `task-lock.js check` 與 `task-lock.js lock`，並更新 frontmatter 的 status / started_at / started_by_agent。

## Checklist

- [ ] Scope confirmed against master plan.
- [ ] Atomic table impact checked.
- [ ] Implementation completed.
- [ ] Validation command executed.
- [ ] Notes updated with validation evidence.

## Notes

2026-05-20 | 狀態: done | 驗證: npm run validate:language-csharp（PASS）; npm run validate:full（PASS） | 變更: 完成 C# source inventory、symbol range、dependency/call/artifact edge 掃描 | 阻塞: none
2026-05-20 | 狀態: in-progress | 驗證: pending | 變更: codex-gpt-5 接手 C# source inventory and symbol range | 阻塞: none
2026-05-20 | 狀態: open | 驗證: pending | 變更: opened C# source inventory and symbol range task card | 阻塞: none
