---
doc_id: doc_other_0170
task_id: TASK-APO-0017
title: Long-tail user safeguards — append-only matrix + offline first-touch + downgrade detect
milestone: M9
status: done
started_at: 2026-05-18T09:43:50+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-18T10:02:46+08:00
completed_by_agent: vs-insiders-gpt-5.4
commit: 8a4fc9d (AI-Atomic-Framework main)
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
  - compatibility-matrix.legacy.json
  - schemas/governance/compatibility-matrix.schema.json
  - packages/cli/src/commands/atm-chart.ts
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/commands/doctor.ts
  - packages/cli/src/commands/upgrade.ts
  - scripts/build-release-integrity.ts
  - scripts/build-root-drop-release.ts
  - scripts/validate-upgrade-rollback.ts
  - scripts/validate-version-compatibility.ts
  - tests/cli-fixtures/help-snapshots/upgrade.json
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
lastTransitionId: 2026-05-21T10-29-44-168Z-migrate-legacy-ledger-5ae8e5515904
lastTransitionAt: 2026-05-21T10:29:44.168Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.168Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:1c36f0af91f721405708f3e16833b40d9d340e7db222900420a42771d7d4dbc8
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

- [x] downgrade fixture 觸發 read-only mode + warn message。
- [x] offline fixture 不會 fail，僅 warn 並繼續 read-only。
- [x] unknown chart 預設拒寫；加 `--allow-unknown-chart` 後可進入 upgrade plan。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-version-compatibility.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 long-tail user safeguards 後續卡 | 阻塞: TASK-APO-0012
2026-05-18 | 狀態: done | 驗證: `longtail-user-safeguards.test.ts` PASS；`validate-version-compatibility.ts --mode validate` PASS；`validate-upgrade-rollback.ts --mode validate` PASS；`validate-cli.ts --mode validate` PASS；root-drop / onefile release validators PASS；`build-release-integrity.ts --dry-run` PASS；`validate:standard` 中本卡相關 gate PASS，但既有 `multi-agent-confidence` generated matrix stale 仍使整體 profile exit 1 | 變更: AI-Atomic-Framework commit `8a4fc9d` 新增 legacy matrix、compatibility schema、bundled snapshot fallback warning、framework downgrade cache/read-only diagnostic、unknown chart fail-closed override、release bundle/integrity 同捆與長尾測試文件；補列 task allowed_files 中實作必要的主 matrix、CLI help snapshot、release scripts 與 upgrade rollback validator | 阻塞: none
