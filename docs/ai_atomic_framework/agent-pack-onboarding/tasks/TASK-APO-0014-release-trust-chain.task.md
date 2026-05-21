---
doc_id: doc_other_0167
task_id: TASK-APO-0014
title: Release trust chain — npm provenance + SBOM + integrity manifest
milestone: M8
status: done
started_at: 2026-05-18T11:00:00+08:00
started_by_agent: copilot-claude-sonnet-4.6
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
completed_at: 2026-05-18T11:25:00+08:00
completed_by_agent: copilot-claude-sonnet-4.6
commit: c4983ec (AI-Atomic-Framework main)
created_by_agent: vs-insiders-gpt-5.4
lastTransitionId: 2026-05-21T10-29-44-164Z-migrate-legacy-ledger-9e93c643ead0
lastTransitionAt: 2026-05-21T10:29:44.164Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.164Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:4e8ff87f7cb4b70c3da6f05509c716c9b16011965fcf1d00c01cf8a5a1d8f776
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

- [x] release workflow 在 dry-run mode 可產 attestation + SBOM。
- [x] `atm doctor --trust` 輸出 bundled hash 與 expected hash 對照。
- [x] tampered bundled matrix 會被 CLI 拒絕（fixture）。
- [x] validate-release-trust.ts 失敗訊息可機器解析。

## 驗證方式

```bash
cmd /c npm run validate:standard
node --experimental-strip-types scripts/validate-release-trust.ts --mode validate
```

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 release trust chain 後續卡 | 阻塞: TASK-APO-0012
2026-05-18 | 狀態: done | 驗證: `node --experimental-strip-types scripts/validate-release-trust.ts --mode validate` pass；`tests/release/release-trust.test.ts` pass；`build-release-integrity.ts --dry-run` pass；`npm run validate:standard` 已跑到本卡 validator pass，但因既有 `multi-agent-confidence` matrix stale 失敗（非本卡 touched files） | 變更: release workflow 加 dry-run provenance/SBOM、integrity manifest builder、CLI startup trust gate、`doctor --trust` hash 對照、tamper fixture、standard profile validator entry | 阻塞: none
