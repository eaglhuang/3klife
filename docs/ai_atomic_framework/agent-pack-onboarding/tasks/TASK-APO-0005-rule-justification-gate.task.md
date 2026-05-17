---
doc_id: doc_other_0156
task_id: TASK-APO-0005
title: Rule Justification Gate
milestone: M4
status: done
blocked_by: [TASK-APO-0004]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/plugin-rule-guard/**
  - packages/core/src/upgrade/**
  - packages/cli/src/commands/verify.ts
  - tests/**
  - fixtures/**
forbidden_files:
  - packages/agent-pack-*/**
  - assets/**
non_goals:
  - 不改 ATMChart render 格式
  - 不實作 MRP equivalence gate
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
started_at: 2026-05-17T23:30:00+08:00
started_by_agent: vs-insiders-claude-sonnet-4.6
---

# TASK-APO-0005 — Rule Justification Gate

## 目標

擴充規則守衛：當 agent 或人類流程違反 default guard 時，必須在 evidence 中提供 `justification`，否則 `atm verify` 或對應 gate 應非零 exit 並指出缺少的說明欄位。

## 前置依賴

- TASK-APO-0004

## 輸入

- 計畫書 §12、§14.3、§15/M4。
- MRP M5 的 evidence gate / justification pattern。

## 輸出

1. `packages/plugin-rule-guard/` 或等價 guard layer 要求 `justification`。
2. 缺 justification 時，輸出 `requiredJustification` 或同等 machine-readable 欄位。
3. 至少一個 negative fixture 證明 gate 真的會擋。
4. 與 MRP `upgrade/propose.ts` evidence gate 行為一致。

## 驗收條件

- [x] `packages/plugin-rule-guard/` 違反守衛時要求 evidence 含 `justification` 欄位。
- [x] 缺 justification 時 `atm verify` 非零 exit code，並輸出 `requiredJustification` 欄位。
- [x] 至少 1 個 negative fixture 證明 gate 真的會擋。
- [x] 與 MRP M5 的 `upgrade/propose.ts` evidence gate 行為一致（複用 justification pattern）。

## 影響檔案

- `packages/plugin-rule-guard/**`
- `packages/cli/src/commands/verify.ts`
- `packages/core/src/upgrade/**`
- `tests/**`
- `fixtures/**`

## 驗證方式

```bash
cmd /c npm run validate:standard
```

## 回滾策略

移除 justification requirement 與 negative fixture；保留 ATMChart freshness gate 不受影響。

## Checklist

- [x] gate contract
- [x] CLI error shape
- [x] negative fixture
- [x] MRP pattern alignment

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M4 開卡，將 rule gate 語意收斂為 Rule Justification Gate | 阻塞: TASK-APO-0004
2026-05-18 | 狀態: done | 驗證: validate:standard 38/38 pass | 變更: rule-justification.ts, verify --guards --evidence, shared.ts guards/evidence options, 2 fixtures, validate-cli.ts tests | 阻塞: none | commit: AI-Atomic-Framework 9ef5dda