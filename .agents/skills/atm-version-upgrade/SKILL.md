---
doc_id: doc_agentskill_0102
name: atm-version-upgrade
description: ATM 版本升級與開源 release train 工作流。USE FOR: ATM frameworkVersion 升級、release impact 分類、SemVer 決策、CODEOWNERS / changeset / release gate 檢查、ATM upstream release docs 維護。
---

# ATM Version Upgrade Skill

用於處理 `AI-Atomic-Framework` 的版本升級、release impact 分類與開源 release train 決策。此 skill 採標準 SemVer，不使用 `0.1.99.xxx` 或任何自訂版本欄位語意。

## 0. 前置原則

- 先讀 3KLife `docs/keep.summary.md`。
- 進入 `AI-Atomic-Framework` 時，先讀 `AGENTS.md` 與 `README.md`，再跑 `node atm.mjs next --json`。
- 若 ATM 要求 guidance session，先跑 `node atm.mjs start --cwd . --goal "<goal>" --json`。
- 不直接改 `.atm/` runtime；只能透過 ATM CLI。
- 不替外部 contributor 觸發正式 release、建立 release commit、推 official tag 或發布 npm dist-tag。

## 1. Discover

必讀文件：

- `C:\Users\User\AI-Atomic-Framework\docs\ai_atomic_framework\upstream-versioning-policy.md`
- `C:\Users\User\AI-Atomic-Framework\docs\ai_atomic_framework\atm-version-upgrade-strategy-plan.md`
- `C:\Users\User\AI-Atomic-Framework\docs\ai_atomic_framework\release-version-upgrade-rules.md`
- `C:\Users\User\AI-Atomic-Framework\docs\ai_atomic_framework\open-source-versioning-policy.md`
- `C:\Users\User\AI-Atomic-Framework\docs\ai_atomic_framework\contributor-release-impact.md`
- `C:\Users\User\AI-Atomic-Framework\docs\ai_atomic_framework\release_version_flow\PACKAGE_GROUPS.md`
- `C:\Users\User\AI-Atomic-Framework\.github\CODEOWNERS`

可選讀：

- `.atm/release-intents/*.md`
- `.changeset/*.md`
- `compatibility-matrix.json`
- `known-bad-versions.json`

## 2. Classify

先用 automation 分類 touched files：

```bash
node tools_node/atm-version-upgrade-flow.js classify --atm-root C:\Users\User\AI-Atomic-Framework
```

分類維度：

- `core`
- `cli`
- `plugin-sdk`
- `adapter`
- `agent-pack`
- `docs`
- `tooling`
- `example`

並判斷：

- `public_api`
- `release_surface`
- `release_impact`
- `core_impact`
- `requires_migration`
- `requires_release_note`

## 3. Impact

每個 release-relevant PR 都需要 release intent metadata：

```yaml
package_group: core | cli | plugin-sdk | adapter | agent-pack | docs | tooling | example
public_api: true | false
release_impact: none | patch | minor | major
core_impact: none | patch | minor | major
requires_migration: true | false
requires_release_note: true | false
```

用最高 `release_impact` 決定下一版：

- `none`：不升版。
- `patch`：PATCH + 1。
- `minor`：MINOR + 1，PATCH 歸 0。
- `major`：MAJOR + 1，MINOR/PATCH 歸 0。
- prerelease：`alpha.N`、`beta.N`、`rc.N`、`canary.<date>.<sha>`。

```bash
node tools_node/atm-version-upgrade-flow.js impact --version <next>
```

## 4. Validate Contributor Rules

外部 PR 若碰 core，必須檢查：

- issue/RFC 連結。
- release intent 或 changeset。
- core CODEOWNERS review。
- migration 判斷。
- integration tests。
- rollback route。

```bash
node tools_node/atm-version-upgrade-flow.js validate-contributor-impact
node tools_node/atm-version-upgrade-flow.js validate-codeowners
```

## 5. Freeze

只 freeze release surface：

- package versions。
- `compatibility-matrix.json`。
- release notes。
- root-drop / onefile artifacts。
- release workflow。
- dist-tag decision。
- known-bad readiness。

不要 freeze unrelated feature branches。

## 6. Prepare Release

Release Owner 準備：

- 同步 package versions。
- 更新 lockfile。
- 更新 compatibility matrix。
- 產生 skew matrix。
- 產生 release notes。
- 產生 release manifest。
- 準備 rollback route。

正式 release 前跑：

```bash
node tools_node/atm-version-upgrade-flow.js validate-release
```

## 7. QA

ATM upstream standard gates：

```bash
node --experimental-strip-types scripts/validate-version-compatibility.ts --mode validate
node --experimental-strip-types scripts/validate-release-trust.ts --mode validate
node --experimental-strip-types scripts/validate-skew-matrix.ts --mode validate
npm run validate:standard
```

若只是在 3KLife 驗證 automation fixture：

```bash
node tools_node/atm-version-upgrade-flow.js classify --fixture tests/fixtures/release-impact/core-change.json
node tools_node/atm-version-upgrade-flow.js classify --fixture tests/fixtures/release-impact/docs-only.json
node tools_node/atm-version-upgrade-flow.js classify --fixture tests/fixtures/release-impact/adapter-patch.json
```

## 8. Tag

正式 tag 只能由 Release Owner 或明確授權 maintainer 建立。

- 使用 annotated tag。
- 格式為 `v<frameworkVersion>`。
- tag version 必須與 package versions、compatibility matrix、release manifest 一致。
- prerelease tag 必須對應正確 dist-tag。

## 9. Post-release

Release 後記錄：

- artifact path。
- integrity manifest。
- SBOM。
- dist-tag。
- release notes。
- rollback route。
- known-bad readiness。
- compatibility matrix diff PR。

## 10. 決策準則

- 版本號只表達相容性，不表達 package group。
- Core patch 與 peripheral patch 都是 patch。
- Core/peripheral 差異寫在 release manifest。
- `0.x` 的 minor 仍需 migration note。
- 外圍 package 要 independent versioning，必須先走 RFC。
