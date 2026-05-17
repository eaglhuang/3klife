---
doc_id: doc_other_0170
task_id: TASK-APO-0017
title: Long-tail user safeguards — append-only matrix + offline first-touch + downgrade detect
milestone: M9
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
  - compatibility-matrix.legacy.json
  - schemas/governance/compatibility-matrix.schema.json
  - packages/cli/src/commands/atm-chart.ts
  - packages/cli/src/commands/doctor.ts
  - packages/cli/src/commands/upgrade.ts
  - scripts/validate-version-compatibility.ts
  - tests/longtail/**
  - docs/LONGTAIL_USERS.md
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 重做整套 upgrade plan / rollback（屬 TASK-APO-0012）
  - 移除既有 matrix 條目
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0017 — Long-tail User Safeguards

## 背景

`upstream-versioning-policy.md` §4.3 改為 append-only、§4.5 unknown 預設拒寫；本卡實作對應 CLI / validator 行為，並補 offline first-touch + downgrade detection。

## 目標

1. 拆分 `compatibility-matrix.legacy.json` 收容 unsupported 條目，CLI bundle 同捆。
2. CLI 啟動時偵測 downgrade（local cache 紀錄上次版本，發現本次版本較舊則 warn 並啟用 read-only diagnostic）。
3. offline / 無 internet 第一次安裝：用 bundled snapshot fallback，CLI 提示「使用 bundled snapshot, last updated」。
4. unknown chart：CLI 預設拒絕 write，需 `--allow-unknown-chart` 才能跑 upgrade plan。
5. validator 加入 `legacy-matrix` 條目格式檢查。

## 驗收

- [ ] downgrade fixture 觸發 read-only mode + warn message。
- [ ] offline fixture 不會 fail，僅 warn 並繼續 read-only。
- [ ] unknown chart 預設拒寫；加 `--allow-unknown-chart` 後可進入 upgrade plan。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-version-compatibility.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 long-tail user safeguards 後續卡 | 阻塞: TASK-APO-0012
