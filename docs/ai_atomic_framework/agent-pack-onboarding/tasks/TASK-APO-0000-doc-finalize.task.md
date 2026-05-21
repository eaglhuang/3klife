---
doc_id: doc_other_0151
task_id: TASK-APO-0000
title: 文件定稿與 cross-link
milestone: M1
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
  - README.md
  - docs/ARCHITECTURE.md
  - docs/AGENT_PACK_ONBOARDING.md
  - docs/**
forbidden_files:
  - assets/**
  - library/**
  - temp/**
non_goals:
  - 不實作 agent-pack runtime
  - 不修改任何採用者 runtime
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
started_at: 2026-05-17T22:29:42.7500081+08:00
started_by_agent: vs-insiders-gpt-5.4
lastTransitionId: 2026-05-21T10-29-44-146Z-migrate-legacy-ledger-112215eb7392
lastTransitionAt: 2026-05-21T10:29:44.146Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.146Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:a4dc569d645f3746b4b5747b8b02b680224f9f481e9e651f261756eaace454ef
---

# TASK-APO-0000 — 文件定稿與 cross-link

## 目標

把 `ATM 引導工程計畫書` 收斂為 ATM onboarding 主線的內部規劃真相來源，並確認它和 replacement / upgrade 類 protocol 的邊界清楚。

## 前置依賴

- 無。

## 輸入

- 計畫書 §0–§18。
- MRP 任務卡格式與任務索引慣例。

## 輸出

1. 計畫書保持完整，並以 `ATMChart` / `atm-chart` 作為 rule render artifact 命名。
2. ATM repo 端只保留英文公開說明，不保存本目錄的內部任務卡。
3. README / ARCHITECTURE 或同等公開文件建立 cross-link。

## 驗收條件

- [x] 本計畫書存在且包含 §0–§18。
- [x] 文件被 ATM `README.md` 與 `docs/ARCHITECTURE.md` 引用；ATM repo 端只保留英文公開說明。
- [x] 文件通過 UTF-8 編碼檢查（無 BOM、無 U+FFFD）。
- [x] 目標 A、B 在 §14 有明確達成判斷。
- [x] 風險清單 §12 + §14.3 已合併，沒有矛盾。
- [x] 與 MRP（`doc_other_0133`）責任邊界在 §17 明確劃分。

## 影響檔案

- `docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/AGENT_PACK_ONBOARDING.md`

## 驗證方式

```bash
node tools_node/check-encoding-touched.js --files docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
cmd /c npm run validate:standard
```

## 回滾策略

純文件與 cross-link 變更，直接 revert 對應 commit 即可。

## Checklist

- [x] 計畫書命名與 `ATMChart` 收斂一致。
- [x] ATM repo 公開文件 cross-link 完成。
- [x] 編碼掃描通過。
- [ ] 任務卡 `status` 改為 `done`。

## Notes

2026-05-17 | 狀態: in-progress | 驗證: pending | 變更: 已鎖定 TASK-APO-0000，開始文件定稿與 cross-link | 阻塞: none
2026-05-17 | 狀態: in-progress | 驗證: `git diff --check` pass；`validate:neutrality` pass；`validate:standard` blocked by pre-existing `upgrade --help` snapshot mismatch in `tests/cli-fixtures/help-snapshots/upgrade.json` | 變更: AI-Atomic commit `79189c2 docs: add agent pack onboarding overview`，新增公開 `docs/AGENT_PACK_ONBOARDING.md` 並補 README / ARCHITECTURE cross-link | 阻塞: unrelated CLI fixture drift