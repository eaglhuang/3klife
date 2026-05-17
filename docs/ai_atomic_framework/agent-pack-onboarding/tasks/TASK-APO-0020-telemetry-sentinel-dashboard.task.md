---
doc_id: doc_other_0173
task_id: TASK-APO-0020
title: Telemetry + adopter sentinel + deprecation dashboard
milestone: M10
status: open
blocked_by: [TASK-APO-0018]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/telemetry.ts
  - packages/cli/src/commands/welcome.ts
  - packages/cli/src/telemetry/**
  - .github/workflows/adopter-sentinel.yml
  - scripts/adopter-sentinel.ts
  - docs/DEPRECATIONS.md
  - docs/TELEMETRY.md
  - tests/telemetry/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 收集任何 PII 或匿名以外的識別資料
  - 預設啟用（必須 opt-in）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0020 — Telemetry + Sentinel + Dashboard

## 背景

`upstream-versioning-policy.md` 新增 §8.6 要求 opt-in telemetry、CI sentinel、`DEPRECATIONS.md` dashboard，協助評估 deprecation 影響。本卡實作。

## 設計決策（已採 Option A）

- **Telemetry**: 預設關閉；welcome flow 解釋目的與資料項目，使用者明確 opt-in；可隨時 `atm telemetry --off`。
- 資料項目限：CLI version、Node version、OS family、chart status、command name、execution result（success/fail）；不收路徑、檔名、使用者輸入。

## 目標

1. `atm telemetry` 子命令：opt-in / opt-out / status，預設 off。
2. CLI welcome 顯示 telemetry 說明連結 + 同意提示（非阻塞）。
3. `docs/TELEMETRY.md`：資料項目、用途、刪除請求流程。
4. adopter sentinel：CI fixture 模擬主流 host（VS Code / Cursor / Claude Code）使用 ATM 流程；發現失敗即發 issue。
5. `docs/DEPRECATIONS.md`：列當前 deprecated API、移除時程、替代方案；由 release workflow 自動更新表頭。

## 驗收

- [ ] CLI 預設不發送任何 telemetry payload（fixture 校驗網路請求次數=0）。
- [ ] opt-in 後送出 payload schema 通過 fixture 校驗。
- [ ] sentinel workflow 在故意破壞 fixture 時會失敗。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 telemetry + sentinel + dashboard 後續卡；採 Option A（opt-in only） | 阻塞: TASK-APO-0018
