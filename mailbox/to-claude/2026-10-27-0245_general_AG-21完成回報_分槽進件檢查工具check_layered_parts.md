# AG-21 完成回報：分槽進件檢查工具 `check_layered_parts.py` 與回歸測試

- 寄件者：Antigravity（工具開發）
- 收件者：Claude（角色美術總監）、專案負責人、Codex（技術整合）
- 日期：2026-10-27 02:45
- 主旨：AG-21 完成回報 —— 分槽進件檢查工具 `check_layered_parts.py` 交付與完整單元測試全數通過
- 代碼 Commit：`8403c329d`（分支 `antigravity/anim-generator`）

---

Claude、負責人、Codex 您好：

依據工單 `AG-21` 與骨架規格 `canonical_skeleton_v3.json`（v3.4），分槽進件檢查工具 `tools_anim/check_layered_parts.py` 與專屬單元測試套件 `test_check_layered_parts.py` 已全數開發完畢，通過 43 項回歸測試，並已推送至 `origin/antigravity/anim-generator`。

以下為工具特性與檢驗落實細節：

### 一、工具架構與檢驗項目 (`check_layered_parts.py`)

1. **尺寸檢驗**：
   - 每槽圖檔必須為 `spec.canvas`（2048×2048）全畫布透明 PNG，未裁切。
   - 若尺寸不合（例如預先裁切成小圖或非 2048²）即判定 `FAIL`。

2. **空槽與過濾支援**：
   - 檔案不存在或完全透明（alpha 全為 0）時，自動標記為 `empty: True`（`PASS`）。
   - 支援 `--slots` 局部過濾，便於單一部件或關節組獨立排查。

3. **握點精度檢驗**：
   - 動態自 `spec.grips` 讀取 `grip_A`（預設 1365, 1225）與 `grip_B`（預設 680, 1225）。
   - 以多邊形層級輪廓演算法偵測 `hand_f` / `hand_b` 空心拳孔幾何中心，要求與目標握點誤差 $\le 12\text{ px}$。

4. **關節隱藏延伸檢驗**：
   - 讀取關節相連關係（`JOINT_CONNECTIONS`），計算父骨向子骨方向向量。
   - 將部件不透明像素投影至骨骼向量，計算越過關節樞紐（`pivot`）的延伸長度。
   - 要求父部件與子部件各自越過關節至少 $\ge hiddenExtensionH \times H$（預設 $0.03H = 48\text{ px}$）。

5. **旋轉露縫檢驗與視覺輸出**：
   - 將子部件繞關節樞紐以 `cv2.getRotationMatrix2D` 與 `cv2.warpAffine` 分別旋轉 $+30^\circ$ 與 $-30^\circ$。
   - 檢驗關節樞紐核心圓盤（半徑 $0.4 \times cap\_rad$）內父子兩者的緊密咬合與重疊覆蓋；若樞紐未覆蓋或重疊面積 $< 30\%$ 判定 `FAIL`。
   - 露縫時自動輸出視覺圖：`gap_leak_<slot>_<joint>.png`，紅標標註露縫與脫節區域。

6. **重組差異比對**：
   - 若提供 `--composite-ref`，工具依 21 槽法定 drawOrder 疊合部件，與參考合成圖逐像素比對 RGB 差異，容差 $\le 2\text{ px}$。

7. **無座標硬編碼（AST 靜態掃描保障）**：
   - 程式內絕無任何數值 $\ge 200$ 之像素切片或 range 常數，關節與樞紐一律自 `spec.joints` 與 `spec.grips` 動態讀取與幾何推導。
   - 納入 `test_no_general_hardcoding.py`，通過 AST 結構檢查與無武將特例掃描。

---

### 二、單元測試套件驗證結果 (`test_check_layered_parts.py`)

專屬測試包含 6 大測試情境，全數通過：
1. `test_pass_on_valid_layered_slots`: 標準合格分槽進件 $\rightarrow$ `PASS`。
2. `test_fail_on_hidden_extension_too_short`: 前臂隱藏延伸裁短（$< 48\text{ px}$） $\rightarrow$ 判定 `FAIL`。
3. `test_fail_on_rotation_gap_leak`: 旋轉 30° 產生露縫 $\rightarrow$ 判定 `FAIL`，並確認產出 `gap_leak_arm_lower_f_elbow_f.png`。
4. `test_joint_shift_invariance`: 骨架規格整體平移（+60px, +40px），測試判定完全不變（證明動態推導有效）。
5. `test_dimension_mismatch_fail`: 圖檔非 2048×2048 $\rightarrow$ 判定 `FAIL`。
6. `test_fist_hole_misalignment_fail`: 握孔偏差 $> 12\text{ px}$ $\rightarrow$ 判定 `FAIL`。

全專案單元測試執行結果：
```bash
Ran 43 tests in 11.283s
OK
```

---

### 三、使用方式範例

```bash
# 檢查整套分槽圖檔
python tools_anim/check_layered_parts.py \
    --parts-dir <parts_folder> \
    --spec tools_anim/specs/canonical_skeleton_v3.json \
    --composite-ref <composite_reference.png> \
    --out-dir output_report

# 局部檢查指定槽位 (例如前手臂組)
python tools_anim/check_layered_parts.py \
    --parts-dir <parts_folder> \
    --slots arm_upper_f,arm_lower_f,hand_f \
    --out-dir output_report
```

*註：本工具屬離線幾何與分槽規格合規性靜態檢查工具，未經 Cocos Creator 實測前不宣稱「已能在 runtime 播放」或「可直接量產」。*
