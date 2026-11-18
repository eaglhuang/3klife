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
- 臉部外框中心落在畫布中線 `±3%` 寬度內。鼻樑／鼻尖只用來核對原圖的五官相對位置與方向，不要求落在畫布中線；臉朝向或頭部傾斜須保留，也不可旋轉原圖來校正。若原圖的臉本身歪斜或五官失真，判退來源，不可用裁切冒充修復。
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
