<!-- doc_id: doc_other_0729 -->
# ATM 版本升級規則書

本規則書是 3KLife 端 ATM release/version flow 的正式中文版規則。它整合 SemVer、開源 PR、release intent、QA gate、tag、rollback 與文件歸位策略。

## A. Discover

升級開始前必讀：

1. [OPEN_SOURCE_VERSIONING_POLICY.md](./OPEN_SOURCE_VERSIONING_POLICY.md)
2. [PACKAGE_GROUPS.md](./PACKAGE_GROUPS.md)
3. [CODEOWNERS_POLICY.md](./CODEOWNERS_POLICY.md)
4. [CHANGESET_POLICY.md](./CHANGESET_POLICY.md)
5. PR 內的 changeset 或 `.atm/release-intents/*.md`

Automation：

```bash
node tools_node/atm-version-upgrade-flow.js classify --atm-root C:\Users\User\AI-Atomic-Framework
```

## B. Classify

掃描變更檔案並分類：

1. `core`
2. `public`
3. `non-public`
4. `docs`
5. `tooling`
6. `peripheral`

分類只判斷影響面，不直接決定版本號。

## C. Impact

每個 PR 必須有 release impact metadata，或由 maintainer 補上：

```yaml
package_group: core | cli | plugin-sdk | adapter | agent-pack | docs | tooling | example
public_api: true | false
release_impact: none | patch | minor | major
core_impact: none | patch | minor | major
requires_migration: true | false
requires_release_note: true | false
```

Automation：

```bash
node tools_node/atm-version-upgrade-flow.js impact --version <next>
```

## D. Version Decide

版本決策以所有 release intent 的最高 impact 為準：

1. 全部 `none`：不升版。
2. 最高 `patch`：`PATCH`。
3. 最高 `minor`：`MINOR`。
4. 最高 `major`：`MAJOR`。
5. prerelease channel 使用 `alpha.N`、`beta.N`、`rc.N` 或 `canary.<date>.<sha>`。

固定 release train 中，公開官方 packages 預設同步 `frameworkVersion`。

## E. Validate Contributor Rules

外部 contributor 可提交 core PR，但 core PR 必須通過：

1. issue 或 RFC 連結。
2. changeset 或 release intent。
3. core CODEOWNERS review。
4. migration 判斷。
5. integration tests。
6. Release Owner review，如果觸碰 release surface。

Automation：

```bash
node tools_node/atm-version-upgrade-flow.js validate-contributor-impact
node tools_node/atm-version-upgrade-flow.js validate-codeowners
```

## F. Freeze

Freeze 僅凍結 release surface：

1. package versions。
2. release manifest。
3. compatibility matrix。
4. skew matrix。
5. release workflow。
6. changelog and release notes。

不凍結 unrelated feature branches。

## G. Prepare Release

Release Owner 或授權 maintainer 需完成：

1. 同步 package versions。
2. 更新 compatibility matrix。
3. 更新 lockfile。
4. 產生 skew matrix。
5. 產生 release notes。
6. 準備 rollback route。
7. 更新 known-bad readiness。

## H. QA Gates

至少執行：

```bash
node tools_node/atm-version-upgrade-flow.js validate-release
```

ATM upstream gate 可加跑：

```bash
node --experimental-strip-types scripts/validate-version-compatibility.ts --mode validate
node --experimental-strip-types scripts/validate-release-trust.ts --mode validate
node --experimental-strip-types scripts/validate-skew-matrix.ts --mode validate
npm run validate:standard
```

Release candidate 需再補：

1. root-drop/onefile smoke。
2. adapter install smoke。
3. fresh adopter smoke。
4. migration smoke。
5. release note link check。

## I. Tag

只有 Release Owner 或明確授權 maintainer 可以建立正式 tag。

1. Tag 必須是 annotated tag。
2. Tag message 必須包含 release manifest 或 release note 連結。
3. External contributor 不可推 official tag。
4. prerelease tag 與 dist-tag 必須對齊 release channel。

## J. Post-release

Release 後必須記錄：

1. artifact provenance。
2. package tarball 或 build artifact。
3. dist-tag 狀態。
4. release run record。
5. rollback route。
6. known-bad readiness。

## K. 文件歸位規則

3KLife 端 ATM release/version 文件集中在本目錄：

1. 入口索引為 [README.md](./README.md)。
2. release checklist canonical 位置為 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)。
3. upgrade proposal public rules canonical 位置為 [UPGRADE_PROPOSAL_PUBLIC_RULES.md](./UPGRADE_PROPOSAL_PUBLIC_RULES.md)。
4. release run 歷史紀錄放在 [release_runs/](./release_runs/)。
5. 舊位置只保留 stub，stub 只指向新位置。

## L. Rollback

每次 release 必須有 rollback route：

1. `version-pin`：第一優先，讓 adopter 固定上一版。
2. `hotfix-patch`：相容修補。
3. `full-revert`：最後手段，需 Release Owner sign-off。

Rollback trigger 必須在 release note 與 release run record 中明確列出。
