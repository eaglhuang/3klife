---
doc_id: doc_other_0177
task_id: TASK-APO-0024
title: Time+minor deprecation + canary rollout
milestone: M10
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
  - docs/ai_atomic_framework/upstream-versioning-policy.md
  - docs/DEPRECATIONS.md
  - packages/cli/src/commands/upgrade.ts
  - scripts/validate-deprecation-policy.ts
  - scripts/validators.config.json
  - tests/deprecation/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 重做整套 SemVer 規則
  - 提供具體 deprecation 條目（屬 release-time 決策）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0024 — Time+minor Deprecation + Canary Rollout

## 背景

`upstream-versioning-policy.md` §3 / §4.5 規劃以「時間 AND minor 數」雙條件控管 deprecation；並引入 `--canary` 階段性套用 upgrade。

## 目標

1. Deprecation 條件：alpha ≥30d、beta ≥90d、stable ≥180d、lts ≥365d，且至少 N 個 minor 已過（N 由 tier 表決定）。
2. `scripts/validate-deprecation-policy.ts`：對 `DEPRECATIONS.md` 條目檢查時間 + minor 雙條件。
3. `atm upgrade apply --canary <percent>`：階段性套用 codemod（先 fixture / 子目錄）；CLI 紀錄 canary state 並可 rollback。
4. release workflow 對標 deprecation 將至期限的條目發 reminder issue。

## 驗收

- [ ] 條目時間未到但 minor 已過 → validator 失敗（雙條件 AND）。
- [ ] `upgrade apply --canary 25` fixture 只套用 25% 檔案，可 rollback。
- [ ] validator 加入 standard profile。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-deprecation-policy.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 time+minor deprecation + canary rollout 後續卡 | 阻塞: TASK-APO-0013
