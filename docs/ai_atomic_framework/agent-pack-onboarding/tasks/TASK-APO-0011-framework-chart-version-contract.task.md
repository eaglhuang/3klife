---
doc_id: doc_other_0163
task_id: TASK-APO-0011
title: Framework / ATMChart 版本契約
milestone: M6
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
  - docs/ai_atomic_framework/agent-pack-onboarding/tasks/README.md
  - docs/ai_atomic_framework/upstream-versioning-policy.md
  - docs/LIFECYCLE.md
  - docs/ATOM_COMPATIBILITY.md
  - docs/RELEASE_CHECKLIST.md
  - docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0011-framework-chart-version-contract.task.md
  - docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0012-version-compatibility-gate.task.md
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不實作 CLI validator
  - 不直接 publish npm package
  - 不改動既有 TASK-APO-0000 至 TASK-APO-0010 的完成證據
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
started_at: 2026-05-18T00:31:02.1882413+08:00
started_by_agent: vs-insiders-gpt-5.4
completed_at: 2026-05-18T00:37:45.5471514+08:00
completed_by_agent: vs-insiders-gpt-5.4
lastTransitionId: 2026-05-21T10-29-44-161Z-migrate-legacy-ledger-f732a3c92447
lastTransitionAt: 2026-05-21T10:29:44.161Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.161Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:a002cb1d791e9d41523da2ffb64b2a1dd9557a66c8107882bd44a787345130cf
---

# TASK-APO-0011 — Framework / ATMChart 版本契約

## 目標

把 ATM Framework Version、ATMChart Version、Agent Pack / Integration Template Version 的責任邊界文件化，並把版本契約接回既有 `upstream-versioning-policy.md`，避免 onboarding 計畫另起第二套 lifecycle 真相。

## 前置依賴

- 無

## 輸入

- `ATM引導工程計畫書.md` §3.8、§4.3、§6/M6。
- `upstream-versioning-policy.md` 的 tier / SemVer / deprecation cycle。
- AI-Atomic-Framework 目前 package version `0.0.0` 與 `default-guards.json.schemaVersion = atm.defaultGuards.v0.1` 現況。

## 輸出

1. 三層版本契約：Framework SemVer、ATMChart semantic version、template / manifest version。
2. Chart version 與 `minFrameworkVersion` 的相容矩陣規則。
3. InstallManifest 必須記錄 install-time framework / chart / template version 的文件契約。
4. 對 `upstream-versioning-policy.md` 的引用或補充，明確本計畫只處理 onboarding / chart / manifest 層。

## 驗收條件

- [x] 計畫書清楚說明 ATM Framework Version 與 ATMChart Version 有關但正交。
- [x] 計畫書定義 chart version bump 規則：patch / minor / major 的語意與 breaking condition。
- [x] 計畫書定義 `minFrameworkVersion` 與 unsupported / deprecated / supported 三態。
- [x] InstallManifest 文件契約要求寫入 framework / chart / template version。
- [x] `upstream-versioning-policy.md` 與本計畫沒有雙重真相或矛盾。
- [x] 計畫書明確採「分層座標、同一 release train」，chart / template 不得脫離 framework tag 單獨發布。
- [x] 計畫書與 upstream policy 明確要求舊版偵測、dry-run plan、backup、rollback 與 read-only diagnostic mode。

## 影響檔案

- `docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md`
- `docs/ai_atomic_framework/agent-pack-onboarding/tasks/README.md`
- `docs/ai_atomic_framework/upstream-versioning-policy.md`
- `docs/LIFECYCLE.md`
- `docs/ATOM_COMPATIBILITY.md`
- `docs/RELEASE_CHECKLIST.md`

## 驗證方式

```bash
node tools_node/check-encoding-touched.js docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md docs/ai_atomic_framework/agent-pack-onboarding/tasks/README.md docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0011-framework-chart-version-contract.task.md docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0012-version-compatibility-gate.task.md
```

## 回滾策略

移除 M6 版本契約段落與任務索引列；保留既有 M0-M5 引導工程完成狀態。

## Checklist

- [x] version layers documented
- [x] chart compatibility policy documented
- [x] manifest version contract documented
- [x] upstream versioning policy aligned
- [x] unified release train rule documented
- [x] old-version safety and rollback documented
- [x] docs encoding check pass

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求開立版本契約後續卡，尚未接手實作 | 阻塞: none
2026-05-18 | 狀態: in-progress | 驗證: pending | 變更: vs-insiders-gpt-5.4 接手回寫 upstream-versioning-policy 與 ATM 引導工程計畫書的雙向落地規則 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: `node tools_node/check-encoding-touched.js ...` pass；`git diff --check -- <versioning docs>` pass；grep confirmed upstream/onboarding landing sections | 變更: 回寫 upstream compatibility matrix 擴充、ATMChart / onboarding breaking-change checklist、chart schema 演化規則、release gate，並在引導工程計畫書補 upstream policy 對照表與 M6 完成狀態 | 阻塞: none
2026-05-18 | 狀態: in-progress | 驗證: pending | 變更: 依使用者追問補強「分層但同一 release train」、舊版偵測、非破壞升級與 rollback 安全規則 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: `node tools_node/check-encoding-touched.js ...` pass；`git diff --check -- <versioning docs>` pass；grep confirmed release-train / old-version / safe-upgrade / rollback sections | 變更: 明確規定版本可分層但發布不可分裂，補上 compatibility matrix releaseTrain、舊版 supported/deprecated/unsupported/unknown 行為、dry-run plan、backup、rollback 與 TASK-APO-0012 實作驗收 | 阻塞: none