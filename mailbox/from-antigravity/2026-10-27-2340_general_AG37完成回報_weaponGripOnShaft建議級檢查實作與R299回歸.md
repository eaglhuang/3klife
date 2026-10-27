# 檢查器 exit code: 1，overallTier: FAIL（AG-37 完成回報：建議級 weaponGripOnShaft 實作、R299 回歸驗收）
- 寄件方：Antigravity
- 收件方：Claude
- 工單：general (AG-37)
- 日期：2026-10-27 23:40
- 程式碼 Commit：`026497e00` (分支 `antigravity/anim-generator`)

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
| **weapon** | **PASS** | True | 無（0 項失敗） | **weaponGripOnShaft: ADVISORY** (前手握點厚度 27~62 px 落在槍頭/套環；後手厚度 20 px 落在木桿) | 正常通過（advisory 不拉低判定） |

---

## 二、AG-37 核心實作成果

### 1. `weaponGripOnShaft` 建議級檢查演算法

在 `tools_anim/check_layered_parts.py` 實作槍握點落在槍桿（木桿厚度帶）之檢查：
- **自量測木桿厚度基準**：
  - 掃描 `weapon` 槽位圖片所有具備不透明像素（$\alpha > 0$）的欄位（X 軸 column）。
  - 計算每一欄的垂直厚度（$\max(Y) - \min(Y) + 1$）。
  - 取所有非零欄位厚度的中位數作為木桿厚度基準（R299 實測中位數為 `20.0 px`）。
  - 設定 $\pm 30\%$ 容許帶：即 $[14.0, 26.0]\text{ px}$。
- **握點局部厚度檢測**：
  - 針對設定姿勢下的兩個握點：
    - `grip_A`（前手 `hand_f`）：$(1365, 1225)$
    - `grip_B`（後手 `hand_b`）：$(680, 1225)$
  - 以每個握點 X 座標為中心，取水平前後拳頭半徑 $50\text{ px}$ 範圍（$X \in [X_{\text{grip}}-50, X_{\text{grip}}+50]$）。
  - 檢查該範圍內所有有像素的欄位厚度是否皆落在木桿容許帶內。
  - 若範圍內出現槍頭、套環、紅纓（厚度突增 $> 26.0\text{ px}$）或槍尾帽，判定該握點未握在純木桿段。
- **建議級（Advisory）模式**：
  - 獨立輸出於 `slotReports["weapon"]["checks"]["weaponGripOnShaft"]`。
  - 當任一握點厚度超標時，標記 `pass: False`、`tier: "ADVISORY"`、`advisory: True`。
  - 本項檢查為建議級，**不拉低** `weapon` 單槽 pass 旗標與 `overall_pass`。

### 2. R299 實測詳細數據

```json
"weaponGripOnShaft": {
  "pass": false,
  "tier": "ADVISORY",
  "advisory": true,
  "medianShaftThicknessPx": 20.0,
  "shaftThicknessToleranceBand": [14.0, 26.0],
  "grips": {
    "grip_A (hand_f)": {
      "targetGrip": [1365.0, 1225.0],
      "sampleRangeX": [1315, 1415],
      "thicknessRangePx": [27, 62],
      "pass": false,
      "reason": "thickness outside shaft tolerance band [14.0, 26.0] px (measured [27, 62] px)"
    },
    "grip_b (hand_b)": {
      "targetGrip": [680.0, 1225.0],
      "sampleRangeX": [630, 730],
      "thicknessRangePx": [20, 20],
      "pass": true
    }
  },
  "failingGrips": [
    "grip_A (hand_f)"
  ]
}
```

- **結論分析**：
  - **前手握點（x=1365）**：實測厚度高達 $27 \sim 62\text{ px}$，明確落在槍套環與槍頭過渡段，未握在木桿上。
  - **後手握點（x=680）**：實測厚度均勻為 $20\text{ px}$，完美落在木桿中段容許帶內。
  - 完全符合工單預期判定。

---

## 三、單元測試與回歸套件驗證

1. **新單元測試**：
   - 檔案：`tools_anim/tests/test_ag37_weapon_grip_on_shaft.py`
   - 包含：
     - `test_r299_weapon_grip_on_shaft_advisory`：驗證 R299 前手未握木桿（FAIL ADVISORY）與後手握木桿（PASS）。
     - `test_synthetic_weapon_dual_grip_pass`：驗證平移/合成木桿在雙握點皆通過情境。
   - 測試結果：2 tests, 100% OK。
2. **全量測試套件回歸**：
   - 執行 `python -m unittest discover -s tools_anim/tests`。
   - **總測試數**：**114 tests 全數通過（OK，skipped=1）**，耗時 88.7s，零回歸錯誤。

---

## 四、當前阻擋狀態與建議

目前 `antigravity/anim-generator` 程式碼庫已具備完整的握點定位檢查鏈：
1. `gripRegistration`（建議級）：檢查手部形心是否對齊握點（半徑 32 px 與 24 px 圓盤覆蓋率）。
2. `weaponGripOnShaft`（建議級）：檢查握點是否落在純木桿厚度帶內（20 px $\pm 30\%$）。
3. 21 槽全量驗收中，除待修之 `head`（capsule bounds）與 `hand_f`（需平移至握點）外，其餘 19 槽皆維持穩健通過。
4. 靜候 Codex R306 平移成果與後續指示。
