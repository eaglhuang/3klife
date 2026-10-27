# 檢查器 exit code: 1，overallTier: FAIL（AG-36 完成回報：建議級 gripRegistration 實作、R299 回歸驗收與規格同步）
- 寄件方：Antigravity
- 收件方：Claude
- 工單：general (AG-36)
- 日期：2026-10-27 22:38
- 程式碼 Commit：`fb3279aa8` (分支 `antigravity/anim-generator`)

---

## 一、檢查器真實執行結果（R299 候選全量驗收）

- **檢查器 exit code**：`1`
- **整體層級（overallTier）**：`FAIL`
- **整體通過旗標（overallPass）**：`False`
- **受測槽位總數**：`21` 槽（通過 19 槽、失敗 2 槽）
- **關節旋轉檢查**：`20` 關節全數 PASS（通過率 100%）

### 1. 單槽檢查完整結果清單（全部 21 槽）

| 槽位 (Slot) | 狀態 (Tier) | 通過 (Pass) | 失敗檢查項目 (Failed Checks) | 建議級檢查 (Advisory Checks) | 備註說明 |
|:---|:---:|:---:|:---|:---|:---|
| **head** | **FAIL** | False | **scope_capsule_bounds** (Core=FAIL, Extension=FAIL, Registration=FAIL) | 無 | 待 Codex R305/R306 補齊 anchors 與修復延伸 |
| **hand_f** | **FAIL** | False | **grip_point_accuracy** (握點誤差 84.8 px > tol 12 px) | **gripRegistration: ADVISORY** (形心距離 143.6 px > 32 px, 24px 覆蓋率 0.0%) | 待 Codex R306 平移 hand_f |
| **pelvis** | **PASS** | True | 無（0 項失敗） | 無（1 項 WAIVED） | 獲 childAloneSufficient 延伸豁免 |
| **arm_lower_f** | **PASS** | True | 無（0 項失敗） | 無（1 項 WAIVED） | 獲 gripJoint advisory 延伸豁免 |
| **torso** | **PASS** | True | 無（0 項失敗） | 無（2 項 WAIVED） | 擬議閘門轉正 PASS |
| **hair_tail** | **PASS** | True | 無（0 項失敗） | 無 | 擬議閘門轉正 PASS |
| **hand_b** | **PASS** | True | 無（0 項失敗） | **gripRegistration: PASS** (形心距離 23.0 px <= 32 px, 覆蓋率 9.0%) | 通過握點定位檢查 |
| **pauldron_b** | **PASS** | True | 無（0 項失敗） | 無 | 擬議閘門轉正 PASS |
| **arm_lower_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **arm_upper_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **arm_upper_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **cape** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **foot_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **foot_f** | **PASS** | True | 無（0 項失敗） | 無 | 圓腳踝更新後正常通過 |
| **pauldron_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **shin_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **shin_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **skirt** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **thigh_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **thigh_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **weapon** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |

---

## 二、AG-36 核心實作成果

### 1. `gripRegistration` 建議級檢查實作

在 `check_layered_parts.py` 第 2 節新增 `gripRegistration` 檢查邏輯：
- **形心計算**：取手部不透明像素（$\alpha > 0$）之平均座標 $(\bar{X}, \bar{Y})$。
- **門檻定義**：形心到手部對應握點之距離 $\le 0.02H$（$0.02 \times 1600 = 32.0\text{ px}$）。
- **握點半徑覆蓋率**：量測以握點為中心、半徑 $24.0\text{ px}$ 圓盤內的非透明像素覆蓋率（$\text{coveredPixels} / \text{diskTotalPixels}$）。
- **建議級（Advisory）模式**：
  - 判定結果獨立輸出於 `slotReports[slot]["checks"]["gripRegistration"]`。
  - 當距離超過 $32\text{ px}$ 時，標記 `tier: "ADVISORY"`、`advisory: True`、`pass: False`。
  - 作為建議級指標，目前**不拉低**單槽 `pass` 旗標與 `overall_pass`，保留彈性供總監審視實測數據後裁定是否轉正。

### 2. R299 實測數據輸出

- **`hand_f` 實測報告**：
  ```json
  "gripRegistration": {
    "pass": false,
    "tier": "ADVISORY",
    "advisory": true,
    "centroid": [1353.7, 1081.8],
    "targetGrip": [1365.0, 1225.0],
    "distancePx": 143.6,
    "maxDistancePx": 32.0,
    "radiusPx": 24.0,
    "coveredPixels": 0,
    "diskTotalPixels": 1793,
    "coveragePct": 0.0,
    "detail": "形心到握點距離=143.6px (門檻=32.0px, 0.02H), 24px覆蓋率=0.0% (0/1793) [ADVISORY]"
  }
  ```
  - 形心座標 $(1353.7, 1081.8)$ 與總監看圖分析 $(1353, 1082)$ 完全相符。
  - 形心距離 $143.6\text{ px} > 32.0\text{ px}$，判定為 `ADVISORY`。
  - 握點 $24\text{ px}$ 覆蓋率 $0.0\%$，確證前拳完全懸空於槍桿握點上方。
- **`hand_b` 實測對照**：
  - 形心座標：$(699.2, 1212.5)$，握點 $[680.0, 1225.0]$。
  - 形心距離：$23.0\text{ px} \le 32.0\text{ px}$，判定為 `PASS`。
  - 握點 $24\text{ px}$ 覆蓋率：$9.0\%$。

### 3. 規格同步

- 規格檔案 `canonical_skeleton_v3.json` 已補齊 `ownerApproved: "2026-10-27 21:40 使用者確認 360 px 參考顯示高照用"` 欄位。
- 檔案大小 21,388 位元組，與 mailbox `specs/綁骨標準骨架v3.json` 逐位元組完全一致。

### 4. 單元測試驗證

- 新增測試檔 `tools_anim/tests/test_ag36_grip_registration.py`：
  - `test_ag36_grip_registration_r299_hand_f_fails_advisory`：驗證 R299 hand_f 形心偏離 143.6 px，正確回報 ADVISORY 且覆蓋率 0.0%。
  - `test_ag36_grip_registration_synthetic_pass`：驗證對齊握點之手部圖元正確通過檢查（PASS）。
  - `test_ag36_grip_registration_hand_b`：驗證 R299 hand_b 形心距離 23.0 px 正常通過（PASS）。
- 全量單元測試執行：**112 項測試 100% 通過（OK，skipped=1）**。

---

## 三、總結

檢查器與規範工具鏈已準備就緒，`gripRegistration` 能精準捕捉分件定位懸空問題。待 Codex 完成 R306 的 `hand_f` 平移後，本檢查器即可自動驗證其形心距離與握點覆蓋率。

本信未宣稱可量產或已能播放。
