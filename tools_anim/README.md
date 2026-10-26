# 3KLife 美術動畫工具組 (`tools_anim`)

本資料夾由 **Antigravity** 開發與維護，對應工單 `AG-01`、`AG-01修訂` 與 `AG-02`，提供：
1. **`slice_and_rig.py`**：AG-02 自動切片、圖集打包與 `3klife.neutral-rig.v2` 綁點生成工具。
2. **`validate_spine.py`**（搭配 `spine_eval_helper.mjs`）：獨立 Spine 4.2 驗證器與軟體光柵化逐格渲染器。

> **驗證範圍聲明**：本工具組產出之報告皆為離線驗證（官方 `@esotericsoftware/spine-core` 4.2 + 軟體光柵化器），未經 Cocos Creator 實際載入實測前，不得宣稱「已能播放」或「可量產」。

---

## 1. 自動切片與綁點工具 (`slice_and_rig.py`)

### 功能摘要
- **輸入**：立繪母圖 PNG（如 2048×3072 RGBA）＋ 19+2 標記點 JSON（支援 ComfyUI DWPose `pose_keypoints_2d`、`chibi.hNormalizedLandmarkSet.v1` 或直接座標字典）。
- **互斥可見所有權（Mutually Exclusive Visible Ownership）**：保證原圖每個 `alpha > 0` 的可見像素恰好分配給唯一一個擁有者槽位（`unassigned = 0`、`overlap = 0`），Setup Pose 回組與原圖比較每通道最大差 `<= 2`（實測為 `0`）。
- **透明區與標記點清理**：自動將 `alpha <= 8` 的透明邊緣雜訊歸零，並修補純綠 `(0,255,0)` / 純紅 `(255,0,0)` 數位標記殘留。
- **輸出**：
  - `parts/*.png`（20+1 切件）與 `masks/*.png`（可見遮罩）、`animation-masks/*.png`（關節圓弧延伸遮罩）
  - `<name>.png` 與 `<name>.atlas`（Spine legacy 格式：`xy / size / orig / offset`，`padding >= 2 px`，`rotate: false`）
  - `source-rig.json`（預設 schema `3klife.neutral-rig.v2`，統一骨名與槽名為 `thigh_f/b`、`shin_f/b`，並附 `boneV1Compat` 與 `hand_f_grip`/`hand_b_grip` 手掌接觸點，向下相容 Sparkle 產生器）
  - `cutout_validation_report.json` 與 `qa/` 縮圖預覽（125px / 250px / 500px）

### 執行範例
```powershell
# 趙雲 C2（DWPose + Polygon Manifest + Voronoi 自動補齊）
C:\Users\User\AppData\Local\Programs\Python\Python313\python.exe tools_anim/slice_and_rig.py `
  --image <c2_master.png> `
  --landmarks <zhaoyun-pose-18body-hands.json> `
  --polygons <c2-cutout-manifest.json> `
  --name zhaoyun_c2 `
  --out-dir scratch/test_slice_zhaoyun_c2

# 張飛 Q3（19點座標 JSON + 既有切件）
C:\Users\User\AppData\Local\Programs\Python\Python313\python.exe tools_anim/slice_and_rig.py `
  --image <zhangfei_master.png> `
  --landmarks <zhangfei-r183-19point-coordinates.json> `
  --parts-dir <parts_dir> `
  --name zhangfei_q3 `
  --out-dir scratch/test_slice_zhangfei_q3
```

---

## 2. 獨立 Spine 4.2 驗證器 (`validate_spine.py`)

### 功能摘要
- 透過 `spine_eval_helper.mjs` 呼叫官方 `@esotericsoftware/spine-core@4.2.x` 載入 `.json` 與 `.atlas`，執行 `Physics.reset` / `Physics.update` 與 `AnimationState` 逐格求值。
- 檢查項目：
  1. `drawOrder` 時間軸唯一性（無重複索引、無空洞/undefined slot）。
  2. 部位剛性（`head`、`weapon`、`hand_f/b`、`foot_f/b`、`pauldron_f/b` 不得跨骨加權變形）。
  3. 加權網格權重和 = 1.0、Setup Pose 零變形、無翻面三角形（Setup 與全動畫影格）。
  4. 雙手持槍段（`thrust` 0.80s ~ 2.67s）手掌接觸點（`hand_f_grip`/`hand_b_grip`）到武器握點（`grip_A`/`grip_B`）距離 `<= 1.0 px`。
  5. `idle` 與 `walk` 單手持槍時後手 IK mix = 0。
  6. `walk` 原地踏步（`root` 位移 = 0）、支撐腳接地漂移 `<= 0.02H`、首尾 Pose 閉合。
  7. 獨立軟體光柵化逐格渲染 PNG，並以像素級別計算 `head` 臉部遮擋率（門檻 `<= 5.0%`）。

### 執行範例
```powershell
# 完整驗收（輸出 JSON 報告與逐格渲染 PNG）
C:\Users\User\AppData\Local\Programs\Python\Python313\python.exe tools_anim/validate_spine.py `
  --json artifacts/art-direction/sparkle-handoff/sparkle-v4-output-42/zhaoyun.json `
  --atlas artifacts/art-direction/sparkle-handoff/sparkle-v4-output-42/zhaoyun.atlas `
  --rig artifacts/art-direction/spine-proof/source-rig.json `
  --out-dir scratch/audit_sparkle_v4_42

# 精簡 PASS/FAIL 摘要模式（每項一行，可直接貼給 Sparkle；若任一項未過則 exit code = 1）
C:\Users\User\AppData\Local\Programs\Python\Python313\python.exe tools_anim/validate_spine.py `
  --json artifacts/art-direction/sparkle-handoff/sparkle-v4-output-42/zhaoyun.json `
  --atlas artifacts/art-direction/sparkle-handoff/sparkle-v4-output-42/zhaoyun.atlas `
  --rig artifacts/art-direction/spine-proof/source-rig.json `
  --out-dir scratch/audit_sparkle_v4_42 `
  --fail-on
```
