---
doc_id: doc_other_aao_0072
task_id: TASK-AAO-0072
title: "ATM version metadata Slice 2 artifactVersionKind and evidence write-path"
status: done
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - "TASK-AAO-0070"
  - "TASK-AAO-0071"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/index.ts"
  - "packages/plugin-governance-local/src/versioning.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "packages/plugin-governance-local/src/index.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/core/src/index.ts"
  - "packages/plugin-governance-local/src/versioning.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "packages/plugin-governance-local/src/index.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾僅應撤回 Slice 2 引入的 artifactVersionKind 與 evidenceStore.writeEvidence 單一路徑串接，不得藉機擴展到 registry、bootstrap、doctor、tasks、atm.mjs 或 release packaging。"
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "此 Slice 僅允許最小範圍補齊 versioning / stores 相關 ownership 映射；不得藉由 map 更新擴大實作範圍。"
outOfScope:
  - "將 version metadata 寫入 registryStore.writeRegistryEntry 或任何其他 stores.ts method"
  - "引入 dataVersionKind 或改變 dataVersion 固定 semver 的前提"
  - "擴及 bootstrap / doctor / tasks / atm.mjs / release packaging"
  - "amend 歷史 commit 7d6b04c"
  - "修改 closed TASK-AAO-0065 ledger"
  - "開啟 Slice 3 或任何後續切片"
  - "編輯 AI-Atomic-Framework source tree 以外的其他產品面向"
nonGoals:
  - "不要實作多 consumer write-path"
  - "不要把 Slice 2 變成全域 metadata migration sweep"
  - "不要把 semver hygiene rename 重新併回本卡"
tags:
  - "framework-contract-slice"
  - "version-metadata"
  - "write-path"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---

# TASK-AAO-0072 - ATM version metadata Slice 2 artifactVersionKind and evidence write-path

## 任務目標 (Goal)

本卡明確定義 **ATM version metadata migration 的 Slice 2**，且本體只做兩件事：

1. 引入 `artifactVersionKind`
2. 將 version metadata 只接到單一 consumer：`evidenceStore.writeEvidence`

本卡是 planning card，**不實作、不碰 AI-Atomic-Framework source**；其用途是鎖定 Slice 2 的語義邊界、前置條件與允許修改面。

## 固定語義決策 (Fixed Semantics)

- `dataVersion` 固定為 `semver`，**不引入 `dataVersionKind`**。
- `artifactVersionKind` 的值域固定為：`'semver' | 'git-sha' | 'sha256' | 'opaque'`。
- `compareArtifactVersions` **僅同 kind 可比較**。
- cross-kind 一律回傳 `null`。
- identity-only kinds 不做排序；因此 `compareArtifactVersions` 不得對 identity-only kinds 產生排序結論。
- 可排序語義僅限 `artifactVersionKind = 'semver'` 的同 kind 比較。

## Slice 邊界 (Slice Boundary)

Slice 2 的寫入面只允許落在 `evidenceStore.writeEvidence`。本卡明確禁止把相同 version metadata wiring 擴到其他 consumer，特別是：

- `registryStore.writeRegistryEntry`
- `stores.ts` 內任何其他 method
- `bootstrap/**`
- `doctor`、`tasks`、`atm.mjs`
- release packaging

換言之，這不是全面 migration，也不是多寫入點擴散；它是 **artifactVersion polymorphic semantics + single write-path wiring** 的最小 Slice 2。

## Implementation Preconditions

在 0072 可以 claim / implementation 之前，必須先滿足下列前置條件：

1. `TASK-AAO-0071` rename patch **必須先 landed**。
2. `artifactVersionKind` 的 semantic decision 已固定，不可在 implementation 期間重新打開決策。
3. 實作串接只能碰 `evidenceStore.writeEvidence`，**不能擴到其他 `stores.ts` method**。

## Allowed Files

`allowedFiles` 嚴格限於以下檔案，不可增減：

- `packages/core/src/index.ts`
- `packages/plugin-governance-local/src/versioning.ts`
- `packages/plugin-governance-local/src/stores.ts`
- `packages/plugin-governance-local/src/index.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- 一個最小 validator surface（若需要，限 `scripts/validate-cli.ts`）

## Validators

validators 維持最小集合，不擴張：

- `npm run typecheck`
- `npm run validate:cli`
- `git diff --check`

## 驗收標準 (Acceptance Criteria)

- `TASK-AAO-0072` 已在 `3KLife` planning repo 建立，並可作為獨立 Slice 2 卡片存在。
- 本卡清楚標示：Slice 2 **只做兩件事** —— 引入 `artifactVersionKind`，以及將 version metadata 單點串接到 `evidenceStore.writeEvidence`。
- 本卡清楚標示：`dataVersion` 固定為 semver，**不得**新增 `dataVersionKind`。
- 本卡清楚標示：`artifactVersionKind` 的固定值域為 `'semver' | 'git-sha' | 'sha256' | 'opaque'`。
- 本卡清楚標示：`compareArtifactVersions` 僅同 kind 可比較、cross-kind 回傳 `null`、identity-only kinds 不排序。
- 本卡 `depends_on` 明確包含 `TASK-AAO-0070` 與 `TASK-AAO-0071`。
- 本卡的允許修改面嚴格限制於本卡列出的 `allowedFiles`，不得外擴。

## 停止條件 (Stop Conditions)

- 不可把 `registryStore.writeRegistryEntry` 一起做。
- 不可引入 `dataVersionKind`。
- 不可擴到 `bootstrap` / `doctor` / `tasks` / `atm.mjs` / release packaging。
- 不可 amend `7d6b04c`。
- 不可碰 closed `TASK-AAO-0065` ledger。

## 備註 (Notes)

- `TASK-AAO-0070` 是 Slice 1 identity correction；`TASK-AAO-0071` 是 semver helper rename hygiene patch；`TASK-AAO-0072` 則是 **Slice 2**。
- `TASK-AAO-0072` 不得回頭改寫 0070 / 0071 的範圍，也不得順手開 Slice 3。
- 若 0071 尚未 implementation landed，0072 只能維持 `planned`，不可 claim。