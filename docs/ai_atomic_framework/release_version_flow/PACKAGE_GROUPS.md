<!-- doc_id: doc_other_0726 -->
# ATM Package Groups

本文件定義 release impact metadata 的 `package_group` 與 fixed release train 邊界。

## 1. Fixed Train Groups

| package_group | Included Surface | Default Versioning |
| --- | --- | --- |
| `core` | framework runtime、schema、validator core、compatibility matrix | fixed train |
| `cli` | official ATM CLI、root-drop command、onefile entry | fixed train |
| `plugin-sdk` | plugin authoring API、plugin manifest、SDK docs | fixed train |
| `adapter` | official adapters and integration packages | fixed train |
| `agent-pack` | official agent-pack and onboarding pack | fixed train |

## 2. Non-Publish Groups

| package_group | Included Surface | Release Impact |
| --- | --- | --- |
| `docs` | policy、guide、release note、migration guide | none to major |
| `tooling` | internal scripts、validators、fixtures | none to minor |
| `example` | examples、demo adopter projects | none to patch |

## 3. Independent Candidate Criteria

Package 可提出 independent versioning RFC 的條件：

1. 消費者不依賴 framework 同步升級。
2. package 的 API 與 support matrix 可獨立描述。
3. release cadence 明顯不同。
4. independent 後不會造成 starter install 或 migration 指引混亂。

## 4. Manifest Requirement

release manifest 必須列出每個 package group 的 impact。沒有變更的 package 可以省略，但 fixed train 發版時仍要同步版本號與 lockfile。

## 5. Future Split Process

1. 開 RFC。
2. 補 support matrix。
3. 補 migration note。
4. Release Owner 審核 fixed to independent transition。
5. 下一個 minor 或 major train 宣告拆分。
