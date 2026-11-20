# 子嗣十歲歷練四路大富翁與職業屬性規格書（分片索引） — 10–11 畫面演出與資產、資料結構

> 這是 `子嗣十歲歷練四路大富翁與職業屬性規格書.md` 的「10–11 畫面演出與資產、資料結構」分片。完整索引見 `docs/遊戲規格文件/系統規格書/子嗣十歲歷練四路大富翁與職業屬性規格書.md`。

## 10. 畫面、演出、手機記憶體、美術資產

### 10.1 畫面流程

```
十歲彈窗「出發歷練」
  → 選路畫面（4 張路牌，心願標記）
  → 盤面（擲骰 → 棋子移動 → 格子結算 → 事件卡 → 下一回合）
  → 岔路選擇（盤面上彈小面板）
  → 終點大事件（事件卡）
  → 結算畫面（路線、評級、屬性、寶物、稱號、推薦學府）
  → 回大廳
```

### 10.2 演出概念

| 元件 | 做法 |
| --- | --- |
| 盤面 | 一條彎曲的水墨風道路，格子沿路點狀排列；用設定檔 `waypoints[]` 座標擺放；整張底圖每路 1 張，進入時載入，離開釋放 |
| 角色棋子 | 重用孩子現成的小頭像（small avatar）加一個圓形底框，不載入 CHAR 立繪圖集；移動用位置插值＋小跳躍動畫 |
| 骰子 | 數字骰，6 個面共用一張小圖集（或純文字數字加骰子底框）；擲骰 0.6 秒翻滾，點數出現後定格 |
| 事件卡 | 共用一組彈窗節點，重用學府打斷宿主的事件彈窗（PROG-2-9190）或同樣樣式的皮膚 `nurture-flow-default`，不新增專用節點樹 |
| 格子圖示 | 10 種圖示共用一張小圖集，用 SpriteFrame 切換，不為每格開新節點 |
| 結算 | 沿用學府結業視窗的版型：左側屬性條，右側寶物與稱號 |
| 音效 | 擲骰聲、踩格提示音、寶物閃光（沿用既有音效，缺的記在資產清單） |

### 10.3 手機記憶體（優先）

- 固定節點樹：24 個格子節點、1 個棋子、1 個骰子、1 組彈窗，進入時建立一次，四張盤面共用同一組格子節點，只換座標與圖示。
- 隱藏用 `active = false`，不動態建節點；不新增 CHAR 圖集。
- 只同時載入一張盤面底圖（建議 1024×512，壓縮貼圖），離開釋放；事件插圖用單張小圖，用完釋放。
- 驗收：進出一次歷練，節點數回到進入前正負 5%（沿用學府驗收標準）；進入盤面前後貼圖記憶體增量不超過一張底圖加一張小圖集。
- 出生禮、命名面板同樣共用彈窗節點。

### 10.4 所需美術資產清單

| 類別 | 項目 | 數量 | 備註 |
| --- | --- | --- | --- |
| 盤面底圖 | 後山、市集鄉野、書齋庭院、宮廷迴廊 | 4 | 彎曲道路，低飽和水墨風 |
| 格子圖示 | 屬性、事件、寶物、試煉、貴人、機緣、岔路、風景、起點旗、終點旗 | 10 | 同一張小圖集 |
| 路牌 | 四條路選路牌（含心願標記） | 4 | 可由文字加底框組成 |
| 骰子 | 1~6 面、控骰符圖示 3 種 | 9 | 同一張小圖集 |
| 寶物圖示 | 每路 8 件 | 32 | 可分批，先做每路 4 件 |
| 出生禮圖示 | 三位贈禮人各 4 件禮物（寶物、因子引、路引） | 12 | |
| 職業屬性圖示 | 武將、領袖、文官、教官 | 4 | 可用文字加底框 |
| 稱號徽章 | 4 條路的絕級稱號 | 4 | |
| 成長履歷 | 4 節時間軸框 | 1 組 | 沿用既有皮膚 |
| 命名面板 | 輸入框、建議名按鈕 | 0 | 沿用既有元件 |

---

## 11. 資料結構

### 11.1 設定 JSON 草案

建議路徑 `assets/resources/data/ten-year-trial.json`，另有 `name-pool.json`、`nickname-pool.json`、`name-blocklist.json`、`birth-gifts.json`。數值一律放設定，程式不寫死；暫定值見各章。

```json
{
  "version": 1,
  "trigger": { "age": 10, "mustFinishBeforeEnroll": true, "freezeWorldClock": true, "advanceSeasonsOnFinish": 0 },
  "firstChild": {
    "skipPregnancy": true, "conceptionRate": 1.0, "freeVigor": true, "epFloor": 60,
    "growthRatePerSeason": 0.5, "onceOnly": true
  },
  "board": {
    "cellsPerPath": 24, "bendsPerPath": 4, "maxTurns": 10, "dice": { "faces": 6 },
    "controlItems": { "maxPerTrip": 3, "items": ["ITEM_DICE_FIX", "ITEM_DICE_DOUBLE", "ITEM_DICE_STEADY"] },
    "forks": [ { "atCell": 8, "risky": 3, "safe": 5 }, { "atCell": 15, "risky": 3, "safe": 5 } ]
  },
  "attrTiers": [
    { "id": "common", "points": 2, "weight": 60 }, { "id": "good", "points": 4, "weight": 28 },
    { "id": "fine", "points": 8, "weight": 10 }, { "id": "peerless", "points": 15, "weight": 2 }
  ],
  "riskyTierWeights": [45, 30, 20, 5],
  "treasureRarityWeights": [60, 28, 10, 2],
  "trial": { "baseRate": 0.35, "statDivisor": 300, "minRate": 0.35, "maxRate": 0.85, "successPoints": 6, "failPoints": 1, "treasureChance": 0.25 },
  "grades": [ { "id": "S", "min": 45 }, { "id": "A", "min": 35 }, { "id": "B", "min": 25 }, { "id": "C", "min": 0 } ],
  "paths": {
    "martial": { "name": "後山鍛鍊", "mainStats": ["str", "lea"], "graspMatch": "sword", "academy": "YOUZHOU", "cells": [], "events": [], "treasures": [] },
    "leader":  { "name": "國內遊玩", "mainStats": ["cha", "lea"], "graspMatch": "jade", "academy": "LUOYANG", "cells": [], "events": [], "treasures": [] },
    "civil":   { "name": "聘請家教", "mainStats": ["int", "pol"], "graspMatch": "bamboo", "academy": "YINGCHUAN", "cells": [], "events": [], "treasures": [] },
    "mentor":  { "name": "宮廷禮教", "mainStats": ["int", "cha"], "graspMatch": null, "academy": "YINGCHUAN", "cells": [], "events": [], "treasures": [] }
  },
  "academyEffects": { "pointToStat": 0.3, "perStatCap": 20, "gradeBonus": { "S": 3, "A": 2, "B": 1, "C": 0 }, "preTotalCapPerStat": 20, "mentorAffinityBonus": 10 },
  "youthDiscount": {
    "byAge": [ { "maxAge": 14.99, "coef": 0.60 }, { "maxAge": 15.99, "coef": 0.75 }, { "maxAge": 999, "coef": 1.00 } ],
    "noTrialCoef": 0.90, "restoreOnGraduation": true, "deltaRetain": 1.0,
    "youthPreset": {
      "zhao_yun": { "martial": 70, "leader": 55, "civil": 20, "mentor": 15 },
      "guan_yu": { "martial": 80, "leader": 55, "civil": 30, "mentor": 20 },
      "zhuge_liang": { "martial": 10, "leader": 60, "civil": 85, "mentor": 50 }
    }
  },
  "wish": {
    "seedSalt": "WISH10", "baseWeight": 10, "graspMatch": 30, "routeGuide": 25, "giftTag": 10,
    "topStatGroup": 10, "teachingGene": 30, "parentClass": 5, "followBonusPct": 5, "storeAsCentiPoints": true,
    "disobey": { "numericPenalty": 0, "linesAtConfirm": 1, "linesOnEventCellMax": 2, "settleMood": "gloomy" }
  },
  "specialties": {
    "martial": ["spear", "archery"], "leader": ["rally", "benevolence"], "civil": ["study", "calc"], "mentor": ["teach", "rite"],
    "perGain": 0.5, "cap": 20,
    "specialtyStat": { "spear": "str", "archery": "lea", "rally": "cha", "benevolence": "pol", "study": "int", "calc": "pol", "teach": "int", "rite": "cha" }
  },
  "signetSlot": { "count": 1, "rarityBonus": [2, 4, 6, 10], "pickAtSettlement": true, "onGraduate": "keepAsToken" },
  "naming": { "surnameLocked": true, "givenNameLen": [1, 2], "totalMaxLen": 4, "nicknameLen": [1, 4], "charset": "cjk", "uniqueInClan": true },
  "birthGift": { "pickCount": 1, "offerCount": 3, "givers": ["youth_general", "spouse", "ancestor"], "bind": "child", "tradable": false, "maxLevel": 3, "onGraduate": "keepAsToken" }
}
```

### 11.2 存檔欄位

子嗣資料（GeneralConfig 擴充，缺值相容舊存檔）：

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `givenName`、`nickname` | string | 繁體原文；系統綽號另存 `nicknameKey` |
| `isFirstChild` | boolean | 首子旗標 |
| `birthGift` | `{ giftId, giverId, level, boundChildId, consumed }` | 出生禮 |
| `careerAttr` | `{ martial, leader, civil, mentor }` | 職業屬性點數 |
| `trialResult` | `{ route, grade, title, flags[], completedSeason, graspMatched }` | 歷練結果，`trialDone` 由此推出 |
| `trialFlags` | string[] | 學府事件解鎖旗標 |
| `awakenBias` | `{ color, weight }` 或 null | 因子引加權（第一版只存） |
| `youth` | `{ historicalFull, startStats, youthRestored }` | 少年名將折扣與還原 |

歷練進行中存檔（比照 AcademySaveRecord）：

| 欄位 | 說明 |
| --- | --- |
| `childId`、`route`、`status` | 進行中、結算中、完成 |
| `seedHex`、`stepIndex` | 固定種子與步序，唯一隨機來源 |
| `turn`、`position`、`forkChoice` | 盤面進度 |
| `attrPoints`、`itemsGained[]`、`flags[]`、`controlUsed` | 累計結果 |
| `pendingEvent` | 尚待處理的事件（重開時還原彈出） |
| `abnormalExitCount` | 防刷計數 |
| `worldClockAtStart` | 進入時 GameTimeState，凍結還原用 |

GameSession 新增 `trialRecord`；PlayerSaveSnapshot 新增 `trial`（缺值相容）。

---
