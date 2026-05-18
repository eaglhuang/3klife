<!-- doc_id: doc_other_0230 -->
<!--
title: ATM 技術債重構計畫書
author: claude_code_opus4.7
revised_by:
  - user-report-baseline
  - codex-review
created: 2026-05-18
revised: 2026-05-18
status: proposed-revised
supersedes: use-the-engineering-tech-debt-skill-gentle-tiger（臨時 plan，過於通用）
related:
  - C:/Users/User/AI-Atomic-Framework/README.md
  - C:/Users/User/AI-Atomic-Framework/docs/ARCHITECTURE.md
  - C:/Users/User/AI-Atomic-Framework/docs/AGENT_PACK_ONBOARDING.md
  - C:/Users/User/AI-Atomic-Framework/docs/HOST_GOVERNANCE_INTEGRATION.md
  - C:/Users/User/AI-Atomic-Framework/docs/LONGTAIL_USERS.md
  - C:/Users/User/AI-Atomic-Framework/docs/governance/DOCS_NEUTRALITY_AUDIT.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
-->

# ATM 技術債重構計畫書

## 0. Codex 複核結論

本計畫的方向**合理且可行性中高**：ATM 上游確實需要把一般 TypeScript 技術債，重新套回開源治理框架的核心契約來排優先序。單純追求 lint、拆檔或測試數量，無法保證 ATM 作為 open-source framework 時最重要的事情：adopter-neutral、root-drop / onefile release parity、public CLI 穩定、schema / manifest 相容、long-tail adopter 可診斷。

但原版計畫有幾個需要修正的地方，否則會把 3KLife 內部治理習慣誤寫成 ATM 上游契約：

1. `node atm.mjs next --json` 在 upstream checkout 回 `needs-bootstrap` 不必直接判定為 bug。它可先視為 self-governance diagnosis：ATM 需要更清楚地說明 framework repo、adopter repo 與未 bootstrap repo 的差異，而不是立刻要求把 `.atm/` runtime 狀態 commit 進 upstream。
2. `docs/keep.summary.md` 是 3KLife 的協作慣例，不是 AI-Atomic-Framework 開源框架 public surface 的必要檔案。ATM upstream 應使用 `README.md`、`AGENTS.md`、AtomicCharter、ATMChart、`docs/AGENT_PACK_ONBOARDING.md` 等框架中立入口。
3. pre-commit hook 只能是 host-side opt-in recipe。ATM 可以提供 Git hook / CI 範例，但不能把 husky、lefthook、3KLife task-lock 或任何單一 host workflow 變成 core 或 root-drop runtime 硬依賴。
4. 本目錄的 `TASK-ATD-*` 任務卡只能當作 3KLife 內部協作鏡像。真正進入 AI-Atomic-Framework 的工作，應以 GitHub issue、RFC、PR checklist、validator fixture 與 release gate 表達，不應要求 public contributors 使用 3KLife 私有任務卡格式。
5. 原計畫中的部分數字與命令已過期：目前觀測到 `upgrade.ts` 約 1231 行，`tests/` 已有大量 test 檔，問題不是「沒有測試」，而是 validator-heavy、層級混雜、快速單元測試與 release smoke 邊界仍可加強。部分驗證命令也需改用現有 `package.json` script 或直接呼叫 `node --experimental-strip-types scripts/...`。

修訂後的主判斷是：**先保開源框架邊界，再做一般工程重構**。能提升可維護性的事項仍應做，但所有任務必須先回答：它是否保持 ATM 的中立性、可發佈性、可替換 adapter/plugin 邊界，以及長尾使用者相容性。

---

## 0.1 本計畫與其他計畫的邊界

本計畫只管 `AI-Atomic-Framework` 上游技術債與開源框架品質，不管 3KLife 遊戲本體，也不把 npc-brain 當成 framework truth source。

```text
ATM 技術債重構計畫 -> 修 AI-Atomic-Framework 上游工程品質
ATM 引導工程計畫書 -> 管 first-touch / agent pack / ATMChart / integration adapter
3KLife ATM 採用三角策略規劃書 -> 用 adopter evidence 驗收 upstream
```

三者可以互相提供 evidence，但權威邊界不同：

| 文件 | 權威範圍 | 不應做的事 |
|---|---|---|
| 本計畫 | AI-Atomic-Framework 技術債、驗證分層、release parity | 把 3KLife / npc-brain 寫成 upstream public contract |
| ATM 引導工程計畫書 | Agent Operating Layer、ATMChart、integration adapter、first-touch | 重新定義 core schema 或 host 私有流程 |
| 三角策略規劃書 | 3KLife / npc-brain 作為實驗與 adopter 驗收場 | 私下維護 upstream fork 或把 adopter 特例塞進 core |

---

## 0.2 不可破壞契約（Invariants）

所有 milestone 與 task 都必須先通過以下開源框架契約檢查。若 PR 觸碰相關 surface，必須在 PR 描述、issue 或內部任務卡標註 invariant risk 與緩解策略。

### I1：Public CLI surface 穩定

- `node atm.mjs <command> --json` 的輸出 shape、命令名稱、exit code 語意不得在 patch / minor 內無遷移地 breaking change。
- `atm next --json` 是 deterministic router；welcome、agent pack、hook、README 只能導路，不能取代它。

### I2：Schema 與 manifest 版本契約

- `schemaVersion`、ATMChart frontmatter、InstallManifest、integration manifest 等 machine-readable surface 必須 additive-first。
- 破壞性 schema 變更必須有 migration guide、validator fixture 與 long-tail diagnostic。

### I3：Release wire format

- `release/atm-root-drop/`、`release/atm-onefile/atm.mjs`、npm / `create-atm` 的 install layout 與啟動路徑必須同步驗證。
- source checkout 綠燈不等於 release bundle 綠燈。

### I4：Adopter-neutral 保證

- AI-Atomic-Framework 的 protected public surface 不得寫入 3KLife、npc-brain、Cocos、task-lock、tools_node 或其他 adopter-only 語意。
- 需要 adopter 案例時，放在下游 case study、adapter docs 或本機內部計畫，不回寫 protected upstream docs。

### I5：Hash-locked integration manifests

- 實際 integration manifest 位於 `.atm/integrations/<id>.manifest.json`；hash 計算、路徑正規化、行尾、編碼處理不得無遷移地改變。
- agent entry files 是渲染產物，不是第二套權威規則。

### I6：Long-tail compatibility

- 已發佈 chart / template / schema 不得在無 migration 與 deprecation window 下移除。
- `docs/LONGTAIL_USERS.md` 的原則是 diagnosable first, mutable second；未知、過舊、離線或 downgrade 狀態應 fail closed 到 read-only diagnostic。

---

## 1. 可行性與不合理處複核

### 1.1 合理且應保留的判斷

| 原判斷 | 複核結果 |
|---|---|
| 一般 tech-debt skill 不足 | 正確。ATM 的技術債排序必須看治理契約，不只看行數與 lint。 |
| 先測試再拆大檔 | 正確。尤其 `upgrade.ts`、`propose.ts`、`atm-chart.ts` 都牽涉 public CLI 或 schema 行為。 |
| release parity 是硬需求 | 正確。root-drop / onefile / package 發佈是 ATM adopter 的主要入口。 |
| `frameworkVersion = '0.0.0'` 不是小事 | 正確。它會影響 ATMChart compatibility、known-bad、version skew、telemetry 與 release trust。 |
| hook 需要 ATM 化 | 方向正確，但必須改成 opt-in host recipe，而不是強制 upstream runtime 依賴。 |

### 1.2 必須修正的判斷

| 原判斷 | 問題 | 修正後策略 |
|---|---|---|
| upstream `needs-bootstrap` 代表 ATM 連自己都沒採用自己 | 過度推論。framework repo 可不同於 adopter repo。 | M0 改為 self-governance diagnosis：釐清 framework/adopter/unbootstrapped 三種狀態與 next action。 |
| 補 `docs/keep.summary.md` 是 M0 必做 | 這是 3KLife 慣例，不是開源 ATM 契約。 | 上游只補框架中立 agent entry guidance；keep summary 留在 3KLife。 |
| pre-commit hook task 放 `.husky/pre-commit` | 會把特定 hook 工具與 host policy 寫進 upstream。 | 改為 host governance example / CI recipe；不進 root-drop / onefile runtime。 |
| 任務卡是上游實作入口 | 3KLife task card 格式不是 public contributor contract。 | 內部可保留鏡像；上游正式追蹤用 issue / RFC / PR checklist。 |
| `tests/` 只有 35 個 test | 現況不符。 | 改描述為測試數量不少，但 validator-heavy、unit / integration / release smoke 邊界可加強。 |
| `npm run validate:version-skew` 等 script | 現有 `package.json` 沒有這些 script 名稱。 | 用 `npm run validate:standard`，或直接呼叫對應 `scripts/validate-*.ts`。 |

### 1.3 開源框架特性帶來的額外要求

- **Public docs 不能綁 adopter**：AI-Atomic-Framework 的 README、docs、schemas、templates、examples 需要通過 neutrality scan；3KLife 相關內容只能留在本目錄或 downstream docs。
- **Core 不依賴 default bundle**：技術債重構不能把 default governance bundle、agent pack、hook 或 local task store 下沉進 `packages/core`。
- **Adapter/plugin 是替換邊界**：host storage、Git hook、issue tracker、language tooling、Cocos 或 3KLife workflow 都只能透過 adapter/plugin 表達。
- **Release artifact 是產品面**：開源 adopter 多半拿 root-drop、onefile 或 npm，而非 source checkout；任何 CLI / core refactor 都要驗 release wrapper。
- **Long-tail 使用者要可診斷**：舊版 chart、unknown chart、downgrade、offline matrix 都不能被重構破壞。

---

## 2. 修訂後優先序

PD = person-days；`TASK-ATD-*` 是 3KLife 內部鏡像編號，不是 upstream public issue 編號。正式進 AI-Atomic-Framework 時，需另開 GitHub issue / RFC / PR。

### M0：Self-Governance Diagnosis（先釐清，不急著 commit runtime）

| P | 項目 | 工期 | 內部卡 | 關鍵檔案 / surface |
|---|---|---:|---|---|
| P0 | 補框架中立 `AGENTS.md` 或等價 agent entry guidance | 0.5 PD | TASK-ATD-0001 | `AGENTS.md`（新）、`README.md` |
| P0 | 釐清 `atm next --json` 在 framework repo / adopter repo / unbootstrapped repo 的語意 | 1 PD | TASK-ATD-0002 | `packages/cli/src/commands/next.ts`、`docs/SELF_HOSTING_ALPHA.md` |
| P0 | 決定 upstream 是否需要 `.atm.example/`、`examples/self-host/` 或只保留 diagnostic | 1 PD | TASK-ATD-0003 | `docs/SELF_HOSTING_ALPHA.md`、`examples/` |

**M0 退出條件：**

- `node atm.mjs doctor --json` 在 upstream 維持 `ATM_DOCTOR_OK` 或有明確 known-limitation。
- `node atm.mjs next --json` 的 `needs-bootstrap` 若仍存在，文件與 JSON reason 必須清楚指出這是未採用 / 未啟動狀態，而非 silent failure。
- 不把 3KLife 的 `docs/keep.summary.md` 或 task-lock 規則寫進 AI-Atomic-Framework protected surface。

### M1：開源邊界與快速治理修正

| P | 項目 | 工期 | 內部卡 | 關鍵檔案 / surface |
|---|---|---:|---|---|
| P1 | 模組邊界硬化：package runtime 不直接 import `scripts/` | 0.5 PD | TASK-ATD-0004 | `packages/cli/src/commands/doctor.ts`、`self-host-alpha.ts` |
| P1 | 擴充 `validate-module-boundaries.ts`：加入 package runtime -> scripts deny fixture | 0.5 PD | TASK-ATD-0005 | `scripts/validate-module-boundaries.ts` |
| P1 | ESLint baseline：先 warning / budget，不一次升級成全 repo error | 1 PD | TASK-ATD-0006 | `eslint.config.mjs` |
| P1 | CLI 公共型別與 shared command result 收斂 | 3 PD | TASK-ATD-0007 | `packages/cli/src/commands/shared.ts`、`packages/cli/src/atm.ts` |
| P1 | framework version 來源改為 package / release manifest，而非寫死 `0.0.0` | 1 PD | TASK-ATD-0008 | `packages/cli/src/commands/shared.ts`、`packages/cli/src/index.ts` |
| P1 | 環境變數 registry / docs：集中宣告 `ATM_*` 與 agent-related env | 1 PD | TASK-ATD-0009 | `packages/cli/src/config/`、`docs/environment-variables.md` |
| P1 | Git hook / CI enforcement 改為 opt-in host recipe | 0.5 PD | TASK-ATD-0010 | `examples/git-hooks-enforcement/`、`docs/HOST_GOVERNANCE_INTEGRATION.md` |

**M1 退出條件：**

- `npm run typecheck`、`npm run lint` 通過或有明確 baseline policy。
- `npm run validate:module-boundaries` 能阻擋 package runtime import `scripts/`。
- `node atm.mjs --version` 與 version compatibility report 不再依賴散落的硬編碼 `0.0.0`。
- hook 相關變更不進入 core、root-drop runtime 或 onefile runtime。

### M2：驗證底座與測試分層

| P | 項目 | 工期 | 內部卡 | 關鍵檔案 / surface |
|---|---|---:|---|---|
| P2 | Validator harness 分批收斂，降低每支 validator 手寫重複 | 2 PD | TASK-ATD-0011 | `scripts/lib/validator-harness.ts`、`scripts/validate-*.ts` |
| P2 | AJV factory/cache 共用化，但 pass/fail 行為不得改變 | 0.5 PD | TASK-ATD-0012 | `packages/core/src/validation/`、schema validators |
| P2 | CLI error policy：`CliError`、typed code、usage error exit code 分層 | 2 PD | TASK-ATD-0013 | `packages/cli/src/commands/shared.ts` |
| P2 | 測試分層：unit / validator / release smoke / self-host alpha | 3 PD | TASK-ATD-0014 | `tests/`、`scripts/run-validators.ts` |
| P2 | 第一批快速單元測試：URN、map allocator、shared command helpers | 2 PD | TASK-ATD-0015 | `tests/unit/` 或現有測試目錄 |

**M2 退出條件：**

- `npm run validate:quick` 維持快速且結果穩定。
- `npm run validate:standard` 不因 harness refactor 產生行為差異。
- 新增測試分層文件，說明何時用 validator fixture、何時用 unit test、何時用 release smoke。

### M3：架構拆分與 any debt budget

目前觀測大檔以 source 為準，約略如下：`upgrade.ts` 1231 行、`plugin-governance-local/src/index.ts` 982 行、`propose.ts` 942 行、`atm-chart.ts` 806 行、`command-specs.ts` 669 行、`map-generator.ts` 607 行、`integrations-core/src/index.ts` 600 行、`stores.ts` 596 行。行數會隨上游變動，任務啟動時需重新量測。

| P | 項目 | 工期 | 內部卡 | 關鍵檔案 / surface |
|---|---|---:|---|---|
| P3 | `upgrade.ts` 拆分，保持 public CLI JSON contract | 5 PD | TASK-ATD-0016 | `packages/cli/src/commands/upgrade.ts` |
| P3 | `plugin-governance-local` 拆分前先做 export maturity inventory | 4 PD | TASK-ATD-0017 | `packages/plugin-governance-local/src/index.ts` |
| P3 | `propose.ts` 拆分 proposal analysis / gate / output | 3 PD | TASK-ATD-0018 | `packages/core/src/upgrade/propose.ts` |
| P3 | `atm-chart.ts` 拆分 render / verify / compatibility helper | 3 PD | TASK-ATD-0019 | `packages/cli/src/commands/atm-chart.ts` |
| P3 | `command-specs.ts` 拆分 command metadata 與 renderer | 2 PD | TASK-ATD-0020 | `packages/cli/src/commands/command-specs.ts` |
| P3 | `integrations-core` 拆分 adapter compiler / manifest / verify | 2 PD | TASK-ATD-0021 | `packages/integrations-core/src/index.ts` |
| P3 | `map-generator.ts` 拆分 allocation / scaffold / provenance | 2 PD | TASK-ATD-0022 | `packages/core/src/manager/map-generator.ts` |
| P3 | `any` debt budget：以 package / public contract 風險分層，不一次清零 | 8 PD（分散） | TASK-ATD-0023 | `eslint.config.mjs`、多個 source |
| P3 | 開源文件補強：env、troubleshooting、adapter examples | 2 PD | TASK-ATD-0024 | `docs/environment-variables.md`、`docs/troubleshooting.md` |

**M3 退出條件：**

- 大檔拆分 PR 不混入 bug fix；每個 PR 都有 before/after behavior evidence。
- `npm test`、`npm run validate:full`、release wrapper smoke 通過。
- 任何超過 500 行仍保留的檔案需標註理由，例如 transitional alpha 或生成檔。

### M4：開源採用者信任與 release parity

| P | 項目 | 工期 | 內部卡 | 關鍵檔案 / surface |
|---|---|---:|---|---|
| P4 | Release parity gate：source / root-drop / onefile / npm route | 2 PD | TASK-ATD-0025 | `.github/workflows/`、`scripts/validate-*-release.ts` |
| P4 | Version compatibility、known-bad、release trust 持續驗證 | 1 PD | TASK-ATD-0026 | `scripts/validate-version-compatibility.ts`、`validate-known-bad-versions.ts`、`validate-release-trust.ts` |
| P4 | root-drop PS1/SH wrapper 去重，保留跨平台 parity | 3 PD | TASK-ATD-0027 | `templates/root-drop/.atm/scripts/`、`release/atm-root-drop/templates/` |
| P4 | Synthetic adopter fixture：只用中立樣本，不放 3KLife / npc-brain 到 protected surface | 2 PD | TASK-ATD-0028 | `scripts/adopter-sentinel.ts`、`fixtures/` |

**M4 退出條件：**

- 每 PR 有 quick release smoke；merge / release 前有 full release smoke。
- root-drop / onefile 行為與 source command 保持等價。
- synthetic fixture 不含 adopter-only banned terms。

### M5：長期可重現性與 adopter evidence loop

| P | 項目 | 工期 | 內部卡 | 關鍵檔案 / surface |
|---|---|---:|---|---|
| P5 | 正式化 adopter sentinel external profile，但只作下游 evidence | 3 PD | TASK-ATD-0029 | `scripts/adopter-sentinel.ts` |
| P5 | Multi-agent confidence report 沿用既有 matrix / result 機制 | 2 PD | TASK-ATD-0030 | `docs/multi-agent-*.md`、generator scripts |
| P5 | Docker / devcontainer 僅作 contributor reproducibility，不作 runtime requirement | 3 PD | TASK-ATD-0031 | `Dockerfile`、`.devcontainer/` |
| P5 | Root-drop sandbox E2E | 3 PD | TASK-ATD-0032 | `tests/e2e/` 或 release validator fixture |

**M5 退出條件：**

- CI 可重現 release smoke。
- adopter evidence 能回流成 upstream issue / proposal，不污染 protected docs。
- multi-agent report 能作 advisory，不阻塞 alpha0 基線。

---

## 3. 依賴關係圖

```text
[M0 Self-Governance Diagnosis]
        |
        +--> [M1 Open-source Boundary] --> [M1 CLI Types / Version]
        |              \                         |
        |               +--> [M1 Host Recipe]    |
        |                                         v
        +--> [M2 Test Layers / Validator Harness] --> [M3 Large-file Split]
                                       |
                                       v
                              [M4 Release Parity]
                                       |
                                       v
                              [M5 Reproducibility / Evidence Loop]

跨計畫銜接：
[本計畫 M0 診斷清楚] -> [三角策略 M1 dry-run 可解讀]
[本計畫 M4 release parity 穩定] -> [三角策略 M5 sentinel evidence 可回流]
```

---

## 4. 任務追蹤策略

本目錄的 `tasks/` 是 3KLife 內部協作鏡像，用於幫本地 agent 拆工、鎖卡與保留思路。它不是 AI-Atomic-Framework public contributor contract。

### 4.1 內部任務卡命名

```text
TASK-ATD-{NNNN}-{slug}.task.md
```

- `ATD` = ATM Tech Debt。
- `NNNN` = 內部序號。
- 狀態欄位需明確標示 `internal-mirror` 或同等語意，避免被誤解為 upstream issue。

### 4.2 上游正式追蹤

當某張 ATD 卡真的要進 AI-Atomic-Framework，必須轉成至少一種 upstream-friendly artifact：

- GitHub issue 或 PR checklist。
- RFC / design note。
- validator fixture / failing test。
- release gate 或 CI check。
- docs update，且通過 neutrality scan。

### 4.3 任務卡 frontmatter 修訂方向

內部卡可保留 3KLife 欄位，但需要新增：

```yaml
tracking_scope: internal-mirror
upstream_tracking: pending-github-issue|pending-rfc|linked-pr|not-needed
public_surface_risk: none|docs|cli|schema|release|manifest
neutrality_required: true|false
```

`allowed_files` 若指向 AI-Atomic-Framework protected surface，必須補 `neutrality_required: true` 與對應 validator。

---

## 5. Test Plan

### 5.1 每 PR 基線

- `npm run typecheck`
- `npm run lint`
- `npm test`

### 5.2 治理 validator

- `npm run validate:quick`
- `npm run validate:standard`
- `npm run validate:full`（週期性或 release 前）
- `node atm.mjs verify --neutrality --json`

### 5.3 版本與 release trust

現有 `package.json` 未提供 `validate:version-skew`、`validate:known-bad`、`validate:release-trust` 這些 script 名稱；若需要單跑，使用實際 validator：

```bash
node --experimental-strip-types scripts/validate-version-compatibility.ts --mode validate
node --experimental-strip-types scripts/validate-skew-matrix.ts --mode validate
node --experimental-strip-types scripts/validate-known-bad-versions.ts --mode validate
node --experimental-strip-types scripts/validate-release-trust.ts --mode validate
```

### 5.4 Self-governance sanity

- `node atm.mjs doctor --json`
- `node atm.mjs next --json`
- `node atm.mjs self-host-alpha --verify --json`

`next --json` 若回 `needs-bootstrap`，驗收重點不是強迫它變 `ok: true`，而是確認 reason、allowed commands、blocked commands 與 docs 能讓 framework maintainer 正確理解狀態。

### 5.5 Release parity

- `npm run build`
- `node release/atm-root-drop/atm.mjs next --json`
- `node release/atm-onefile/atm.mjs next --json`
- `npm run validate:root-drop-release`
- `npm run validate:onefile-release`

### 5.6 邊界驗證

- negative fixture：package runtime import `scripts/` 必須被擋。
- positive fixture：`package.json` scripts 呼叫 `scripts/validate-*.ts` 仍允許。
- protected surface neutrality：不能出現 adopter-only term 或 non-ASCII protected filename。

---

## 6. 風險登記簿

### R1：M0 被「一定要 dogfood 自己」綁死

**機率：** 中
**衝擊：** 高
**修正後緩解：** M0 改成 diagnosis，不要求第一輪就 commit `.atm/` runtime。候選解法是 `.atm.example/`、`examples/self-host/`、或明確 framework repo diagnostic。是否 dogfood root runtime 需 RFC 決策。

### R2：把 3KLife keep / task-lock 習慣誤升為 upstream contract

**機率：** 高
**衝擊：** 高
**緩解：** AI-Atomic-Framework protected docs 只能引用 ATM 中立入口；3KLife 協作規則留在本 repo 或 downstream adapter docs。

### R3：Pre-commit hook 變成 adopter 硬依賴

**機率：** 中
**衝擊：** 高
**緩解：** hook 只做 examples / recipe，不 ship 成 root-drop 必裝項；CI gate 也應可由 host 自行選擇。

### R4：拆大檔破壞 public CLI 或 schema 行為

**機率：** 中
**衝擊：** 高
**緩解：** M2 測試與 validator fixture 先行；拆檔 PR 不同時修 bug；每 PR 跑 release wrapper smoke。

### R5：Release parity smoke 太慢

**機率：** 高
**衝擊：** 中
**緩解：** quick smoke 每 PR；full smoke release 前或 merge queue；慢測試保留清楚 tag。

### R6：版本命令與 script 名稱漂移

**機率：** 中
**衝擊：** 中
**緩解：** 文件優先引用 `package.json` 實際 scripts；沒有 script 時直接列 `node --experimental-strip-types scripts/...`。

### R7：internal task cards 被誤認成 open-source workflow

**機率：** 高
**衝擊：** 中
**緩解：** `tasks/README.md` 明確標示 internal mirror；上游實作必須轉 GitHub issue / RFC / PR checklist。

### R8：Adopter sentinel 污染 protected docs

**機率：** 中
**衝擊：** 高
**緩解：** sentinel 可收 external evidence，但 public framework docs 只描述 neutral fixture 與 adapter boundary，不寫 adopter 名稱。

---

## 7. 開放議題

### Q1：AI-Atomic-Framework 是否要 commit `.atm/` runtime？

建議預設：**不在 M0 直接 commit**。先用 diagnostic / example / RFC 釐清。若要真正 dogfood root runtime，需確認 release artifact 不會把 maintainer-local runtime 狀態帶給 adopter。

### Q2：是否需要上游 `AGENTS.md`？

建議：可以新增，但內容必須框架中立，只導向 README、`node atm.mjs next --json`、ATMChart / AtomicCharter，不引用 3KLife keep summary 或私有任務卡。

### Q3：pre-commit 是 blocking 還是 advisory？

建議：在 upstream repo 可 blocking；對 adopter 只能提供 advisory / opt-in recipe。

### Q4：大檔拆分的行數目標是否硬性 500 行？

建議：500 行作為 warning budget，不作絕對門檻。transitional alpha、generated dist 或密集 command spec 可用例外，但需要理由。

### Q5：Docker / devcontainer 是否進 M5？

建議：保持 M5 optional contributor reproducibility，不成為 runtime 或 adopter bootstrap 前提。

---

## 8. 立即執行順序

### 第一輪：文件與診斷校正

1. 更新本計畫與 `tasks/README.md`，標示 feasibility、open-source boundary、internal mirror。
2. 記錄 upstream 現況：`node atm.mjs doctor --json`、`node atm.mjs next --json`、大檔行數、現有 test 數量。
3. 把 `needs-bootstrap` 從「必定是 bug」改成「需要診斷語意更清楚」。
4. 確認所有引用命令在 AI-Atomic-Framework `package.json` 或 `scripts/` 中存在。

### 第二輪：M0 / M1 開工

5. 若新增上游 `AGENTS.md`，只寫框架中立入口。
6. 擴充 module boundary validator 與 negative fixture。
7. 修 version 來源與 CLI shared result types。
8. 將 hook work 改到 `examples/git-hooks-enforcement/` 或 docs recipe。

### 明確暫緩

- 不在 M0 diagnosis 前 commit `.atm/` runtime 到 upstream。
- 不把 `docs/keep.summary.md` 加進 AI-Atomic-Framework 作為 public contract。
- 不在 M2 前拆 `upgrade.ts`、`propose.ts` 等高風險大檔。
- 不在 M4 前改 release artifact format。
- 不把 3KLife / npc-brain 寫入 upstream protected docs。

---

## 9. 成功定義

本計畫成功時，應同時滿足：

1. AI-Atomic-Framework 的 public docs、schemas、templates、examples 維持 adopter-neutral。
2. `atm next --json`、`doctor --json`、`welcome`、ATMChart 與 integration adapter 的權威邊界清楚，沒有第二套 task / approval / rule model。
3. `npm run typecheck`、`npm run lint`、`npm test`、`npm run validate:standard` 穩定。
4. release parity 覆蓋 source、root-drop、onefile 與 npm route。
5. `frameworkVersion` 與 compatibility matrix / known-bad / release trust chain 對齊，不再靠散落硬編碼。
6. 大檔拆分在測試保護下進行，public CLI JSON 與 schema 行為不破。
7. internal `TASK-ATD-*` 卡能映射到 upstream issue / RFC / PR evidence，但不要求 public contributor 使用 3KLife 任務卡。
8. 三角策略收集到的 adopter evidence 能回流 upstream，而不把 adopter 特例下沉到 core。

---

## 10. 假設與前提

- **A1**：AI-Atomic-Framework 是 ATM 上游真相來源。
- **A2**：3KLife 是研發試驗場與內部協作場，不是 ATM public workflow 的模板。
- **A3**：npc-brain 或其他 adopter repo 可作 evidence source，但不是 upstream public contract。
- **A4**：Dev dependency 可以增加，但 root-drop / onefile runtime 必須保持輕量、可攜、可離線診斷。
- **A5**：`any`、大檔、ESLint debt 採 budget 化漸進治理，不一次清零。
- **A6**：Hook / CI enforcement 是 host-side layer，不是 ATM core contract。
- **A7**：本計畫可分批交付；每批都必須留下 validator、evidence 或 release smoke。

---

## 11. 與其他文件的關係

### 11.1 取代

- 取代臨時 plan `C:/Users/User/.claude/plans/use-the-engineering-tech-debt-skill-gentle-tiger.md`（過於通用，未 ATM 化）。

### 11.2 上游互補

- 與 `agent-pack-onboarding/ATM引導工程計畫書.md` 並列：那份管 first-touch / agent pack；本份管 upstream 技術債。

### 11.3 跨 repo 銜接

- 與 `3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md` interlock：三角策略回收 adopter evidence，本計畫決定 upstream 如何吸收。

### 11.4 不取代

- 不取代 AI-Atomic-Framework 的 `README.md`、`docs/ARCHITECTURE.md`、`docs/AGENT_PACK_ONBOARDING.md`、`docs/HOST_GOVERNANCE_INTEGRATION.md`、`docs/LONGTAIL_USERS.md`。
- 不取代 upstream versioning policy 或 compatibility matrix。
- 不取代 default governance bundle 設計。

---

## 12. 參考資料

### 上游文件

- `C:/Users/User/AI-Atomic-Framework/README.md`
- `C:/Users/User/AI-Atomic-Framework/docs/ARCHITECTURE.md`
- `C:/Users/User/AI-Atomic-Framework/docs/AGENT_PACK_ONBOARDING.md`
- `C:/Users/User/AI-Atomic-Framework/docs/HOST_GOVERNANCE_INTEGRATION.md`
- `C:/Users/User/AI-Atomic-Framework/docs/LONGTAIL_USERS.md`
- `C:/Users/User/AI-Atomic-Framework/docs/governance/DOCS_NEUTRALITY_AUDIT.md`

### 上游檢查命令

```bash
node atm.mjs doctor --json
node atm.mjs next --json
npm run typecheck
npm run lint
npm test
npm run validate:standard
node atm.mjs verify --neutrality --json
```

### 上游大檔觀測（2026-05-18）

- `packages/cli/src/commands/upgrade.ts`：約 1231 行
- `packages/plugin-governance-local/src/index.ts`：約 982 行
- `packages/core/src/upgrade/propose.ts`：約 942 行
- `packages/cli/src/commands/atm-chart.ts`：約 806 行
- `packages/cli/src/commands/command-specs.ts`：約 669 行
- `packages/core/src/manager/map-generator.ts`：約 607 行
- `packages/integrations-core/src/index.ts`：約 600 行
- `packages/plugin-governance-local/src/stores.ts`：約 596 行

行數是風險訊號，不是唯一成功標準；任務啟動時需重新量測。

---

## 13. 本計畫的開卡入口

下一步不是直接開 32 張 public 任務，而是先修 `tasks/README.md`：明確標示 ATD 任務卡是 3KLife 內部鏡像，並把 M0 改成 self-governance diagnosis。完成後再把 M0 / M1 中真正要進 upstream 的項目轉成 GitHub issue、RFC 或 PR checklist。
