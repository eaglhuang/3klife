---
doc_id: doc_other_asr_0011
task_id: TASK-ASR-0011
title: command-specs 38 spec per-file split
layer: L2-complete
status: done
blocked_by: [TASK-ASR-0004]
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate:cli
public_tracking: false
allowed_files:
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/commands/command-specs/*.spec.ts
  - scripts/split-command-specs.ts
created_at: 2026-05-20T04:00:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
started_at: 2026-05-20T04:00:00+08:00
started_by_agent: ClaudeCode_Sonnet4.6
completed_at: 2026-05-20T05:00:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: 779f74e
lastTransitionId: 2026-05-21T10-29-44-194Z-migrate-legacy-ledger-8b47d2d2984f
lastTransitionAt: 2026-05-21T10:29:44.194Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.194Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:71020ca029eb7354f7c81008ec529fdd1762908650ac383699c984598597c3b9
---

# TASK-ASR-0011 — command-specs 38 spec per-file split

## 目標

按 command-specs.SPLIT_PLAN.md。把 command-specs.ts 的 38 個 spec 逐一拆到各自的 `<name>.spec.ts` 檔案，command-specs.ts 縮減為只做 import + assemble + accessors（~80 行）。

## 背景

- `_common.ts` 已在 TASK-ASR-0004 完成
- command-specs.ts 目前 862 行，包含 38 個 spec 的全部定義
- Acceptance gate：`validate:cli` ok（6 個 help snapshot + 27 command help exit 0）

## 執行策略

用 `scripts/split-command-specs.ts` 自動拆分（不手動），原因：
- 38 個 spec 手動拆分容易出錯
- 腳本可以精確提取每個 spec 的內容並保留格式

## 驗收條件

- [x] `npm run validate:cli` ok（help snapshots 不變，27 commands）
- [x] `npm run typecheck` 0 errors
- [x] `npm run validate:quick` ok 4/4
- [x] command-specs.ts 行數 99 行（< 100，只剩 import + assemble + accessors）
- [x] I1 public CLI surface 不變

## Invariant

| Invariant | 說明 | 策略 |
|-----------|------|------|
| I1 Public CLI surface | help snapshot（explain, next, orient, start, guide, upgrade）| validate:cli 驗收 |
