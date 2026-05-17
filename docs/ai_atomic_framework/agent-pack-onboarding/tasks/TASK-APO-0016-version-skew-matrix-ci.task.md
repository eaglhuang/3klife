---
doc_id: doc_other_0169
task_id: TASK-APO-0016
title: Version skew matrix CI — CLI × Plugin SDK × Adapter 組合測試
milestone: M8
status: open
blocked_by: [TASK-APO-0012]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - .github/workflows/version-skew-matrix.yml
  - scripts/validate-skew-matrix.ts
  - scripts/skew-matrix.config.json
  - fixtures/skew/**
  - tests/skew/**
  - docs/VERSION_SKEW.md
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 改寫 plugin SDK 本身（屬另案）
  - 增加 adapter 數量（僅以現有 adapter 矩陣為基線）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0016 — Version Skew Matrix CI

## 背景

`upstream-versioning-policy.md` §6 規定 SDK / Adapter skew 規則，但缺 CI 強制。本卡用矩陣 workflow 驗證實際相容組合。

## 目標

1. `scripts/skew-matrix.config.json` 列出當前支援的 CLI × Plugin SDK × Adapter 組合（限制矩陣大小，先聚焦 last 2 minor）。
2. `.github/workflows/version-skew-matrix.yml` 在 release PR 觸發，跑每個組合的 smoke test。
3. `scripts/validate-skew-matrix.ts` 校驗 config 與 `compatibility-matrix.json` 一致。
4. 失敗組合自動在 PR 評論列出。

## 驗收

- [ ] PR 蓄意引入不相容組合會被 CI 阻擋。
- [ ] matrix 完整通過時輸出 summary artefact。
- [ ] validate-skew-matrix.ts 加入 standard profile。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-skew-matrix.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 version skew matrix CI 後續卡 | 阻塞: TASK-APO-0012
