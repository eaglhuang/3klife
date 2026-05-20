<!-- doc_id: doc_other_0102 -->
# ATM Atom Compatibility Matrix

本文件定義 framework、atom schema、plugin SDK 的相容性矩陣格式與維護規則。

## 1. Matrix Scope

每次 release 需明確描述：

1. framework version。
2. atom schema version 範圍。
3. plugin SDK version 範圍。
4. known incompatible 套件或版本。

## 2. Matrix Format

| Framework | Atom Schema | Plugin SDK | Node Baseline | 狀態 | 備註 |
|---|---|---|---|---|---|
| `0.1.x` | `v1` | `0.1.x` | `>=20` | compatible | alpha1 基線 |
| `0.2.x` | `v1` | `0.2.x` | `>=20` | compatible | beta 起始 |

## 3. Machine-Readable Example

```json
{
  "schemaVersion": "1.0",
  "atmVersions": {
    "0.1.0": {
      "framework": "0.1.0",
      "atomSchema": "v1",
      "pluginSdk": "0.1.x",
      "node": ">=20",
      "knownIncompatible": []
    }
  }
}
```

## 4. Update Cadence

1. 每次 minor release 必須更新 matrix。
2. 每次 major release 必須重新檢查所有支援組合。
3. deprecated path 需標記對應移除版本。

## 5. Upgrade Check Responsibility

1. Proposal Author：填寫 compatibility impact。
2. Maintainer：審核 matrix 是否完整。
3. Validator Owner：驗證 matrix 對應測試/檢查結果。
4. Release Owner：最終簽核矩陣變更。

## 6. Breakage Handling

若偵測到不相容：

1. 必須在 changelog 標記 `Breaking`。
2. 必須附 migration path。
3. 若屬高風險，需在 rollback window 內提供回退方案。

## 7. Related Contracts

1. version policy：參見 [LIFECYCLE.md](./LIFECYCLE.md)。
2. proposal 審核：參見 [UPGRADE_PROPOSAL_PUBLIC_RULES.md](./ai_atomic_framework/release_version_flow/UPGRADE_PROPOSAL_PUBLIC_RULES.md)。
