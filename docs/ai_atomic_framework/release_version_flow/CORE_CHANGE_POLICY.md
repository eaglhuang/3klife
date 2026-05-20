<!-- doc_id: doc_other_0725 -->
# ATM Core Change Policy

ATM core 對外部 contributor 開放，但 core PR 需要更高審核門檻。策略是「開放修改、嚴格驗證」，不是用權限牆阻止外部改 core。

## 1. Core Surface

以下視為 core surface：

1. `packages/core/**`
2. `schemas/**`
3. `compatibility-matrix.json`
4. core validator contract
5. public runtime contract
6. migration and compatibility policy

## 2. Required Gates

Core PR 必須通過：

1. issue 或 RFC 連結。
2. release intent 或 changeset。
3. core CODEOWNERS review。
4. public API 判斷。
5. migration 判斷。
6. integration tests。
7. Release Owner review，如果觸碰 release surface 或 breaking path。

## 3. Breaking Change Rules

以下必須標成 `major`，或在 `0.x` 階段標成 breaking minor prerelease：

1. 不相容 public API change。
2. schema major bump。
3. 移除已發布 API。
4. adapter 無法保持相容。
5. migration 需要手動改資料或改 adopter repo 結構。

## 4. Migration Rule

只要 `requires_migration: true`，必須提供：

1. migration summary。
2. affected versions。
3. before/after example。
4. rollback route。
5. validation command。

## 5. Non-Public Core Work

Core 內部 refactor 可標 `release_impact: none`，但必須同時滿足：

1. `public_api: false`
2. `core_impact: none`
3. 沒有 schema、CLI、SDK、adapter public behavior change
4. validator 與 integration tests 能證明行為等價
