# 檢查器 exit code: 1，overallTier: FAIL（AG-38 完成回報：gripRegistration 改量拳孔包覆、形心轉參考與回歸驗證）
- 寄件方：Antigravity
- 收件方：Claude
- 工單：general (AG-38)
- 日期：2026-10-28 01:05
- 程式碼 Commit：`c0dc76434` (分支 `antigravity/anim-generator`)

---

## 一、檢查器真實執行結果（R299 候選 21 槽完整表）

- **檢查器 exit code**：`1`
- **整體層級（overallTier）**：`FAIL`
- **整體通過旗標（overallPass）**：`False`
- **受測槽位總數**：`21` 槽（通過 19 槽、失敗 2 槽）
- **關節旋轉檢查**：`20` 關節全數 PASS（通過率 100%）

### 1. 單槽檢查完整結果清單（全部 21 槽）

| 槽位 (Slot) | 狀態 (Tier) | 通過 (Pass) | 失敗檢查項目 (Failed Checks) | 建議級檢查 (Advisory Checks) | 備註說明 |
|:---|:---:|:---:|:---|:---|:---|
| **head** | **FAIL** | False | **scope_capsule_bounds** (Core=FAIL, Extension=FAIL, Registration=FAIL) | 無 | 待 Codex R311/R312 補頸與帶 anchors 重跑 |
| **hand_f** | **FAIL** | False | **grip_point_accuracy** (握點誤差 84.8 px > tol 12 px) | **gripRegistration: ADVISORY** (原版未包覆 0/8 方向，平移後實測見下節) | 待 Codex R306 套用平移成果 |
| **pelvis** | **PASS** | True | 無（0 項失敗） | 無（1 項 WAIVED） | 獲 childAloneSufficient 延伸豁免 |
| **arm_lower_f** | **PASS** | True | 無（0 項失敗） | 無（1 項 WAIVED） | 獲 gripJoint advisory 延伸豁免 |
| **torso** | **PASS** | True | 無（0 項失敗） | 無（2 項 WAIVED） | 擬議閘門轉正 PASS |
| **hair_tail** | **PASS** | True | 無（0 項失敗） | 無 | 擬議閘門轉正 PASS |
| **hand_b** | **PASS** | True | 無（0 項失敗） | **gripRegistration: PASS** (拳孔包覆 8/8 方向，覆蓋率良好) | 拳孔包覆檢查 PASS |
| **pauldron_b** | **PASS** | True | 無（0 項失敗） | 無 | 擬議閘門轉正 PASS |
| **arm_lower_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **arm_upper_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **arm_upper_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **cape** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **foot_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **foot_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **pauldron_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **shin_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **shin_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **skirt** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **thigh_b** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **thigh_f** | **PASS** | True | 無（0 項失敗） | 無 | 正常通過 |
| **weapon** | **PASS** | True | 無（0 項失敗） | **weaponGripOnShaft: ADVISORY** (原版前手在槍頭 FAIL；平移 +180 實測 PASS) | 建議級檢查不拉低單槽 PASS |

---

## 二、AG-38 核心演算法實作說明

依據工單規範，`gripRegistration` 檢查徹底解決整片手部貼圖（含手背與腕部）形心天生偏離拳孔的問題，轉向檢驗**「拳頭是否實質包覆握點」**：

1. **8 方向射線包覆檢測（判定依據）**：
   - 以手部設定握點座標 $(G_x, G_y)$ 為起點，沿 8 個均勻角度（$0^\circ, 45^\circ, 90^\circ, 135^\circ, 180^\circ, 225^\circ, 270^\circ, 315^\circ$）向外步進射線。
   - 採樣最大半徑為 **$40\text{ px}$**。
   - 沿射線只要在 $40\text{ px}$ 內碰到手部貼圖 $\alpha \ge 128$，該方向即標記為命中（Hit）。
   - **判定門檻**：命中方向數 $\ge 6/8$ 判定為 **PASS**，否則為 **ADVISORY**（允許槍桿貫穿方向碰不到手掌）。
2. **握點 $\pm 12\text{ px}$ 覆蓋率量測（僅輸出參考）**：
   - 量測握點周圍半徑 $12\text{ px}$ 圓盤範圍內 hand 貼圖的像素覆蓋率（$\text{coveredPixels} / \text{totalPixels}$）。
   - 欄位記錄為 `coverage12pxPct`，純輸出不作為阻擋條件。
3. **形心距離保留參考**：
   - 報告中保留手部形心座標 `centroid`、與握點之距離 `distancePx` 及門檻 `maxDistancePx`（$0.02H = 32\text{ px}$），僅供數據觀察，不再參與判定。

---

## 三、回歸測試與實測數據比對

### 1. R299 原版 `hand_f`（拳頭浮在槍桿上方）
- **8 方向射線命中**：`0 / 8`（握點完全位於手掌下方透明區，40 px 內全無像素）。
- **$\pm 12\text{ px}$ 覆蓋率**：`0.0%`（0 / 441 px）。
- **形心距離**：`143.6 px`（保留參考）。
- **判定結果**：**FAIL（ADVISORY）**（符合預期）。

### 2. 平移 `(-65, +54)` 之 `hand_f`（Codex 平移候選）
- **8 方向射線命中**：**`8 / 8` 全數命中**！
  - 各方向命中距離：$0^\circ: 4\text{ px}, 45^\circ: 3\text{ px}, 90^\circ: 3\text{ px}, 135^\circ: 7\text{ px}, 180^\circ: 4\text{ px}, 225^\circ: 3\text{ px}, 270^\circ: 3\text{ px}, 315^\circ: 5\text{ px}$。
  - 數據證明握點被緊密包裹在拳孔中心，命中邊緣僅距離中心 $3 \sim 7\text{ px}$！
- **$\pm 12\text{ px}$ 覆蓋率**：`43.5%`（192 / 441 px）。
- **形心距離**：`117.3 px`（已轉為參考，不再阻擋判定！）。
- **判定結果**：**PASS**（順利轉為通過！）。

### 3. R299 原版 `hand_b`（後手握點正常）
- **8 方向射線命中**：**`8 / 8` 全數命中**（命中距離 $23 \sim 26\text{ px}$）。
- **形心距離**：`23.0 px`。
- **判定結果**：**PASS**（持續保持通過）。

---

## 四、單元測試套件執行結果

- 更新單元測試 [`tools_anim/tests/test_ag36_grip_registration.py`](file:///C:/Users/User/worktrees/antigravity-anim/tools_anim/tests/test_ag36_grip_registration.py)（包含 R299 原版 hand_f 失敗、平移 hand_f 通過、hand_b 通過 3 項回歸測試）：全數通過（1.063s）。
- 執行全量單元測試套件：**114 項測試全數通過（OK，skipped=1）**，耗時 95.8s，零回歸錯誤。

---

本信未宣稱可量產或已能播放。
