---
doc_id: doc_other_0167
task_id: TASK-APO-0014
title: Release trust chain — npm provenance + SBOM + integrity manifest
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
  - .github/workflows/release-npm.yml
  - scripts/build-release-integrity.ts
  - scripts/validate-release-trust.ts
  - scripts/validators.config.json
  - packages/cli/src/startup-integrity.ts
  - packages/cli/src/commands/doctor.ts
  - docs/RELEASE_TRUST.md
  - tests/release/**
forbidden_files:
  - packages/core/**
  - assets/**
non_goals:
  - 重做整套 release workflow（僅補 trust 層）
  - 處理 known-bad / yank（屬 TASK-APO-0015）
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# TASK-APO-0014 — Release Trust Chain

## 背景

`upstream-versioning-policy.md` 新增 §4.6 Release Trust Chain 要求：npm `--provenance`、SBOM、整體 release `integrity.json`、CLI 啟動驗 bundled compatibility-matrix sha256。本卡實作。

## 目標

1. release workflow 加 `npm publish --provenance`，產出 attestation。
2. 用 `@cyclonedx/cdxgen` 或同級工具產 SBOM 並 attach 到 GitHub Release。
3. `scripts/build-release-integrity.ts` 計算每個 published artefact 的 sha256，輸出 `integrity.json` 與 release tarball 同捆。
4. CLI 啟動時讀 bundled `compatibility-matrix.json` 與 `integrity.json` 對比 sha256，不符直接拒絕執行（read-only doctor 例外）。
5. `scripts/validate-release-trust.ts` 加入 standard profile，PR 階段先校驗 manifest 結構。

## 驗收

- [ ] release workflow 在 dry-run mode 可產 attestation + SBOM。
- [ ] `atm doctor --trust` 輸出 bundled hash 與 expected hash 對照。
- [ ] tampered bundled matrix 會被 CLI 拒絕（fixture）。
- [ ] validate-release-trust.ts 失敗訊息可機器解析。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-release-trust.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 release trust chain 後續卡 | 阻塞: TASK-APO-0012
