---
doc_id: doc_index_0021
owner: atm-core
status: internal-mirror
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: claude_code_opus4.7
revised_by:
  - codex-review
  - codex-task-card-open
revised_at: 2026-05-18T00:00:00+08:00
---

# ATM 技術債重構 Task Cards

本目錄收錄「ATM 技術債重構計畫書」（../ATM 技術債重構計畫書.md）的 3KLife 內部任務鏡像。

重要邊界：這裡的 TASK-ATD-* 不是 AI-Atomic-Framework 的 public contributor workflow，也不是上游 issue 編號。它只用於 3KLife 本地 agent 協作、拆工、保留 evidence 與對齊三角策略。任何工作若要正式進入 AI-Atomic-Framework，必須轉成 upstream-friendly artifact：GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

---

## 追蹤狀態

| 欄位 | 說明 |
|---|---|
| public_tracking | 固定為 false，表示本目錄不是上游公開追蹤來源。 |
| tracking_scope | 任務卡固定填 internal-mirror。 |
| upstream_tracking | pending-github-issue、pending-rfc、linked-pr、not-needed 之一。 |
| public_surface_risk | none、docs、cli、schema、release、manifest。 |
| neutrality_required | 觸碰 AI-Atomic-Framework protected surface 時必須為 true。 |

## 拆卡進度

| 狀態 | 數量 |
|------|------|
| 已拆 | 32 / 32 |
| 進行中 | 0 |
| 完成 | 4 |

---

## 索引（內部鏡像）

| Task ID | 標題 | 里程碑 | 狀態 | 阻擋者 | Invariant Risk | Upstream Tracking |
|---------|------|-------|------|--------|----------------|------------------|
| [TASK-ATD-0001](./TASK-ATD-0001-agent-entry-guidance.task.md) | 補框架中立 agent entry guidance | M0 | done | — | I4 | pending-github-issue |
| [TASK-ATD-0002](./TASK-ATD-0002-next-json-repo-state-semantics.task.md) | 釐清 `atm next --json` 對 framework / adopter / unbootstrapped repo 的語意 | M0 | done | — | I1 | pending-github-issue |
| [TASK-ATD-0003](./TASK-ATD-0003-self-governance-example-decision.task.md) | 決策 upstream self-governance 範例位置（不預設 commit `.atm/` runtime） | M0 | done | TASK-ATD-0002 | I3 | pending-rfc |
| [TASK-ATD-0004](./TASK-ATD-0004-module-boundary-runtime-no-scripts.task.md) | 模組邊界硬化：package runtime 不 import `scripts/` | M1 | done | — | — | pending-github-issue |
| [TASK-ATD-0005](./TASK-ATD-0005-module-boundary-deny-rule-fixture.task.md) | `validate-module-boundaries` deny rule + negative fixture | M1 | open | TASK-ATD-0004 | — | pending-github-issue |
| [TASK-ATD-0006](./TASK-ATD-0006-eslint-baseline-warning-budget.task.md) | ESLint baseline / warning budget | M1 | open | — | — | pending-github-issue |
| [TASK-ATD-0007](./TASK-ATD-0007-cli-shared-result-types.task.md) | CLI 公共型別與 shared command result 收斂 | M1 | open | TASK-ATD-0006 | I1 | pending-github-issue |
| [TASK-ATD-0008](./TASK-ATD-0008-framework-version-source.task.md) | framework version 來源改為 package / release manifest | M1 | open | — | I6 | pending-github-issue |
| [TASK-ATD-0009](./TASK-ATD-0009-atm-env-registry-docs.task.md) | 環境變數 registry 與 docs | M1 | open | — | — | pending-github-issue |
| [TASK-ATD-0010](./TASK-ATD-0010-host-git-hook-ci-recipe.task.md) | Git hook / CI enforcement 改為 opt-in host recipe | M1 | open | — | I4 | pending-github-issue |
| [TASK-ATD-0011](./TASK-ATD-0011-validator-harness-consolidation.task.md) | Validator harness 分批收斂 | M2 | open | — | — | pending-github-issue |
| [TASK-ATD-0012](./TASK-ATD-0012-ajv-factory-cache.task.md) | 共用 AJV factory/cache 且保持 pass/fail 行為 | M2 | open | TASK-ATD-0011 | I2 | pending-github-issue |
| [TASK-ATD-0013](./TASK-ATD-0013-cli-error-policy.task.md) | CLI error policy：`CliError` + typed code + usage exit code | M2 | open | TASK-ATD-0007 | I1 | pending-github-issue |
| [TASK-ATD-0014](./TASK-ATD-0014-test-layering-profile.task.md) | 測試分層：unit / validator / release smoke / self-host alpha | M2 | open | — | — | pending-github-issue |
| [TASK-ATD-0015](./TASK-ATD-0015-fast-unit-test-batch.task.md) | 第一批快速單元測試（URN / allocator / shared helpers） | M2 | open | TASK-ATD-0014 | — | pending-github-issue |
| [TASK-ATD-0016](./TASK-ATD-0016-upgrade-command-split.task.md) | `upgrade.ts` 拆分並鎖 public CLI JSON 行為 | M3 | open | TASK-ATD-0015 | I1 | pending-github-issue |
| [TASK-ATD-0017](./TASK-ATD-0017-governance-local-export-inventory.task.md) | `plugin-governance-local` export maturity inventory + 拆分 | M3 | open | TASK-ATD-0015 | I5 | pending-github-issue |
| [TASK-ATD-0018](./TASK-ATD-0018-upgrade-propose-split.task.md) | `propose.ts` 拆分 proposal analysis / gate / output | M3 | open | TASK-ATD-0015, TASK-ATD-0016 | I2 | pending-github-issue |
| [TASK-ATD-0019](./TASK-ATD-0019-atm-chart-command-split.task.md) | `atm-chart.ts` 拆分 render / verify / compatibility helper | M3 | open | TASK-ATD-0015 | I1, I2 | pending-github-issue |
| [TASK-ATD-0020](./TASK-ATD-0020-command-specs-split.task.md) | `command-specs.ts` 拆分 command metadata 與 renderer | M3 | open | TASK-ATD-0015 | I1 | pending-github-issue |
| [TASK-ATD-0021](./TASK-ATD-0021-integrations-core-split.task.md) | `integrations-core` 拆分 compiler / manifest / verify | M3 | open | TASK-ATD-0015 | I5 | pending-github-issue |
| [TASK-ATD-0022](./TASK-ATD-0022-map-generator-split.task.md) | `map-generator.ts` 拆分 allocation / scaffold / provenance | M3 | open | TASK-ATD-0015 | — | pending-github-issue |
| [TASK-ATD-0023](./TASK-ATD-0023-any-debt-budget.task.md) | `any` debt budget（package / public contract 分層） | M3 | open | TASK-ATD-0006 | — | pending-github-issue |
| [TASK-ATD-0024](./TASK-ATD-0024-opensource-docs-env-troubleshooting-adapters.task.md) | 開源文件補強（env / troubleshooting / adapter examples） | M3 | open | — | I4 | pending-github-issue |
| [TASK-ATD-0025](./TASK-ATD-0025-release-parity-gate.task.md) | Release parity gate（source / root-drop / onefile / npm route） | M4 | open | — | I3 | pending-github-issue |
| [TASK-ATD-0026](./TASK-ATD-0026-version-known-bad-release-trust.task.md) | Version compatibility / known-bad / release trust 持續驗證 | M4 | open | TASK-ATD-0025 | I6 | pending-github-issue |
| [TASK-ATD-0027](./TASK-ATD-0027-root-drop-wrapper-dedup.task.md) | root-drop PS1/SH wrapper 去重並保留 parity | M4 | open | TASK-ATD-0025 | I3 | pending-rfc |
| [TASK-ATD-0028](./TASK-ATD-0028-synthetic-adopter-fixture-neutral.task.md) | Synthetic adopter fixture（neutral，不污染 protected surface） | M4 | open | — | I4 | pending-github-issue |
| [TASK-ATD-0029](./TASK-ATD-0029-adopter-sentinel-external-profile.task.md) | Adopter sentinel external profile 作為下游 evidence | M5 | open | TASK-ATD-0028 | I4 | pending-rfc |
| [TASK-ATD-0030](./TASK-ATD-0030-multi-agent-confidence-report.task.md) | Multi-agent confidence report 沿用既有 matrix / result | M5 | open | — | — | pending-github-issue |
| [TASK-ATD-0031](./TASK-ATD-0031-contributor-devcontainer-docker.task.md) | Docker / devcontainer 作 contributor reproducibility | M5 | open | — | — | pending-rfc |
| [TASK-ATD-0032](./TASK-ATD-0032-root-drop-sandbox-e2e.task.md) | Root-drop sandbox E2E | M5 | open | TASK-ATD-0025 | I3 | pending-github-issue |

---

## Milestone 退出條件

| Milestone | 主題 | 修訂後退出條件 | 對應卡數 |
|-----------|------|---------------|---------|
| M0 | Self-Governance Diagnosis | next --json 狀態語意清楚；不強迫 commit .atm/ runtime；不把 3KLife keep/task-lock 寫進 protected surface | 3（0001-0003） |
| M1 | 開源邊界與快速治理 | module boundary deny rule 生效；version 不依賴散落硬編碼；hook 是 opt-in host recipe | 7（0004-0010） |
| M2 | 驗證底座與測試分層 | validator harness 穩定；AJV cache 不改 pass/fail；unit / validator / release smoke 邊界清楚 | 5（0011-0015） |
| M3 | 架構拆分與 debt budget | 大檔拆分有測試保護；public CLI / schema 行為不破；例外大檔有理由 | 9（0016-0024） |
| M4 | Release parity 與開源信任 | source / root-drop / onefile / npm route 有 quick/full smoke；synthetic fixture 保持 neutral | 4（0025-0028） |
| M5 | Reproducibility / evidence loop | adopter evidence 可回流 upstream issue/RFC；multi-agent report 是 advisory | 4（0029-0032） |

## Invariant 對照表

| Invariant | 說明 | 受影響卡片 |
|-----------|------|-----------|
| I1 Public CLI surface | atm.mjs <command> --json、exit code、router 語意 | 0002, 0007, 0013, 0016, 0019, 0020 |
| I2 Schema / manifest version | schemaVersion、ATMChart、proposal、AJV 行為 | 0012, 0018, 0019 |
| I3 Release wire format | root-drop、onefile、npm route | 0003, 0025, 0027, 0032 |
| I4 Adopter-neutral | protected docs / templates / examples 不含 adopter-only 語意 | 0001, 0010, 0024, 0028, 0029 |
| I5 Hash-locked manifests | .atm/integrations/<id>.manifest.json、template hash、uninstall safety | 0017, 0021 |
| I6 Long-tail compatibility | version matrix、known-bad、downgrade、offline diagnostic | 0008, 0026 |

---

## 拆卡 SOP

1. 從索引選一張 open 卡。
2. 若要正式進 AI-Atomic-Framework，先建立 upstream-friendly artifact，而不是只更新本地卡。
3. 接任務實作時才依 3KLife 規則上鎖；本次開卡不鎖卡。
4. 觸碰 protected surface 時，驗收必須包含 node atm.mjs verify --neutrality --json 或對應 validator。
5. 若已連到 upstream issue / PR，回填 upstream_tracking 與 Notes。

## 與其他 task 系列的關係

| 系列 | 範圍 | 與 ATD 的關係 |
|------|------|-------------|
| TASK-APO-* | Agent Pack Onboarding | ATD 可引用 APO 的 first-touch / ATMChart / integration adapter 成果，但不重定義其契約 |
| TASK-MRP-* | Map Replacement Protocol | 僅在 map-generator / replacement-lane debt 牽涉時相依 |
| TASK-ATM-* | 3KLife 內 ATM 試驗 | 可提供 evidence，但不能直接成為 AI-Atomic-Framework public workflow |
| GitHub issue / PR / RFC | AI-Atomic-Framework 上游公開追蹤 | ATD 卡若要實作，必須轉譯到這一層 |
