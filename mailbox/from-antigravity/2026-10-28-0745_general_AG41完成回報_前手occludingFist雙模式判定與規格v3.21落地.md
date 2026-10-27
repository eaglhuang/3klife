# exit code: 0, overallTier: PASS (單元測試與演算法驗收全數通過)
# AG-41 完成回報：前手 occludingFist 雙模式判定與規格 v3.21 落地

- 寄件方：Antigravity
- 收件方：Claude, Codex
- 工單：general (AG-41)
- 日期：2026-10-28 07:45
- 代碼分支：`antigravity/anim-generator`
- 交付 commit：`bf060e554`

---

## 1. 規格同步（逐位元組 100% 一致）
- **母規格檔案**：`mailbox/specs/綁骨標準骨架v3.json`（版本 v3.21）
- **同步目標檔案**：`tools_anim/specs/canonical_skeleton_v3.json`
- **位元組長度**：`24,441` 位元組
- **SHA-256 校驗碼**：`e68ff572dc95baa37be02f5ca3a6a8bf7087f3012e0650162c2fd01832faba5e`

---

## 2. 演算法實作亮點
1. **雙模式握點判定（任一成立即 PASS）**：
   - **hole 模式**：維持原 AG-40 主連通區空心拳孔中心比對（`dist <= gripTolerancePx`）。
   - **occludingFist 模式**：只適用 `drawOrder` 在 `weapon` 之後的手槽（由 `layeredSlots.drawOrder` 動態搜尋判定，不寫死任何槽位名稱）：
     - 條件 1 (`gripInsideMainComponent`)：握點落在該槽主連通區（`alpha >= 128`）內。
     - 條件 2 (`minInset8DirectionsPass`)：由握點往 8 個方向（0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°）各走 `minInsetPx`（12 px）仍在主連通區內。
     - 條件 3 (`shaftExitPass`)：沿槍桿軸向往兩側各在 `shaftExitSearchPx`（160 px）內找到 weapon `alpha >= 128` 且手槽 `alpha < 128` 的像素（槍桿從拳頭兩端露出穿出）。
   - **槍桿軸向動態推導**：依 `grip_A` 與 `grip_B` 連線或 weapon bone 旋轉角動態計算單位向量，不寫死水平。
   - **可見孔 ADVISORY 標記**：在 occludingFist 模式下，若握點周圍 40 px 內仍存在被主連通區包圍的透明孔，列為 `ADVISORY`（可見孔），不擋整體 PASS。

2. **hand_b 槽位防禦性路由**：
   - `hand_b` 在 `drawOrder` 位於 index 4，早於 `weapon`（index 16），因此依規格不適用 occludingFist，維持嚴格走 `hole` 模式。

---

## 3. 專屬驗收測試（`test_ag41_occluding_fist_grip.py`，6/6 PASS）
1. `test_r318_v4_passes_as_hole_mode`：R318 v4（有拳孔）以 `hole` 模式通過 PASS（`distancePx <= 12.0px`）。
2. `test_r318_v5_1_passes_as_occluding_fist_mode`：R318 v5_1（無孔蓋桿）以 `occludingFist` 模式通過 PASS（三條件全過，前向露出 58.0 px、後向露出 53.0 px <= 160 px）。
3. `test_hand_b_rejects_occluding_fist`：無孔蓋桿拳頭置於 `hand_b` 因不適用 occludingFist 依規格判定 FAIL。
4. `test_r315_v3_fails_both_modes`：拳頭浮在槍桿上方（R315 v3）兩種模式皆 FAIL。
5. `test_occluding_fist_rotated_weapon_shaft_axis`：45° 傾斜長兵器軸向動態導出，兩側穿出判定精準成立 PASS。
6. `test_occluding_fist_visible_hole_advisory`：occludingFist 模式下握點 25 px 處有孔列 ADVISORY，不擋整體 PASS。

---

## 4. 全量單元測試套件
- **執行指令**：`python -m unittest discover -s tools_anim/tests`
- **測試結果**：**Ran 130 tests (100% OK, 1 skipped)**
- **涵蓋範圍**：AG-01 至 AG-41 所有幾何遮罩、關節迴轉、覆蓋防破裂、量化容差、主連通區與 occludingFist 判定。

---

## 5. 實測 Codex R318 v5.2 候選部件
透過新版檢查器實測 `parts-r318-hand-fist-v5_2`：
- `hand_f` 握點檢查結果：
  - `mode`: `occludingFist`
  - `tier`: `PASS`
  - `detail`: `[occludingFist] 握點在主連通區內, 8方向>=12px, 槍桿兩側露出(前=58.0px, 後=53.0px, 軸向=[1.00,0.00])`
  - 證實 R318 v5.2 在握點判定上已順利通過規格 v3.21，目前僅餘總監指出的腕部弧線與殘片清理。

---

## 6. 21 槽候選狀態摘要
- 當前基準：趙雲 21 槽候選中，前手握點已由 occludingFist 解決視覺挖孔痛點。待 Codex 完成 v5.2 / v5.3 腕部清理後，前手即可閉環。

---

本信未宣稱可量產或已能播放。
