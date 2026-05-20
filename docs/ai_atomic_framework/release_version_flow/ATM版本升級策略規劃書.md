<!-- doc_id: doc_other_0722 -->
# ATM 版本升級策略規劃書

本計畫書整合 ATM 開源版本策略、版本升級 skill、release 文件歸位與 3KLife 端文件整併規則。目標是讓版本號保持標準 SemVer，讓 core/peripheral 影響範圍交給 release intent、changeset 與 release manifest 表達。

## 1. Research Basis

1. ATM 採標準 SemVer，不自訂 `0.1.99.xxx`。SemVer 官方只定義 `MAJOR.MINOR.PATCH`，另加 prerelease/build metadata；`MAJOR` 表示不相容 API、`MINOR` 表示相容功能、`PATCH` 表示相容 bugfix。參考 [Semantic Versioning](https://semver.org/)。
2. 多 package monorepo 版本策略採 fixed train 或 independent version 二選一。Lerna 支援 `fixed/locked` 與 `independent`，Changesets 支援 fixed/linked package group。
3. React、Angular 這類框架以穩定 release train、SemVer 與 prerelease/canary channel 管理核心演進，不把子系統含義塞進版本號數字。
4. typescript-eslint 是 ATM 的主要對照：公開 packages 採同一版號方便安裝與協調，非 public API surface 不參與版本計算。
5. 開源 PR 管理靠 changeset、CODEOWNERS、required review、CI gate，而不是禁止外部 contributor 修改 core。
6. 社群 monorepo 討論的共同痛點是多版本會快速增加維護成本；ATM 初期以固定核心依賴與 release manifest 表達影響範圍。

## 2. Version Strategy

ATM 採「單一 ATM Framework Release Train + 影響範圍 metadata」。

1. `frameworkVersion` 永遠使用標準 SemVer：`MAJOR.MINOR.PATCH[-alpha.N|-beta.N|-rc.N|-canary.<date>.<sha>]`。
2. 不採用 `0.1.99.xxx`，也不把 `core`、`peripheral`、adapter 或 plugin 類型編入版號數字。
3. `core` bugfix 與 `peripheral` bugfix 都是 `PATCH`，差別寫入 release manifest，不寫入版本號。
4. `core` backward-compatible feature 是 `MINOR`；`core` breaking change 是 `MAJOR`。
5. 在 `0.x` 階段，`MINOR` 視為可能 breaking，必須有 migration note。
6. 官方 adapter、plugin、agent-pack 若仍屬 ATM release train，預設跟 framework 同版。
7. 只有當 package 有獨立消費者、獨立 cadence、獨立相容範圍時，才透過 RFC 升格為 independent package version。

## 3. Release Impact Metadata

每個 release intent 或 changeset 必須能產生以下 metadata：

```yaml
package_group: core | cli | plugin-sdk | adapter | agent-pack | docs | tooling | example
public_api: true | false
release_impact: none | patch | minor | major
core_impact: none | patch | minor | major
requires_migration: true | false
requires_release_note: true | false
```

判斷原則：

1. `release_impact` 決定整體版本升級下限。
2. `core_impact` 只描述 core 風險與審核門檻，不直接製造自訂版號。
3. `public_api: false` 且無公開行為改變時，可標 `release_impact: none`。
4. 任一 package 有 `major` impact，整個 fixed train 進入 `MAJOR` 或 prerelease major path。

## 4. Open Source Contribution Strategy

1. 外部 contributor 可以提交 core PR，但必須通過 issue/RFC 連結、changeset 或 release intent、core CODEOWNERS review、migration 判斷與 integration tests。
2. 外部 contributor 不可直接觸發 framework release、建立正式 release commit 或推 official tag。
3. `docs/test/internal refactor` 可標 `release_impact: none`，但仍需確認不改 public behavior。
4. `adapter/plugin/agent-pack public behavior` 至少需要 patch/minor changeset，並進 release note。
5. `release surface` 變更即使不是 core，也需要 Release Owner review。

## 5. Release Flow

ATM 版本升級 skill 的主線流程為：

1. Discover：讀版本政策、package group、CODEOWNERS、release intent。
2. Classify：掃描變更檔案，分類 `core`、`public`、`non-public`、`docs`、`tooling`、`peripheral`。
3. Impact：要求或產生 release impact metadata。
4. Version Decide：用最高 impact 決定 `PATCH`、`MINOR`、`MAJOR` 或 prerelease。
5. Validate Contributor Rules：外部 PR 若碰 core，檢查 RFC、owner review、migration 與 tests。
6. Freeze：只 freeze release surface，不 freeze unrelated feature branches。
7. Prepare Release：同步 package versions、matrix、lockfile、skew matrix 與 release notes。
8. QA：跑 standard validators、root-drop/onefile、adapter install、fresh adopter smoke。
9. Tag：Release Owner 建 annotated tag。
10. Post-release：記錄 artifact、dist-tag、rollback route 與 known-bad readiness。

## 6. 3KLife 文件整併補案

本輪文件整併把 release/version flow 從分散根目錄改為集中 canonical 目錄：

1. 新增入口索引：`docs/ai_atomic_framework/release_version_flow/README.md`。
2. 新增正式中文版規則書：`docs/ai_atomic_framework/release_version_flow/ATM版本升級規則書.md`。
3. 移入並整理既有流程文件：`docs/RELEASE_CHECKLIST.md` 與 `docs/UPGRADE_PROPOSAL_PUBLIC_RULES.md`。
4. 收編既有 release run 文件：`docs/releases/*.md` 進 `release_runs/`。
5. 新增 release note、release run record、release freeze notice 三份模板。
6. 原位置只保留短 stub，內容只指向新 canonical 位置。
7. doc-id registry 同步登記新 canonical 文件，舊 doc_id 保留給 stub，避免舊連結立即斷裂。

## 7. Validation Plan

本計畫落地後，至少執行：

```bash
rg -n "0.1.99|independent|fixed|CODEOWNERS|release_impact|core_impact" docs/ai_atomic_framework/release_version_flow
node tools_node/check-encoding-integrity.js --files <touched-docs>
node tools_node/check-context-budget.js --changed --emit-keep-note
```

若同步驗證 ATM upstream release gate，使用：

```bash
node --experimental-strip-types scripts/validate-version-compatibility.ts --mode validate
node --experimental-strip-types scripts/validate-release-trust.ts --mode validate
node --experimental-strip-types scripts/validate-skew-matrix.ts --mode validate
npm run validate:standard
```

若驗證版本升級 automation，使用：

```bash
node tools_node/atm-version-upgrade-flow.js classify --fixture tests/fixtures/release-impact/core-change.json
node tools_node/atm-version-upgrade-flow.js classify --fixture tests/fixtures/release-impact/docs-only.json
node tools_node/atm-version-upgrade-flow.js classify --fixture tests/fixtures/release-impact/adapter-patch.json
```

## 8. Assumptions

1. ATM 初期採 fixed release train，所有公開官方 packages 同版，降低開源初期溝通成本。
2. 外圍 packages 暫不獨立版號；等真的有獨立消費者與獨立 release cadence，再透過 RFC 拆出 independent versioning。
3. Core 對外部 contributor 開放，但必須經 CODEOWNERS、Release Owner、CI 與 migration gate。
4. 版本號只表達相容性等級；core/peripheral、影響範圍與風險等級交給 release intent、changeset 與 release manifest 表達。
