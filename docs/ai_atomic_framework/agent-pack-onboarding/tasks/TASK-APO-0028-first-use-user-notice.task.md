---
doc_id: doc_other_0713
task_id: TASK-APO-0028
title: First-Use User Notice and Suggested Actions
milestone: M4
status: done
blocked_by: [TASK-APO-0027]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:bootstrap
public_tracking: false
executionMode: implemented-upstream-change
allowed_files:
  - packages/cli/src/commands/first-use-notice.ts
  - packages/cli/src/commands/next.ts
  - packages/cli/src/commands/welcome.ts
  - templates/skills/atm-next.skill.md
  - scripts/validate-bootstrap.ts
  - scripts/validate-skill-templates.ts
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不要求使用者知道 ATM 指令或入口規則。
  - 不實作 Codex / editor 原生彈窗 UI。
  - 不建立第二套 task model 或 agent flow。
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
completed_at: 2026-05-19T00:00:00+08:00
lastTransitionId: 2026-05-21T10-29-44-179Z-migrate-legacy-ledger-34ad0df30991
lastTransitionAt: 2026-05-21T10:29:44.179Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.179Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:cbd44cf70a79a11e61df4ec9d593ab2e8deb436888829b3f5b1e27f31f41f25d
---

# TASK-APO-0028 First-Use User Notice and Suggested Actions

## 背景

APO-0025 / APO-0027 讓既有 repo 能被補上入口文件與 root `atm.mjs` runner，但真實使用者通常不會下「請依照 ATM 入口接手」這種提示。他們只會用自然口語要求 Agent 做功能、查進度或修 bug。

因此 ATM official onboarding 需要一個平台無關的 first-use notice contract：當 Agent 透過 `node atm.mjs next --json` 發現 repo 已經具備 ATM 治理入口，但使用者還沒有被自然告知時，CLI 應回傳一段人類可讀提示與建議動作，讓 Agent 可以用一句話自然轉述，而不是要求使用者背框架規則。

## 前置依賴

- TASK-APO-0027

## 輸入

- `atm next --json` 的 deterministic next action。
- `atm welcome --json` 的 first-touch summary。
- agent integration template 的 `atm-next` entry。

## 輸出

1. `atm next --json` 在 first-use 狀態下回傳 `evidence.userNotice`。
2. `userNotice` 包含 stable id、display policy、agent instruction、natural-language prompts 與 suggested actions。
3. `atm welcome --json` 會帶出同一份 notice，避免 welcome / next 兩套提示語漂移。
4. `atm-next` skill template 要求 Agent 若看到 `evidence.userNotice`，先用自然語言短句顯示給使用者，再繼續執行 deterministic next action。
5. deterministic validator 覆蓋 bootstrap 後第一次 `next` 與 template instruction。

## 驗收條件

- [x] 第一次 bootstrap 後執行 `next`，會在 `needs-onboarding-refresh` 路徑回傳 `userNotice`。
- [x] `userNotice.schemaVersion` 為 `atm.userNotice.v0.1`。
- [x] `userNotice.suggestedActions[0].value` 與 `nextAction.command` 一致。
- [x] `userNotice.suggestedPrompts` 包含自然語言功能探索提示。
- [x] `atm-next` template 明確要求 Agent 轉述 `evidence.userNotice`。

## 觸及檔案

- `packages/cli/src/commands/first-use-notice.ts`
- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/welcome.ts`
- `templates/skills/atm-next.skill.md`
- `scripts/validate-bootstrap.ts`
- `scripts/validate-skill-templates.ts`

## 驗證方式

```bash
node --experimental-strip-types scripts/validate-bootstrap.ts --mode validate
node --experimental-strip-types scripts/validate-skill-templates.ts --mode validate
npm run build
```

## 實作摘要

- 新增 `first-use-notice.ts`，定義 `atm.userNotice.v0.1` 的平台無關通知契約。
- `next` 在 `needs-bootstrap`、`needs-onboarding-refresh`、`needs-guidance-start` 狀態輸出 `userNotice`。
- `welcome` 直接轉送 `next` 的 `userNotice`，保持單一來源。
- `atm-next` skill template 補上 Agent 行為規則：看到 notice 時要自然轉述給使用者。

## Checklist

- [x] first-use notice contract
- [x] `next` evidence wiring
- [x] `welcome` evidence wiring
- [x] agent template instruction
- [x] bootstrap fixture coverage

## Notes

2026-05-19 | 狀態: done | 驗證: `validate-bootstrap`、`validate-skill-templates` 通過；`npm run build` 受 upstream 既有 dirty file `packages/core/src/source-inventory/source-inventory.ts` 型別錯誤阻擋 | 變更: ATM 現在可用 `userNotice` 讓 Agent 在自然語言任務中主動提示使用者 ATM 治理已可用 | 關聯: TASK-APO-0027
