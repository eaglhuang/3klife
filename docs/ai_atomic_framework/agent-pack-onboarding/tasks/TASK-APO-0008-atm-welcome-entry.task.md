---
doc_id: doc_other_0159
task_id: TASK-APO-0008
title: atm welcome 一鍵入口
milestone: M7
status: open
blocked_by: [TASK-APO-0003, TASK-APO-0004]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/welcome.ts
  - packages/cli/src/commands/doctor.ts
  - schemas/governance/welcome-lineage.schema.json
  - scripts/validate-cli.ts
  - examples/agent-onboarding-flow/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不取代 `atm next --json`
  - 不處理 npm publish
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0008 — atm welcome 一鍵入口

## 目標

新增 `atm welcome` first-touch entry，摘要 ATMChart、已安裝 agent packs / integrations 與 `atm next --json` 建議動作，並記錄 welcome lifecycle。

## 前置依賴

- TASK-APO-0003
- TASK-APO-0004

## 輸入

- 計畫書 §6.4、§7、§15/M7。
- ATMChart summary loader 與 integration health API。

## 輸出

1. `packages/cli/src/commands/welcome.ts`。
2. `.atm/runtime/welcome.lineage.json` schema。
3. `--dry-run` 模式不寫入任何檔案。
4. welcome 完成後仍提示 agent 呼叫 `atm next --json`。

## 驗收條件

- [ ] `packages/cli/src/commands/welcome.ts` 存在。
- [ ] `atm welcome` 印出 ATMChart 摘要 + agent-pack 狀態 + `atm next --json` 建議。
- [ ] `--dry-run` 不寫入任何檔案。
- [ ] `.atm/runtime/welcome.lineage.json` 記錄首次 welcome 時間戳。
- [ ] welcome 不取代 `atm next`：印完摘要後仍提示 agent 呼叫 `atm next --json`。

## 影響檔案

- `packages/cli/src/commands/welcome.ts`
- `packages/cli/src/atm.ts`
- `schemas/governance/welcome-lineage.schema.json`
- `scripts/validate-cli.ts`
- `examples/agent-onboarding-flow/**`

## 驗證方式

```bash
cmd /c npm run validate:cli
cmd /c npm run validate:examples
cmd /c npm run validate:standard
```

## 回滾策略

移除 welcome command、lineage schema 與 CLI validator assertions；保留 ATMChart command。

## Checklist

- [ ] command
- [ ] dry-run
- [ ] lineage schema
- [ ] next action prompt
- [ ] e2e example

## Notes

2026-05-17 | 狀態: open | 驗證: pending | 變更: 依計畫書 §15/M7 開卡，採 ATMChart 新命名 | 阻塞: TASK-APO-0003 / TASK-APO-0004