# AG-01 修訂與 AG-02 工具交付報告：自動切片綁點工具 `slice_and_rig` 與 Spine 4.2 獨立驗證器 `validate_spine`（含 Sparkle v1/v2-42/v3-42 獨立審核數據）

- **日期**：2026-10-26 19:10
- **寄件者**：Antigravity (`antigravity-gemini-4-argon` / 工具開發)
- **收件者**：Claude（角色美術總監）、專案負責人
- **對應工單**：
  - `2026-10-26-1730_general_AG-01_動畫產生器工單與疑問裁決.md`
  - `2026-10-26-1823_general_AG-01修訂_分工改為切片與審核.md`
- **程式碼分支與 Commit**：`antigravity/anim-generator` @ `fcb20ed31`
- **驗證範圍聲明**：本報告所有數據均為**離線驗證通過**（使用官方 `@esotericsoftware/spine-core@4.2.104` 與獨立軟體光柵化器），**未經 Cocos Creator 實際載入實測，不宣稱「已能播放」或「可量產」**。

---

## 一、交付工具清單（`tools_anim/` @ `fcb20ed31`）

1. **`tools_anim/slice_and_rig.py`（AG-02 第一優先：自動切片與綁點工具）**
   - **輸入支援**：
     - `--image <master.png>`：立繪母圖（如 2048×3072 RGBA PNG）。
     - `--landmarks <json>`：自動識別 ComfyUI DWPose (`pose_keypoints_2d` + 手部關鍵點)、`chibi.hNormalizedLandmarkSet.v1`（如張飛 R183 19 點 JSON）或直接座標字典，統一推導出 **19 個身體點**（`nose`, `head_center`, `neck`, `chest`, `waist`, `pelvis`, `root`, `shoulder_f/b`, `elbow_f/b`, `wrist_f/b`, `hip_f/b`, `knee_f/b`, `ankle_f/b`）＋ **2 個武器握點**（`grip_A`, `grip_B`）＋ **2 個手掌接觸錨點**（`hand_f_grip`, `hand_b_grip`，取自手掌切件 alpha 重心）。
     - 支援 `--polygons`（多邊形清單 + 自動 Voronoi 補齊未分配像素）、`--masks-dir`、`--parts-dir`，或純 19+2 標記點骨骼線段距離場自動分區。
     - 支援 `--weapon-image` 獨立武器來源（並將母圖內嵌武器另存為 `reference_only_weapon.png`，符合 R207/R216 規範）。
   - **硬指標保證**：
     - **互斥可見所有權（Mutually Exclusive Visible Ownership）**：母圖每個 `alpha > 0` 的可見像素恰好分配給唯一一個擁有者槽位，`unassigned = 0`、`overlap = 0`。
     - **零誤差回組**：Setup Pose 回組與清理後母圖比較，RGB 與 Alpha 每通道最大差為 **`0`**（遠優於 `<= 2` 門檻）。
     - **透明區與標記點清理**：自動將 `alpha <= 8` 的透明邊緣雜訊歸零，並清除純綠 `(0,255,0)` / 純紅 `(255,0,0)` 數位標記殘留。
     - **雙層遮罩**：除可見互斥遮罩 `masks/*.png` 外，自動在肢體關節樞紐處生成圓弧外擴的 `animation-masks/*.png` 供動時防破洞。
     - **圖集與 `3klife.neutral-rig.v2`**：自動打包單張 `<name>.png`（`padding >= 2 px`、`rotate: false`）與 Spine legacy `<name>.atlas`（`xy / size / orig / offset`）；輸出 `source-rig.json`（預設 `3klife.neutral-rig.v2`，骨名與槽名統一為 `thigh_f/b`、`shin_f/b`，並附 `boneV1Compat` 欄位向下相容 Sparkle 動畫產生器）。

2. **`tools_anim/validate_spine.py` + `tools_anim/spine_eval_helper.mjs`（Spine 4.2 獨立驗證器與逐格渲染器）**
   - 透過 Node 呼叫官方 `@esotericsoftware/spine-core@4.2.104` 載入任何 `.json` + `.atlas`，執行 `Physics.reset` / `Physics.update`（驗證 `PhysicsConstraint` 物理阻尼）與 `AnimationState` 逐格求值。
   - 獨立軟體光柵化器（OpenCV + NumPy）依各格實際 `drawOrder` 與三角形 UV 仿射變換逐格渲染 PNG 及 Contact Sheet，並以像素級別計算 `head` 臉部遮擋率。

---

## 二、AG-02 `slice_and_rig.py` 實測驗收結果（趙雲 C2 與張飛 Q3）

我們在 `scratch/` 下對兩組真實武將資料執行了完整離線驗收：

| 測試對象 | 輸入標記格式 | 原圖可見像素 (`alpha > 0`) | 清除透明雜訊 (`alpha <= 8`) | 未分配像素 (`unassigned`) | 重疊像素 (`overlap`) | 回組 RGB / Alpha 最大差 | 離線驗收結果 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **趙雲 C2** (`test_slice_zhaoyun_c2`) | DWPose 18體+雙手 (`r190`) + C2 草案 (`r206`) | `2,025,869` | `53,396` px | **`0`** | **`0`** | **`0` / `0`** | **PASS** |
| **張飛 Q3** (`test_slice_zhangfei_q3`) | R183 19點 (`chibi.hNormalizedLandmarkSet.v1`) | `719,725` | `0` px | **`0`** | **`0`** | **`0` / `0`** | **PASS** |

- 說明：原本 `r206-c2-cutout` 草案有 `597,703` 個未分配可見像素（覆蓋率僅 71.25%）與 `413,032` 個重疊像素；經 `slice_and_rig.py` 的互斥所有權與骨骼距離場自動補齊後，**未分配與重疊全數降為 `0`，回組誤差為 `0`**，並已產出 `zhaoyun_c2.atlas`、`zhaoyun_c2.png`、`source-rig.json` (`3klife.neutral-rig.v2`) 與 `qa/` 125/250/500px 預覽圖。

---

## 三、`validate_spine.py` 對 Sparkle 三個版本的獨立審核報告

我們使用獨立驗證器對 Sparkle 的 **v1 (3.8.99)**、**v2-42 (4.2.0)**、**v3-42 (4.2.0)** 進行了全面量化審核，數據如下表：

| 審核指標（門檻） | Sparkle v1 (`3.8.99`) | Sparkle v2-42 (`4.2.0`) | Sparkle v3-42 (`4.2.0`) | 審核判定（以最新 v3-42 為準） |
| :--- | :---: | :---: | :---: | :--- |
| **官方 `@esotericsoftware/spine-core` 4.2 載入與播放** | PASS (0 錯誤) | PASS (0 錯誤) | PASS (0 錯誤，含 6 個 PhysicsConstraint) | **PASS** |
| **`drawOrder` 唯一性（無重複、無空洞）** | 0 錯誤 | 0 錯誤 | 0 錯誤 | **PASS** |
| **`head` 臉部最大遮擋率（`<= 5.0%`）** | **6.21%** (FAIL) | **13.77%** (`thrust` f69, FAIL) | **4.997%** (`thrust` f34, 壓線 `<= 5%`) | **PASS（壓線 4.997%，建議再降）** |
| **雙手持槍段前手掌重心到 `grip_A`（`<= 1.0 px`）** | **83.81 px** (FAIL) | **0.412 px** (PASS) | **0.412 px** (PASS) | **PASS** |
| **雙手持槍段後手掌重心到 `grip_B`（`<= 1.0 px`）** | **617.12 px** (FAIL) | **0.622 px** (PASS) | **0.621 px** (PASS) | **PASS** |
| **`idle` / `walk` 單手持槍後手 IK mix = 0** | 0.0 / 0.0 (PASS) | 0.0 / 0.0 (PASS) | 0.0 / 0.0 (PASS) | **PASS** |
| **`walk` 原地踏步 `root` 位移（`= 0 px`）** | **1191.6 px** (FAIL) | **0.0 px** (PASS) | **0.0 px** (PASS) | **PASS** |
| **`walk` 支撐腳接地漂移（`<= 0.02H`）与首尾閉合** | 0.000H / 0.0 px | 0.000H / 0.0 px | 0.000H / 0.0 px | **PASS** |
| **部位剛性（`head`, `pauldron_f/b` 不跨骨變形）** | `pauldron_f/b` 違規 | **`head`, `pauldron_f`, `pauldron_b` 違規** | **`head`, `pauldron_f`, `pauldron_b` 違規** | **FAIL（3 個剛體槽位被跨骨加權）** |
| **動畫過程無翻面三角形（`= 0`）** | 8 個翻面 | 0 個翻面 | **`thrust`/`attack` 各 26 個翻面**（`skirt` 42, `head` 10） | **FAIL（v3 新增翻面三角形）** |
| **`thrust` 的 `root` 保持原地不動** | 位移 `311.98 px` | 位移 `420.25 px` | 位移 **`420.25 px`** | **FAIL（違反 AG-01「thrust 的 root 不動」）** |

### 給 Claude 總監與 Sparkle 的深度診斷（我們抓到的 4 個關鍵問題根因）

1. **為什麼 Claude 在 `review-v3` 看到「待機與走路每格手部都有小綠點、紅點」？**
   - **根因查明**：我們用 `validate_spine.py` 掃描 `sparkle-v3-output-42/zhaoyun.png` 圖集與我們自己光柵化渲染出的 `scratch/audit_sparkle_v3_42/renders/walk_frames/`，發現：
     - **第一層原因（主因）**：`review-v3/走路逐格.png` 上有 **232 個純綠 `(0,255,0)` 與 1,749 個純紅 `(255,0,0)` 像素**，那是 **Sparkle 自己的預覽渲染器在畫面上疊加繪製的 `grip_A`（綠十字）與 `grip_B`（紅十字）debug 標記**！我們用 `validate_spine.py` 乾淨渲染時，手部沒有那個十字。
     - **第二層原因（次因）**：`zhaoyun.png` 的透明邊緣確實殘留了 `alpha = 1` 的純綠 `(0,255,0,1)` 像素 1 個與純紅 `(255,0,0,1)` 像素 35 個（散落在 `thigh_b`, `thigh_f`, `foot_f`）。我們的 `slice_and_rig.py` 已預設將 `alpha <= 8` 歸零並清除純色標記點。
2. **剛體槽位違規（`head`、`pauldron_f`、`pauldron_b`）與翻面三角形**：
   - Sparkle v2/v3 把 `head` 做成了 299 頂點、516 三角形的加權網格，並綁給了 `["hair_tail", "hair_tail_mid", "hair_tail_tip", "head"]` 四根骨頭！當 v3 加入 `PhysicsConstraint` 甩動 `hair_tail` 時，連帶把 `head` 頂部網格拉扯到翻面（`head` 出現 10 個翻面三角形，`skirt` 也因跨綁 6 根骨頭在 `thrust` 出現 42 個翻面三角形）。
   - 同樣地，`pauldron_f` 與 `pauldron_b` 被綁到了 `["pauldron_f/b", "torso"]` 兩根骨頭，違反 AG-01「頭盔、臉、肩甲剛體不可被鄰骨拉扯變形」的規定。
   - **修正建議**：請 Sparkle 將 `head`、`pauldron_f`、`pauldron_b` 改回 `type: "region"`（或 100% 單骨權重 `head` / `pauldron_f` / `pauldron_b`），絕對不要讓 `head` 吃到 `hair_tail` 的權重。
3. **為什麼雙手持槍距離數據顯示 `< 1 px`，但 `idle` / `walk` 單手握槍看起來「手握在槍桿旁空氣」？**
   - Sparkle v2/v3 修改了 `hand_f` 與 `hand_b` 的 region attachment 偏移（`hand_f` 改為 `x: -19.06, y: 10.14`），讓手掌切件的 alpha 重心直接疊在 `hand_f` 與 `hand_b` 骨骼原點上；接著在 `thrust` 的 `0.67s` 透過 `weapon.translate: (79.06, 26.36)` 把槍桿拉回 `hand_f` 原點，因此在 `thrust (0.80s ~ 2.67s)` 雙手持槍期間，前後手掌心到 `grip_A` / `grip_B` 的距離確實只有 `0.412 px` 與 `0.621 px`。
   - **破綻在於 Setup Pose、`idle` 與 `walk`**：在 Setup Pose 中，`weapon` 骨骼設在 `hand_f` 的 `(-79.06, -26.36)`，而 `idle` 與 `walk` 時 `weapon.translate` 為 `(0, 0)`！這導致**在 `idle` 與 `walk` 整段動畫中，槍桿握點 `grip_A` 距離前手掌心整整偏離了 `83.34 px`**（前手握在槍桿左上方約 83 px 的空氣中）。
   - **修正建議**：`weapon` 骨骼在 Setup Pose 下相對於 `hand_f` 的位移就應該直接對齊 `hand_f_grip`（我們在 `slice_and_rig.py` 產出的 `source-rig.json` `anchors.hand_f_grip` 已直接算好精確座標），而不是在 Setup Pose 偏離 83 px 再靠 `thrust` 的 `weapon.translate` 補救。
4. **`thrust` 的 `root` 仍有 `420.25 px` 位移**：
   - 依 AG-01 規格，`thrust` 的 `root` 必須保持 `(0, 0)` 不動，前衝跨步應由 `pelvis` 與 `ik_foot_f` 在局部空間完成，避免進遊戲後角色原點暴衝；目前 Sparkle v3 的 `root` 在 `thrust` 橫移了 `420.25 px`。

---

## 四、後續待命

- 我們的 `slice_and_rig.py` 與 `validate_spine.py` 已推送至 `origin/antigravity/anim-generator`（commit `fcb20ed31`）。
- 隨時可對 Sparkle v4 或新切件母圖執行自動切片與驗證審核！
