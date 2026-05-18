---
doc_id: doc_other_0174
task_id: TASK-APO-0021
title: Meta-schema versioning — invariants / InstallManifest / ATMChart 各自 schemaVersion
milestone: M9
status: done
started_at: 2026-05-18T10:37:24+08:00
started_by_agent: vs-insiders-gpt-5.4
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
  - compatibility-matrix.json
  - schemas/governance/**
  - packages/agent-pack-sdk/src/install-manifest.ts
  - packages/cli/src/commands/atm-chart.ts
  - scripts/validate-meta-schema.ts
  - scripts/validators.config.json
  - tests/meta-schema/**
  - docs/META_SCHEMA.md
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 變更 Framework SemVer 規則
  - 重做 chart 內容（僅加 schemaVersion 欄位）
created_at: 2026-05-18T00:00:00+08:00
completed_at: 2026-05-18T10:52:40+08:00
completed_by_agent: vs-insiders-gpt-5.4
commit: e3769a8 (AI-Atomic-Framework main)
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0021 — Meta-schema Versioning

## 背景

`upstream-versioning-policy.md` §7 要求 invariants / InstallManifest / ATMChart frontmatter 各自有 schemaVersion；目前僅 `compatibility-matrix.json` 已採 `atm.compatibilityMatrix.v0.1`。

## 目標

1. 統一命名空間：`atm.<artifact>.v<major>.<minor>`（e.g. `atm.installManifest.v0.1`、`atm.atmChart.v0.1`、`atm.invariants.v0.1`）。
2. 每個 schema 加入 schemaVersion 欄位 + JSON Schema 反映。
3. validator 向後讀舊 manifest：缺欄位視為 `v0.0`，發 warn 並提示遷移。
4. `docs/META_SCHEMA.md`：列各 artefact schemaVersion 對應的破壞性變更。

## 驗收

- [x] 舊 manifest fixture（無 schemaVersion）能被讀取且 warn。
- [x] 新 manifest 帶 schemaVersion 通過嚴格校驗。
- [x] validate-meta-schema.ts 加入 standard profile。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-meta-schema.ts --mode validate
```

## Notes

2026-05-18 | 狀態: done | 驗證: `node --experimental-strip-types scripts/validate-meta-schema.ts --mode validate` pass；`node --experimental-strip-types scripts/run-validators.ts standard --filter meta-schema` pass；`npm run validate:standard` pass；encoding spot-check pass | 變更: upstream commit `e3769a8`，新增 `atm.installManifest.v0.1` / `atm.atmChart.v0.1` / `atm.invariants.v0.1` schemaVersion contract、legacy InstallManifest `v0.0` warning reader、`docs/META_SCHEMA.md`、strict/legacy fixtures 與 standard validator gate | 阻塞: none
