---
doc_id: doc_other_0175
task_id: TASK-APO-0022
title: Bridge minor + @experimental API 通道
milestone: M9
status: open
blocked_by: [TASK-APO-0013]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - docs/BRIDGE_MINOR.md
  - docs/EXPERIMENTAL_API.md
  - packages/cli/src/commands/upgrade.ts
  - packages/agent-pack-sdk/src/experimental/**
  - scripts/validate-bridge-minor.ts
  - scripts/validators.config.json
  - tests/bridge-minor/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 取代既有 migration tooling（屬 TASK-APO-0013）
  - 提供具體的 0.x → 1.0 bridge release
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0022 — Bridge Minor + Experimental API

## 設計決策（已採 Option A）

- **Bridge minor**: major bump 前必須先發一個 minor，同時支援新舊 schema、列出未來移除項目；release workflow 強制檢查。

## 目標

1. `docs/BRIDGE_MINOR.md`：SOP（何時發、必含項目、validator 行為）。
2. release workflow：偵測 major bump PR 時要求前一個 minor 為 bridge release。
3. `@experimental` API 通道：SDK export 加標記、CLI welcome 顯示「experimental」標、消費者需 `--allow-experimental` 才能呼叫。
4. `docs/EXPERIMENTAL_API.md`：清單、stability promise、graduation 條件。
5. `scripts/validate-bridge-minor.ts` 校驗 release PR 是否符合 bridge 條件。

## 驗收

- [ ] major bump fixture 缺前置 bridge minor 時 CI 阻擋。
- [ ] experimental API fixture 預設拒絕，加旗標後可呼叫。
- [ ] validate-bridge-minor.ts 加入 standard profile。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-bridge-minor.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 bridge minor + experimental API 後續卡；採 Option A（mandatory bridge minor） | 阻塞: TASK-APO-0013
