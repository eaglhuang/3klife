---
doc_id: doc_other_0164
task_id: TASK-APO-0012
title: Version compatibility 與 breaking-change gate
milestone: M7
status: open
blocked_by: [TASK-APO-0011]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - schemas/governance/default-guards.schema.json
  - packages/cli/src/commands/atm-chart.ts
  - packages/cli/src/commands/welcome.ts
  - packages/cli/src/commands/doctor.ts
  - packages/cli/src/commands/integration.ts
  - packages/agent-pack-sdk/**
  - packages/integrations-core/**
  - scripts/validators.config.json
  - scripts/validate-version-compatibility.ts
  - scripts/validate-breaking-changes.ts
  - scripts/validate-upgrade-rollback.ts
  - tests/**
  - .github/workflows/release-npm.yml
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 不重新設計 SemVer policy
  - 不改變 `atm next --json` 的流程權威
  - 不自動覆蓋 user-modified entry files
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0012 — Version compatibility 與 breaking-change gate

## 目標

在 AI-Atomic-Framework upstream 實作版本相容、版本落後偵測、breaking-change gate 與 safe upgrade / rollback 流程，讓 `atm-chart verify`、`doctor`、`welcome`、standard validator 與 release workflow 能判斷 framework / chart / template version 是否仍支援 official onboarding path，並保證舊版本使用者專案不會被自動破壞。

## 前置依賴

- TASK-APO-0011

## 輸入

- `ATM引導工程計畫書.md` §3.8、§4.3、§4.4、§6/M7。
- TASK-APO-0011 產出的 Framework / ATMChart / Template version 契約。
- AI-Atomic-Framework 目前 `release-npm.yml` tag-driven package version sync 與 `default-guards.schema.json` 現況。

## 輸出

1. `atm-chart verify --version-check` 或等價 version compatibility 檢查。
2. `doctor` / `welcome` 顯示 framework version、chart version、template version 與 supported / deprecated / unsupported / unknown 狀態。
3. standard profile 內的 version compatibility validator。
4. breaking schema / guard semantics 變更時的 migration guide / unsupported 診斷 gate。
5. release workflow 在 publish 前驗證 tag version、package version 與 chart compatibility matrix 一致。
6. safe upgrade / rollback flow：先產生 dry-run plan，再備份 chart / manifest / entry files，apply 後可 rollback。
7. supported / deprecated / unsupported / unknown 四種 version lag 狀態的 deterministic fixtures。

## 驗收條件

- [ ] chart version 低於 supported range 時，`atm-chart verify --version-check` 或等價命令非零 exit。
- [ ] framework version 低於 chart `minFrameworkVersion` 時，`doctor` 回報 `unsupported-chart-version` 或等價診斷。
- [ ] `welcome --json` 含 framework / chart / template version 摘要。
- [ ] `scripts/validators.config.json` standard profile 納入版本相容 validator。
- [ ] breaking schema / guard semantics 變更未附 migration guide 時 validator 失敗。
- [ ] release workflow publish 前檢查 tag、package versions 與 chart compatibility matrix。
- [ ] `atm upgrade plan --json` 或等價命令可列出版本落後、會修改的檔案、user-modified 狀態與 rollback path。
- [ ] migration apply 前會備份 `.atm/memory/atm-chart.md`、`.atm/agent-pack/*.manifest.json`、agent-native entry files 與 compatibility matrix snapshot。
- [ ] rollback fixture 證明 apply 後可還原上一份 chart / manifest / entry files。
- [ ] unsupported / unknown chart 不會自動改檔，只能進入 read-only diagnostic mode 或 explicit upgrade plan。

## 影響檔案

- `schemas/governance/default-guards.schema.json`
- `packages/cli/src/commands/atm-chart.ts`
- `packages/cli/src/commands/welcome.ts`
- `packages/cli/src/commands/doctor.ts`
- `packages/cli/src/commands/integration.ts`
- `packages/agent-pack-sdk/**`
- `packages/integrations-core/**`
- `scripts/validators.config.json`
- `scripts/validate-version-compatibility.ts`
- `scripts/validate-breaking-changes.ts`
- `scripts/validate-upgrade-rollback.ts`
- `tests/**`
- `.github/workflows/release-npm.yml`

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-version-compatibility.ts --mode validate
node --experimental-strip-types scripts/validate-breaking-changes.ts --mode validate
node --experimental-strip-types scripts/validate-upgrade-rollback.ts --mode validate
```

## 回滾策略

移除新增 validator、CLI version output、upgrade / rollback command 與 release workflow version gate；保留 TASK-APO-0011 的文件契約作為後續重做依據。

## Checklist

- [ ] atm-chart version check
- [ ] doctor version diagnostics
- [ ] welcome version summary
- [ ] standard validator integration
- [ ] breaking-change migration gate
- [ ] release version sync gate
- [ ] safe upgrade dry-run plan
- [ ] backup and rollback fixtures
- [ ] old-version diagnostic fixtures

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求開立 version compatibility / breaking-change gate 後續卡，等待 TASK-APO-0011 定義契約後接手 | 阻塞: TASK-APO-0011
2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者追問補強舊版落後偵測、safe upgrade plan、backup、rollback 與 read-only diagnostic 驗收；尚未接手實作 | 阻塞: TASK-APO-0011
