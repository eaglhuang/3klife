<!-- doc_id: doc_other_0723 -->
# ATM Open Source Versioning Policy

本文件定義 ATM 開源版本策略。正式版本號只表達相容性等級，不能承載 package group、風險等級或 core/peripheral 語意。

## 1. SemVer Contract

1. `frameworkVersion` 必須是標準 SemVer。
2. 正式版格式為 `MAJOR.MINOR.PATCH`。
3. 預發版可使用 `alpha.N`、`beta.N`、`rc.N` 或 `canary.<date>.<sha>`。
4. build metadata 僅用於建置資訊，不作為相容性判斷。
5. 禁止使用 `0.1.99.xxx` 或其他非 SemVer train。

## 2. Fixed Release Train

ATM 初期採 fixed release train：

1. `core`、`cli`、`plugin-sdk`、官方 `adapter`、官方 `agent-pack` 預設同版。
2. 同版不代表每個 package 都有 public API 改動，只代表 release train 一致。
3. 非 public API surface 不參與版本升級判斷。
4. release manifest 必須列出實際 impact package 與 scope。

## 3. Independent Package Criteria

外圍 package 只有在全部條件成立時，才可透過 RFC 升格為 independent version：

1. 已有獨立消費者。
2. 有獨立 release cadence。
3. 有獨立相容性範圍與支援政策。
4. 從 fixed train 拆出不會讓核心安裝與教學成本上升到不可接受。

## 4. Impact Semantics

1. `PATCH`：相容 bugfix、文件補強、非 breaking runtime 修正。
2. `MINOR`：相容新增能力、公開 API additive change、官方 adapter/plugin 新功能。
3. `MAJOR`：公開 API 不相容、schema major bump、移除已發布 API、無法無痛遷移的 contract change。
4. `0.x` 階段：`MINOR` 可以包含 breaking，但必須有 migration note 與 Release Owner sign-off。

## 5. Release Manifest

每次 release 必須產出 release manifest，至少包含：

```yaml
frameworkVersion: 0.2.0
release_channel: alpha | beta | rc | stable | canary
packages:
  - name: "@atm/core"
    package_group: core
    public_api: true
    release_impact: minor
    core_impact: minor
    requires_migration: true
    requires_release_note: true
```

## 6. Prohibited Patterns

1. 不得用版本號區段表示 core/peripheral。
2. 不得為了跳過 SemVer tooling 而創造自訂數字軌。
3. 不得讓 external contributor 的權限限制取代 CODEOWNERS、CI gate 與 Release Owner review。
4. 不得把 internal refactor 誤標成 patch，只為了讓它出現在 release note。
