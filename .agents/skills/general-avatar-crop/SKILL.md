<!-- doc_id: doc_agentskill_0061 -->
# Skill: general-avatar-crop

武將頭像裁切工作流程。從立繪 PNG 裁切 256×256 頭+脖子頭像，並自動套用到戰場 HUD 左上角（主將）與右上角（敵將）。

---

## 概覽

| 項目 | 說明 |
|------|------|
| 輸入 | `assets/resources/sprites/generals/{id}_portrait.png` |
| 設定 | `assets/resources/data/general-avatar-crops.json` |
| 輸出 | `assets/resources/sprites/generals/avatars/{id}_avatar.png` |
| 尺寸 | 256×256 px（固定正方形） |
| 演算法 | Box-filter 面積平均縮放（pngjs，純 JS） |

HUD 載入優先順序：**avatar → portrait → placeholder**（`BattleHUDComposite._applyPortrait`）

---

## 快速操作

```bash
# 產生所有武將頭像
node tools_node/generate-general-avatars.js

# 只產生指定武將
node tools_node/generate-general-avatars.js cao-cao

# 驗證設定，不寫檔
node tools_node/generate-general-avatars.js --verify
```

---

## 新增武將頭像 SOP

### 1. 確認立繪存在

```
assets/resources/sprites/generals/{generalId}_portrait.png
```
命名規則：kebab-id 轉底線，例如 `cao-cao` → `cao_cao_portrait.png`。

### 2. 量測裁切座標

在原尺寸立繪上標出頭頂、下巴、左右臉頰邊界、鼻樑中線與左右肩膀輪廓，再記錄 **x, y, w, h**（從圖像左上角算起，像素為單位）。此設定只允許裁框移位、等比例縮放及透明留白；不可生成式重畫、旋轉、拉伸或修整人物。

裁框座標不可憑整張人物的視覺重心估算：令 `faceCenterX=(faceLeft+faceRight)/2`，正方形裁框左緣設為 `x=faceCenterX-w/2`，再在輸出預覽中量測臉部外框中心偏差。置中的是額際至下巴、兩側臉頰／下顎組成的整張臉，不是鼻尖、頭部軸線、髮型或人物全身重心。臉朝向一側或頭部傾斜時，保留原本角度；鼻樑／鼻尖不必落在畫布中線，不能為了置中鼻子而把臉裁偏。

**只允許裁切幾何調整：** 可平移裁框、等比縮放、調整透明留白；不可旋轉、拉伸、扭正、液化、生成式重畫、修臉，或局部移動五官／頭髮／頭飾。先判斷是臉相對畫框偏心，還是來源原圖的頭臉本身歪斜或五官變形：前者只平移裁框；後者不可能由裁切修復，必須判退該頭像來源並回報，不能把重裁說成修好了臉。

重點：
- `y` 通常設 `0`，讓頭冠從最頂端開始；若頭飾有透明安全邊，保留該邊，不可切冠。
- `w/h` 比例接近 1:1，輸出只等比例縮放，不得把人物壓扁或拉長。
- 大頭像須同時包含完整頭臉、頸部、左右肩膀和上胸；小頭像須完整保留頭髮／頭盔至下巴、頸部及左右肩上緣。不可用窄裁框換取大臉而裁掉一側肩膀。
- 量測左右肩膀時，肩點必須落在各自臉部外框之外，並至少離臉緣 5% 裁框寬度；要標在肩膀外輪廓，不能用頸部、髮束、領口或胸口點代替。工具可檢查肩點位置與像素，最終仍須並排核對兩側肩線是否實際可辨認。
- 若在完整頭飾、臉置中、兩肩可見三項不能同時成立，先試其他正式站姿來源或調整裁框；仍無法達成就停止入庫並回報，不可犧牲其中一項湊數。

### 3. 寫入裁切設定

編輯 `assets/resources/data/general-avatar-crops.json`：

```json
{
  "version": 1,
  "outputSize": 256,
  "crops": {
    "new-general": { "x": 150, "y": 0, "w": 500, "h": 480,
      "$note": "立繪尺寸 720×1280，站立姿，頭居中" }
  }
}
```

### 4. 驗證設定

```bash
node tools_node/generate-general-avatars.js new-general --verify
```
確認輸出無 `❌` 錯誤，特別檢查 `x+w` 是否超出圖寬、`y+h` 是否超出圖高。

### 5. 執行生成

```bash
node tools_node/generate-general-avatars.js new-general
```

### 6. 視覺驗收

先以 125px 縮圖驗收；只有無法判斷時才升至 250px。按以下順序逐項量測，不可用「看起來差不多」放行：
- 頭頂、主要冠飾／髮飾與下巴完整，沒有貼邊或切斷。
- 臉部外框中心垂直線須與畫布中心垂直線重合，誤差最多 `1` 個輸出像素。置中依左右臉頰／下顎外框的中點計算，不用鼻尖或人物整體重心；臉朝向或頭部傾斜須保留，也不可旋轉原圖來校正。若原圖的臉本身歪斜或五官失真，判退來源，不可用裁切冒充修復。
- 左右肩部輪廓都在框內且可辨認；胸像 `avatar` 另須看見上胸／胸甲。肩膀整體消失、只剩單側肩或裁框切斷肩部，一律判退。
- 記錄輸出臉中心偏差百分比、頭部高度占比、兩肩是否可見及裁框座標。

任一項不合格就不要登錄／覆蓋正式頭像；只調整 `general-avatar-crops.json` 的 x/y/w/h 並重跑驗收。x/y 用於移動裁框，w/h 只能等比改變取景尺度；禁止旋轉原圖、改動人物像素或局部修臉。若原立繪無法同時容納完整頭飾、置中臉部及雙肩，或來源臉本身歪斜／變形，停止發布並回報來源限制，不得重畫人物或用變形硬塞。

### 7. Cocos Creator 匯入

在 Cocos Creator 中對 `assets/resources/sprites/generals/avatars/` 按右鍵 → **Refresh Assets**，讓 `.meta` 更新。

---

## HUD 接線說明

`BattleHUDComposite.setPlayerGeneralId(generalId)` / `setEnemyGeneralId(generalId)` 傳入 kebab-id（例如 `"cao-cao"`）。

內部 `_applyPortrait` 自動依序嘗試：
1. `sprites/generals/avatars/{id}_avatar`（256×256 頭像）
2. `sprites/generals/{id}_portrait`（完整立繪）
3. `sprites/battle/portrait_player_placeholder` / `portrait_enemy_placeholder`

戰場左上角 = Player（主將）、右上角 = Enemy（敵將）。

---

## 現有武將裁切座標

| 武將 | 立繪尺寸 | x | y | w | h | 說明 |
|------|----------|---|---|---|---|------|
| cao-cao | 1024×1024 | 200 | 0 | 600 | 500 | 寬冠+披風，正中站立 |
| guan-yu | 768×1377 | 84 | 0 | 600 | 520 | 龍飾頭盔，細長直式 |
| lu-bu | 720×1280 | 110 | 0 | 500 | 530 | 超高紅羽毛，y 必須從 0 開始 |
| zhang-fei | 720×1280 | 100 | 0 | 520 | 480 | 蹲踞姿，頭巾寬 |
| zhao-yun | 1024×1024 | 100 | 0 | 800 | 500 | 衝刺動作，長髮橫飛 |
| zhen-ji | 447×559 | 50 | 0 | 347 | 280 | 小圖，正中站立 |

---

## 相關檔案

- `assets/resources/data/general-avatar-crops.json` — 裁切座標設定真相來源
- `tools_node/generate-general-avatars.js` — 生成工具
- `assets/scripts/ui/components/BattleHUDComposite.ts` — HUD 接線（`_applyPortrait`）
- `assets/resources/sprites/generals/avatars/` — 輸出目錄

---

## 美術庫小頭像 `small_avatars` 流程

本節處理 `artwork/general-art-library/small_avatars/`，與上面的遊戲 HUD 大頭像設定分開。小頭像只可從既有美術庫來源裁切，不可重畫、修臉或改造型。正式輸出沿用武將 ID 與遞增版本號，例如 `cao_cao__曹操__small_avatar_0002.png`。

### 批次裁切與驗收

1. 從 `artwork/general-art-library/catalog.json` 建立名冊：保留現存且已核可的檔案，只處理缺檔、缺記錄或明確被使用者退件的武將。不要因候選狀態或舊目錄記錄而復原使用者刪掉的版本。
2. 每位先挑一張高解析 `avatars/` 或 `standing/` 來源；頭飾、髮束或雙肩被扇子、武器、手臂遮住時，換來源。來源仍無法同時容納完整頭飾、清楚臉框與雙肩，就判退該來源並記錄原因。
3. 使用 `tools_node/batch-general-avatar-crops.js` 與 `tools_node/small-avatar-crop-guide.js`，在原圖座標標記 `head`、`face`、完整頭飾／髮絲 `extent`、左右肩面 `shoulders`。臉部中線使用左右臉框中點；不以鼻尖或臉朝向校正。所有變換只可等比例縮放和平移裁框。
4. 自動找臉使用 `tools_node/fit-avatar-reference.py` 內附的 YuNet 模型 `tools_node/models/face_detection_yunet_2023mar.onnx`，需要 `Pillow` 與 `opencv-python-headless`（安裝：`python -m pip install -r tools_node/requirements-avatar-crop.txt`）。自動框只用來提出初始取景；若框錯到頭髮、頭飾或下巴，改用人工臉框／另一張來源，不得把偵測框當驗收結果。
5. 小頭像量測分兩個框，不可混用：`head` 是髮型／盔體至下巴的頭部高度，**最低與目標皆為 `75%`**；`face` 是額際至下巴的臉部框，依核可基準採用高度 `38–50%`、寬度 `27.6–39.6%`。自動取景預設以臉高對齊基準目標 `44%`，寬度獨立驗證；若完整頭飾與肩部不能同框，先換來源。肩部是最後取捨條件，不得為了露出更多肩部而把頭縮到 `75%` 以下。不可用臉框面積平均縮放，否則過寬的偵測框會讓成品臉部明顯偏小。如需覆寫批次預設，明確在 manifest 設定 `smallHeadCalibration`，但不得降低 `75%` 最低值；不得為了達標把頭冠當成顱部，或把髮絲／五官標記錯來湊比例。
6. 左右肩標記須落在看得出來的肩面上，超出各自臉緣至少裁框寬 `5%`。扇子、武器或袖子蓋住肩面時，不能把遮擋物當肩膀；改用另一張來源。頭頂、冠飾及主要髮飾都要完整保留，左右肩面也都要在畫面內。
7. 每張候選必須在七張核可基準的同尺度對照圖中檢視。自動偵測只用來提出位置；`scale_pass_review` 仍須人工核對，不能直接收入。臉框中心中線誤差最多輸出 `1px`；頭高、臉高／寬、完整頭飾與兩肩都通過才可入庫。125px 足以判讀時停在125；不夠才依序放大至250、500。
8. 候選先留在 `artwork/temp/avatar-batch-<run-name>/`。未通過或無法目視確認的版本不可寫入正式目錄或 catalog。通過後另存為下一個版本號、更新該武將 `smallAvatar` 歷程與量測／來源資訊，並只提交本輪新增圖檔與對應 catalog 變更。

### 臉寬與頭冠複核

- 臉高與臉寬分開檢查。同角度核可圖若有量測值，可用 `--min-face-width-ratio` 或批次來源的 `minFaceWidthRatio` 設定臉寬下限。批次全域欄位為 `smallFaceCalibration.minimumWidth`。
- `faceScaleAdvice.minimumUniformZoom` 回報兩項門檻所需的最小等比放大倍率。若必要裁框容不下完整頭冠與兩肩，改用其他正式來源。
- 高帽與帽翼只標在完整外框。並排時另看髮際到下巴的臉高與兩頰寬度，避免將高冠計入頭高而放過小臉。
