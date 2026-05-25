---
doc_id: doc_other_1320
task_id: TASK-AAO-0002
title: CLI command spec / runner SSOT drift guard
milestone: M1
status: open
blocked_by:
  - TASK-AAO-0001
  - TASK-ASA-0009
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/commands/command-specs/**
  - scripts/validate-cli.ts
  - tests/cli/**
  - docs/**
forbidden_files:
  - packages/core/**
  - new CLI framework adoption
  - breaking public command rename without fixture migration
non_goals:
  - 不導入 commander、citty 或其他新 CLI framework
  - 不改變既有 command semantics
  - 不把 internal command 直接公開成穩定 surface
doc_refs:
  - doc_other_0028
  - doc_other_0035
  - doc_other_0037
  - doc_other_1001
created_at: 2026-05-25T09:00:00+08:00
created_by_agent: codex
---

# TASK-AAO-0002 — CLI command spec / runner SSOT drift guard

## 目標

把 `cliCommandRunners`、`commandSpecs` 與 `help --json` 對齊成單一真相來源，並建立自動 drift guard。

## 背景

repo 目前已經有宣告式 `commandSpecs`，但 runner 與 spec 數量不一致。  
AAO 需要先把這個差距正式納管，讓 Agent 不會因為 help、spec、runner 三套列表不一致而誤判能力範圍。

## 阻塞

- `TASK-AAO-0001`
- `TASK-ASA-0009`

## 參考

- `packages/cli/src/atm.ts`
- `packages/cli/src/commands/command-specs.ts`
- `scripts/validate-cli.ts`

## 交付物

- runner / spec / help 的一致性契約
- runner-only 命令清單與處置策略
- 自動化 drift guard 驗證

## 驗收條件

- [ ] `cliCommandRunners` 的 key 全部能對應到 spec 或明確標記 internal
- [ ] `node atm.mjs help --json` 與 spec registry 不再漂移
- [ ] validator 能指出缺 spec、缺 runner 或 help 不一致的具體命令
- [ ] 不引入新的 CLI framework

## 作用範圍

- `packages/cli/src/atm.ts`
- `packages/cli/src/commands/command-specs.ts`
- `packages/cli/src/commands/command-specs/**`
- `scripts/validate-cli.ts`
- `tests/cli/**`

## 驗證命令

```bash
npm run validate:cli
npm run typecheck
node atm.mjs help --json
```

## 回滾方式

若 drift guard 方案不合適，回滾 command spec registry 與 validator 變更，保留既有 command 行為。

## Notes

2026-05-25 | 狀態: open | 驗證: pending | 變更: 待建立 runner/spec/help SSOT drift guard | 阻塞: TASK-AAO-0001, TASK-ASA-0009

