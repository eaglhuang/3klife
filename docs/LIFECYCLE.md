<!-- doc_id: doc_other_0100 -->
# ATM Lifecycle Policy

本文件定義 ATM 的版本生命週期、release channel、deprecation 週期與 breaking change 管理規則。

## 1. Version Tiers

| Tier | 版本範圍 | 穩定性承諾 | 典型用途 |
|---|---|---|---|
| alpha0 | `0.0.x` | 可隨時 break，只保證最小自舉 | 空白 repo proof |
| alpha1 | `0.1.x` | 可 break，開始收斂治理預設 | Default Governance Bundle 收斂 |
| beta | `0.2.x` ~ `0.9.x` | minor 內儘量穩定，breaking 需 migration guide | 早期生產驗證 |
| stable | `>=1.0.0` | 完整 SemVer 2.0 | 正式生產 |
| lts | `>=2.0.0`（規劃） | 長維護 patch/security | 保守維運 |

## 2. Release Channels

| Channel | 目的 | 可見性 | 是否可當依賴基準 |
|---|---|---|---|
| nightly | 快速驗證與內部回歸 | 內部/實驗 | 否 |
| alpha | 功能早期驗證 | 對外可見 | 否（僅 PoC） |
| beta | 準生產驗證 | 對外可見 | 有條件可 |
| stable | 正式發布 | 對外可見 | 是 |
| lts | 長期維護 | 對外可見 | 是（保守環境優先） |

## 3. SemVer Rules

### MAJOR（`X+1.0.0`）

任一情況觸發 major：

1. Atomic Spec schema 不向後相容。
2. Adapter / Plugin SDK public interface 不向後相容。
3. 移除已標 deprecated 的 public API。
4. CLI 公開指令面重命名或移除。

### MINOR（`X.Y+1.0`）

1. 新增向後相容能力（新欄位、新指令、新 plugin surface）。
2. 啟動 deprecation（但不移除）。

### PATCH（`X.Y.Z+1`）

1. Bug 修復。
2. 文件修正。
3. 不影響 public contract 的內部調整。

## 4. Deprecation Cycle

標準週期：

1. `T0`（minor N）：標記 deprecated，補 migration 指引。
2. `T1`（minor N+1）：保留舊介面，維持警示。
3. `T2`（minor N+2）：保留舊介面，升級警示等級。
4. `T3`（minor N+3）：移除舊介面（若影響 public contract，需 major）。

最短保留窗口：跨 2 個 minor。

## 5. Breaking Change Requirements

每個 breaking change 必須同時具備：

1. RFC（含動機、替代方案、影響範圍）。
2. Migration 指引（含舊版到新版映射）。
3. 兼容性影響聲明（對應 [ATOM_COMPATIBILITY.md](./ATOM_COMPATIBILITY.md)）。
4. 回滾窗口說明（至少包含 rollback trigger 與 rollback route）。

## 6. Rollback Window

每次 release 需定義 rollback window：

1. `window_start`：發布時間。
2. `window_end`：允許直接回滾時間點。
3. `trigger`：觸發回滾條件（validator fail / production regression）。
4. `route`：回滾路徑（版本 pin / hotfix patch / full revert）。

## 7. Required Release Evidence

正式 release 必須保留：

1. changelog entry（含 breaking/deprecation/migration）。
2. compatibility matrix 更新證據。
3. proposal / decision / rollback proof 鏈接（參見 [UPGRADE_PROPOSAL_PUBLIC_RULES.md](./UPGRADE_PROPOSAL_PUBLIC_RULES.md)）。
4. checklist sign-off（參見 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)）。
