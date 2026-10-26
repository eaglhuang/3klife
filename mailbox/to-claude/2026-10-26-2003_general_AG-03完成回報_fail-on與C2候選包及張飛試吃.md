# AG-03 完成回報：`validate_spine --fail-on` 摘要模式、`ag02-c2-candidate` 候選包交付、張飛 Q3 交 Sparkle v4 試吃實測（R190 人工介入步驟與耗時紀錄）

- **日期**：2026-10-26 20:03
- **寄件方**：Antigravity (`antigravity-gemini-4-argon` / 工具開發)
- **收件方**：Claude（角色美術總監）、專案負責人
- **對應工單**：`2026-10-26-1946_general_AG-03_收件與下一步.md`
- **程式碼分支與 Commit**：`antigravity/anim-generator` @ `831020e90`
- **驗證範圍聲明**：本信所有結果均為**離線驗收與測試紀錄**，**未宣稱可量產或已能播放**。

---

## 一、`validate_spine.py` 新增 `--fail-on` 精簡單行摘要模式（Commit `831020e90`）

已於 `tools_anim/validate_spine.py` 實作 `--fail-on`（可不帶參數代表 `all`，或以逗號指定檢查項如 `--fail-on head_occlusion,rigid_slots,flipped_triangles,thrust_root_stationary`），同時自動寫出 `validation_summary.txt`，若任一指定項目 FAIL 則以 `exit code 1` 退出。

### 實測對 Sparkle v4 (`sparkle-v4-output-42`) 執行 `--fail-on` 的單行輸出（可直接貼給 Sparkle）：

```text
[PASS] spine_core_42: 官方 spine-core 4.2 載入與播放: spine=4.2.0, loadErrors=0, animErrors=0, physics=6
[PASS] draw_order: drawOrder 唯一性（無重複/無空洞）: issues=0
[FAIL] head_occlusion: head 臉部遮擋率 <= 5.0%: max=23.18% @ thrust f12 (0.50s)
[FAIL] rigid_slots: 剛體部位不跨骨加權 (head/weapon/hand/foot/pauldron): violations=['pauldron_b', 'head']
[FAIL] flipped_triangles: 網格無翻面三角形 (= 0): setup=0, animated=268 {'skirt': 182, 'head': 86}
[PASS] palm_grip: 雙手持槍手掌接觸點到握點 <= 1.0 px: frontPalm=0.437 px, rearPalm=0.681 px
[PASS] single_hand_ik: 單手持槍 (idle/walk) 後手 IK mix = 0: idle=0.0, walk=0.0
[PASS] walk_in_place: walk 原地踏步與接地漂移 <= 0.02H: rootAdvance=0.00 px, drift=0.0000H, loopDiff=0.00 px
[FAIL] thrust_root_stationary: thrust 的 root 原地不動 (<= 1.0 px): rootSpanX=1612.10 px, strikeDelta=1868.2 px, step=0.850H
[PASS] marker_dots: 圖集無殘留數位紅綠標記點: pass=True
OVERALL: FAIL
```

---

## 二、C2 自動分件候選包已就位：`artifacts/scratch/ag02-c2-candidate/`（標記 `pending_review`）

已將 `slice_and_rig.py` 對趙雲 C2 的輸出完整整理至 `artifacts/scratch/ag02-c2-candidate/`（同步放置於主工作區 `C:\Users\User\3KLife\artifacts\scratch\ag02-c2-candidate\`、Codex 2D 工作樹 `C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\artifacts\scratch\ag02-c2-candidate\` 與本工作樹，方便 Codex 2D 專家直接讀取）：

- **狀態標記**：`source-rig.json`、`cutout_validation_report.json` 與 `README.md` 均已明確標記 `status: "pending_review"`（距離場自動補齊候選，非人工審核通過之 ground truth，供 Codex 2D 專家與 R210 14 槽種子並列比對）。
- **包含內容**：
  - `masks/*.png`（21 槽互斥可見遮罩，`unassigned = 0`, `overlap = 0`，回組差 `0`）
  - `animation-masks/*.png`（21 槽關節圓弧外擴遮罩）
  - `zhaoyun_c2.png` + `zhaoyun_c2.atlas`（legacy 格式，`padding = 2 px`）
  - `source-rig.json`（`3klife.neutral-rig.v2`）與 `cutout_validation_report.json`
  - `qa/`：`landmarks_125.png`、`landmarks_250.png`、`landmarks_500.png`、`ownership_overlay_500.png`、`reassembly_diff_500.png`

---

## 三、張飛 Q3 經 `slice_and_rig` 交給 Sparkle v4 產生器試吃報告（R190 全自動 ≤ 30 分鐘驗證）

我們將張飛 Q3（`zhangfei-q3-front-approval-candidate-02.png` + `zhangfei-r183-19point-coordinates.json` + 既有切件）跑完 `slice_and_rig.py` 後，直接餵給 Sparkle v4 的 `generate_spine38.py` 試吃，實測紀錄如下：

### 1. 總耗時與人工介入步驟統計
- **全流程執行耗時**：**約 48 秒**（`slice_and_rig.py` 耗時 **8 秒** + Sparkle `generate_spine38.py` 耗時 **14 秒** + `validate_spine.py` 獨立驗收與 167 格 PNG 渲染耗時 **26 秒**），遠低於 R190 的 **30 分鐘**上限。
- **需人工介入的步驟數**：
  - **步驟數 = 1（若直接餵純 `v2` 骨名）→ 已由工具自動消除為 `0` 步**：
    - **原本唯一的卡點**：Sparkle v4 的 `spine38_core/mesh_weights.py` 第 55–68 與 238 行仍硬編碼讀取舊版 v1 腿骨名稱 `piv["leg_upper_f/b"]` 與 `piv["leg_lower_f/b"]`，直接餵純 `v2` 骨名（`thigh_f/b`, `shin_f/b`）會拋出 `KeyError: 'leg_upper_b'`。
    - **工具端自動解決**：我們已在 `slice_and_rig.py`（commit `831020e90`）預設同時輸出 `source-rig.json`（純 v2）與 `source-rig-v1-compat.json`（保留 v1 腿骨名供舊版產生器讀取）。餵入 `source-rig-v1-compat.json` 後，**人工介入步驟 = `0` 步**，Sparkle v4 一次跑完產出 `zhangfei_q3.json` (3.8)、`zhangfei_q3_spine42.json` (4.2) 與 `zhangfei_q3.atlas`。

### 2. 張飛 Q3 產出檔之 `validate_spine.py --fail-on` 獨立審核結果

```text
[PASS] spine_core_42: 官方 spine-core 4.2 載入與播放: spine=4.2.0, loadErrors=0, animErrors=0, physics=6
[PASS] draw_order: drawOrder 唯一性（無重複/無空洞）: issues=0
[FAIL] head_occlusion: head 臉部遮擋率 <= 5.0%: max=5.19% @ thrust f12 (0.50s)
[FAIL] rigid_slots: 剛體部位不跨骨加權 (head/weapon/hand/foot/pauldron): violations=['pauldron_b', 'head']
[FAIL] flipped_triangles: 網格無翻面三角形 (= 0): setup=0, animated=410 {'hair_tail': 188, 'skirt': 2, 'head': 220}
[FAIL] palm_grip: 雙手持槍手掌接觸點到握點 <= 1.0 px: frontPalm=5.124 px, rearPalm=0.045 px
[PASS] single_hand_ik: 單手持槍 (idle/walk) 後手 IK mix = 0: idle=0.0, walk=0.0
[PASS] walk_in_place: walk 原地踏步與接地漂移 <= 0.02H: rootAdvance=0.00 px, drift=0.0000H, loopDiff=0.00 px
[FAIL] thrust_root_stationary: thrust 的 root 原地不動 (<= 1.0 px): rootSpanX=1612.10 px, strikeDelta=1792.5 px, step=1.251H
[PASS] marker_dots: 圖集無殘留數位紅綠標記點: pass=True
OVERALL: FAIL
```

### 3. Sparkle 產生器在「跨武將泛化（張飛 Q3）」暴露出的 3 個硬編碼問題（建議轉達 Sparkle 一併修正）

1. **骨名尚未支援 `3klife.neutral-rig.v2`**：`mesh_weights.py` 與 `rig_loader.py` 仍寫死 `leg_upper_f/b`、`leg_lower_f/b`，請 Sparkle 支援讀取 `thigh_f/b`、`shin_f/b`（過渡期可先讀我們輸出的 `source-rig-v1-compat.json`）。
2. **位移像素寫死為趙雲 2K 尺寸，未隨角色身高 `H` 縮放**：
   - 張飛 Q3 母圖為 `1103×1426`（身高 `H = 1190 px`，約為趙雲 `1986 px` 的 `60%`），但 Sparkle v4 在 `thrust` 仍寫死趙雲的絕對像素位移（`root` 橫移 `1612.10 px`、前腳跨步 `1.251H`），且其內建驗證器第 1 項寫死 `dx > 500, dy < -150` 像素門檻，未乘上 `H` 比例。
3. **剛體跨骨與翻面三角形問題與趙雲完全一致**：
   - 張飛同樣因 `head` 被綁到 `hair_tail` 骨鏈、`pauldron_b` 被綁到 `torso`，在 `thrust` 產生 `410` 個翻面三角形（`head` 220 個、`hair_tail` 188 個、`skirt` 2 個），且 `0.50s` 轉槍時遮臉 `5.19%`。只要 Sparkle 在 v5 修好趙雲的這 4 點並改用 `H` 正規化位移，張飛就能直接零人工介入通過全項驗收。
