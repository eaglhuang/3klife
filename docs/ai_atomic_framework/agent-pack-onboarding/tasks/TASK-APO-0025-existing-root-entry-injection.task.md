---
doc_id: doc_other_0646
task_id: TASK-APO-0025
title: 既有 README / AGENTS 的 loop-free ATM 入口注入
milestone: M4
status: done
blocked_by: [TASK-APO-0007, TASK-APO-0008]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: implemented-upstream-change
allowed_files:
  - packages/plugin-governance-local/src/index.ts
  - packages/cli/src/commands/init.ts
  - packages/cli/src/commands/bootstrap.ts
  - scripts/validate-bootstrap.ts
  - scripts/validate-cli.ts
  - examples/agent-bootstrap/**
  - templates/root-drop/AGENTS.md
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不覆蓋 host repo 既有 README 全文。
  - 不讓 README 反向要求先讀 AGENTS 形成 loop。
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex-gpt-5
completed_at: 2026-05-18T00:00:00+08:00
---

# TASK-APO-0025 既有 README / AGENTS 的 loop-free ATM 入口注入

## 背景

`bootstrap` / `init --adopt default` 不應只假設 host repo 是空白專案。真實 adopter 通常已經有 root `README.md`、`AGENTS.md` 或其他 agent instruction 檔案；如果 ATM 只產生 `.atm/` 與一份通用 `AGENTS.md`，Agent 可能只讀到原本的 README 而完全不知道要啟動 ATM。

本任務把 root-level entry surface 納入正式 onboarding：既有 README 要直接導向 `node atm.mjs next --json`，既有 AGENTS 要保留使用者原文並補上 ATM kickoff，且兩者不得互相跳轉形成 loop。

## 前置依賴

- TASK-APO-0007
- TASK-APO-0008

## 輸入

- `ATM引導工程計畫書.md` 第 3.6.1 節與 M4 規則。
- `plugin-governance-local` 的 root-drop adoption 流程。
- 既有 repo 的四種 root entry 情境：README only、AGENTS only、README + AGENTS、none。

## 輸出

1. `bootstrap` / `init` 會偵測既有 root `README.md` 與 `AGENTS.md`。
2. 既有 `AGENTS.md` 會被插入受控 ATM entry block，不覆蓋原文。
3. 既有 `README.md` 會被插入受控 AI Agent Entry block，直接導向 `node atm.mjs next --json`。
4. `validate-bootstrap` 覆蓋四種 root entry 情境，驗證 idempotent 與 non-loop。

## 驗收條件

- [x] `init --adopt default` / `bootstrap` 對 README-only host 會加入 ATM quick-start 入口。
- [x] `init --adopt default` / `bootstrap` 對 AGENTS-only host 會加入 kickoff block，並保留原內容。
- [x] README + AGENTS 同時存在時，README 直接導向 `node atm.mjs next --json`，不要求回讀 AGENTS。
- [x] 第二次 bootstrap / init 在無變更時保持 idempotent，回報 unchanged。
- [x] `validate-bootstrap` / `validate-cli` 已覆蓋 fixture 與 CLI 行為。

## 觸及檔案

- `packages/plugin-governance-local/src/index.ts`
- `scripts/validate-bootstrap.ts`
- `scripts/validate-cli.ts`

## 驗證方式

```bash
npm run validate:bootstrap
npm run validate:cli
npm run validate:standard
```

## 實作摘要

- 新增 `<!-- ATM ROOT ENTRY:START -->` / `<!-- ATM ROOT ENTRY:END -->` 管理區塊，用於既有 `AGENTS.md`。
- 新增 `<!-- ATM README ENTRY:START -->` / `<!-- ATM README ENTRY:END -->` 管理區塊，用於既有 `README.md`。
- README entry 只導向 `node atm.mjs next --json`，避免 README 與 AGENTS 互相要求重讀。
- `validate-bootstrap` 新增 README only、AGENTS only、README + AGENTS、none 四種情境。

## Checklist

- [x] README injection policy
- [x] AGENTS injection policy
- [x] non-loop wording
- [x] idempotent fixture coverage
- [x] bootstrap / init validator

## Notes

2026-05-18 | 狀態: done | 驗證: `npm run validate:bootstrap`, `npm run validate:cli`, `npm run validate:standard` 全數通過 | 變更: root README / AGENTS 入口注入已納入 bootstrap adoption，並以受控 marker 保持可重跑、可 diff、可保留使用者原文 | 關聯: TASK-APO-0007 / TASK-APO-0008
