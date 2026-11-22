<!-- doc_id: doc_spec_1272 -->
# 學府支援卡與教官池規格書（分片索引） — 16–25 教官池與四池轉蛋、機率保底、重複卡材料、物品化、共用框架對應、並存與舊規格處置、JSON、驗收、實作卡表、待決

> 這是 `學府支援卡與教官池規格書.md` 的「16–25」分片。抽獎、權重、保底、機率公開一律照 `獎勵系統Base框架規格書.md (doc_spec_1186)` 第 12 章，本章只寫教官池的差異。

## 16. 四池轉蛋總表

| 池 | id | 抽什麼 | 貨幣 | 保底 | 重複處理 | 說明 |
| --- | --- | --- | --- | --- | --- | --- |
| 三國名將池 | `POOL_GENERAL_MAIN` | 男性武將本人 | 銅錢、靈玉 | SSR 軟 50／硬 90；SR 以上 軟 6／硬 10 | 轉經驗（doc_spec_0467） | 既有，不變 |
| 紅顏天香池 | `POOL_HEROINE` | 女將本人 | 靈玉 | SSR 軟 30／硬 50；SR 以上 軟 3／硬 5 | 轉經驗 | 既有，**仍只抽女將本人** |
| 宿命池 | `POOL_DESTINY` | 開場六大名將＋九位 | 免費 | 無 | 不重複抽樣 | 既有 |
| **教官池** | `POOL_SUPPORT` | 25 張連線卡（三類同池） | **連線券、靈玉**（**不收銀兩**） | SSR 軟 50／硬 90（與名將池完全一致，使用者 11/22 裁決）；SR 以上 軟 6／硬 10 | 傳承 +1；滿了轉學分（第 18 章） | 新增 |

- 四池全部是 `reward-pool.v1`，`disclosure.public=true`，每池一顆「機率說明」鈕（1186 §12.4）。
- **銀兩不可購買、不可抽取、不可兌換連線券**；金銀與轉蛋貨幣互不兌換（doc_spec_1247 §2）。`supportTicket`（連線券）是帳號級代幣，與求籤令、免費銅錢符同級，由 doc_spec_0464 補列；來源與價格見下。
- **連線券來源（遊戲內免費）**：學府開幕禮包 10、每屆結業 +10（S 評級 +15）、每季學府任務 +5、每日簽到每 7 天 +1。**購買價格與付費方案：待使用者**（Q-S1）。
- 連線券與靈玉同池可用，扣款走商店與錢包（E301～E303），成交後帶 `dealId` 呼叫 `reward.roll`。

## 17. 機率與保底（企劃自決，數值放 `gacha-reward-pools.json`）

**等階機率**：R 80%、SR 17%、SSR 3%（單抽與十連相同；十連為十次單抽，`maxCount=10`）。

**卡池 UP**（暫定，可改 `rosterRefs`）：SSR 的 UP 是華佗、佔 SSR 的 50%；SR 的 UP 是龐德公、黃月英，合佔 SR 的 60%。

| 等階 | 群組 | 張數 | 每張機率 |
| --- | --- | --- | --- |
| SSR 3% | UP：華佗 | 1 | 1.500% |
| SSR | 一般：司馬徽、鄭玄、孫武、關羽·夜讀、諸葛亮·草廬、蔡文姬 | 6 | 0.250% |
| SR 17% | UP：龐德公、黃月英 | 2 | 5.100% |
| SR | 一般（其餘 9 張） | 9 | 0.756% |
| R 80% | 全部 R 平分 | 7 | 11.429% |

**保底**（公式同 1186 §12.3：`p(k)` 在 `k ≥ S` 起漸升，`k ≥ H` 必出）：

| 階梯 | 基礎機率 `p0` | 軟保底起點 `S` | 曲線 `γ` | 硬保底 `H` | 平均幾抽出 | 逐點 |
| --- | --- | --- | --- | --- | --- | --- |
| SSR | 3% | 50 | 2 | 90 | 約 28.5 抽 | 第 60 抽 10%、70 抽 28.4%、80 抽 58.5%、89 抽 95.3%、90 抽 100% |
| SR 以上 | 20% | 6 | 1 | 10 | 約 4.0 抽 | 第 6 抽 36.0%、9 抽 84.0%、10 抽 100% |

- 計數存 `rewardMeta.pity[gacha.support.ssr／gacha.support.sr]`；抽到更高階就同時歸零較低階的階梯（1186 §12.3）。
- UP 規則：SSR UP 佔比 50%，**不做大保底**（沒有「下一次必 UP」），避免與軟保底雙重疊加。
- 機率說明面板內容與規則：1186 §12.4 全部適用；每張卡的個別機率由 `reward.pools` 展開，UI 不手寫。

## 18. 重複卡：傳承與材料轉換

重複卡一律走 RWD 規則 `support.duplicate.limitBreak`（`rules` 欄位引用，與 `duplicate.convert` 同位階；單一規則表，不另寫流程）：

```
抽到卡 C：
  持有 C？ 否 → 入庫（level 1、limitBreak 0）
         是 → limitBreak < 4 → limitBreak += 1，bundle: [傳承通知]
              limitBreak = 4 → bundle: [ITEM_SUP_CREDIT × {R:5, SR:20, SSR:60}]
```

- 結算走 `reward.roll` 的結果與 `reward-bundle.v1`（1186 §3.2），十連結果先入帳再演出。
- 重複抽到的卡面顯示「**傳承 +1**」或「**學分 +N**」（不叫「重複」）。
- 傳承不可手動購買，只能靠重複卡或名師兌換所拿卡本體（第 5.4 節）。

## 19. 物品化（ITM）

支援卡是**物品的一種**，不另建庫存：

```json
{
  "schema": "item-def.v1",
  "id": "ITEM_SUPCARD_SIMA_HUI",
  "kind": "card",
  "category": "supportCard",
  "rarity": 3,
  "stack": { "max": 1, "mode": "unique" },
  "bind": "household",
  "tags": ["supportCard", "sage", "academyOnly"],
  "expiry": { "type": "none" },
  "useEffect": null,
  "slot": null,
  "instanceState": { "level": 1, "exp": 0, "limitBreak": 0 },
  "display": { "nameKey": "item.ITEM_SUPCARD_SIMA_HUI.name", "iconKey": "supcard_sima_hui", "bucket": "SUPPORT_CARD" }
}
```

| 項目 | 規則（只寫差異） |
| --- | --- |
| 繼承 | ITM `item-def.v1`；`kind=card`、`stack.mode=unique`（沿用） |
| 新增 | `category=supportCard`；`instanceState`（`level`、`exp`、`limitBreak`）；`bind=household`（不離開家族倉庫） |
| 持有者 | 家庭倉庫；同 `cardId` 只有 1 件（`stack.max=1`） |
| 取得 | 只能由 RWD（轉蛋、禮包、兌換所）入庫，不能由玩家交易 |
| 升級 | ITM `use`：`useEffect.effectType=supportExp`（材料→實例 `exp`）；`level` 由伺服器依 `expToNext` 推得 |
| 舊類別 | 舊 `category=mentorCard` 保留為「舊教官卡」遷移用，遷移後不再新增（第 21.3 節） |
| 出征編制 | `usage=academyOnly`；任何出征、守城、派遣編制讀取到該類別一律排除 |

材料：`ITEM_SUP_EXP_S／M／L`（經驗）、`ITEM_SUP_CREDIT`（學分）皆為 `kind=consumable／material`，`stack.mode=stackable`，上限 9999。

## 20. 共用框架對應（只寫差異，不另起一套）

| 本書玩法 | 繼承的 base | 只寫差異 |
| --- | --- | --- |
| 卡片、材料、等級、傳承實例 | **物品庫存 ITM**（doc_spec_1184） | `category=supportCard`、`instanceState`、`useEffect=supportExp`、`bind=household` |
| 傳承（突破） | **獎勵 RWD**（doc_spec_1186）的重複卡規則 | 規則 `support.duplicate.limitBreak`；溢出轉學分用 `reward-bundle` |
| 教官池抽取、保底、機率公開 | **獎勵 RWD** 第 12 章 | `POOL_SUPPORT` 的設定值；`itemQuery`（依 ItemDef 條件展開，類比 `rosterQuery`） |
| 效果欄（修業加成、羈絆、體力、壓力…） | **技能 SKL**（doc_spec_1187）的 `status-effect.v1` | 師門內每張卡產生一組 `status-effect`，`modifiers[].target` 用 `academy.*`（見 22.2 目標表）；聚合與上限由學府結算讀取 |
| 點撥、學府戰法學習折扣、頓悟習得 | **技能 SKL** `learn` | `source=academyHint`、`discountByHintLv`；不新增學習流程 |
| 連續事件 57 段與彩蛋尾聲 | **劇情 STY**（doc_spec_1188）事件卡 | `SUPEVT_*`；條件＝羈絆門檻；選項穩／皮 |
| 事件獎勵發放 | **獎勵 RWD** `reward.grant` | 屬／體／點／壓 四種效果；`eventBoost` 倍率 |
| 修業主流程、選課 | **任務**（`taskKind=academy`，doc_spec_1185） | 每回合結算前加一個「到場抽籤」step |
| 結業稱號與學閥 | **獎勵 RWD** `title` | 師承稱號、派系影響力 +0.5 |
| 兌換所 | **商店 SHP**（doc_spec_1183） | 品項表 `support-exchange.json`；金錢價格待使用者 |
| 在學期間占用 | **OCC**（doc_spec_1248） | 師門卡**不登記** OCC（不是人）；教官武將照舊登記 `mentorAssign` |

不新增任何「教官卡專用」系統：沒有獨立背包、獨立抽卡、獨立事件引擎、獨立技能。

## 21. 與教官武將並存、舊規格處置

### 21.1 並存規則

1. **教官武將**（1179 第 14 章）與**支援卡**可同時使用：一屆修業最多教官 3 位（祠堂 Lv.4 起 4 位）加師門 6 席。
2. **本尊與投影**：卡的 `projectionOf` 指向某人物；若該人物同時被指派為教官，該卡羈絆成長 ×1.2，並解鎖一次通用事件「本尊駕到」（本尊吐槽投影，羈絆 +10、壓力 −5；一屆最多一次）。
3. 同一人物不會因為有卡而不能出征：卡是投影，不占 OCC。被指派教官的人物仍照 OCC 規則不能出征。
4. 紅顏池抽到女將本人（例：蔡文姬）與教官池抽到蔡文姬連線卡是兩個獨立物品，互不影響；紅顏池規則（起始好感 60）不變。
5. 教官武將**仍不提供屬性加成**；所有加成只來自支援卡。這一點保留 11/21 早上的原則，避免兩套加成互相疊加失控。

### 21.2 舊規格處置（改為「恢復並改寫」）

| 規格 | 處置 |
| --- | --- |
| 教官系統（支援卡）及 11 份教官卡舊規格（doc_spec_0562、0563、0569、0318、1133 相關） | 11/21 上午的退場註記**改寫**：教官池與卡片「恢復」，以本書為準；舊文中「碎片合成、借將、教官屬性加成、個性傳承」仍退場；舊的 ★ 星等突破、五來源、被動技詞條，全部由本書的「傳承、等級、效果欄」取代 |
| doc_spec_1179 第 14 章 | 14.2 退場清單中「教官卡」列改為改寫；新增 14.11（支援卡接線），見該章回寫 |
| doc_spec_1182 第 13 章與 1184 | ITM 新增 `category=supportCard`；`mentorCard` 僅作舊檔遷移 |
| doc_spec_0042（轉蛋系統） | 三池分工改為四池分工；支援卡池由本書接手 |

### 21.3 舊存檔遷移（對 1179 14.2 的修訂）

1. 已持有的舊教官卡：若本書有對應 `cardId`（以人物名對照），直接轉成該連線卡實例（等級 Lv1、傳承依舊星等 0～4 取 `min(星數, 4)`）；無對應者維持 14.2 的「招攬信物」。
2. 舊碎片：依 14.2 `fragmentToSilver` 兌換（比率仍待使用者，與本書無關）；不可兌換連線券。
3. 進行中的修業不中斷。

## 22. 建議 JSON（企劃自決，數值可調）

### 22.1 檔案

| 檔案 | 內容 |
| --- | --- |
| `assets/resources/data/support-cards.json` | 25 張卡（第 4.2 節欄位＋逐卡效果值） |
| `assets/resources/data/support-rules.json` | 等級上限、`expToNext`、傳承、`togetherAt`、羈絆增量、點撥表、事件獎勵表 |
| `assets/resources/data/support-deck-rules.json` | 師門席數、成型加成、師承組合、風格加權 |
| `assets/resources/data/support-exchange.json` | 名師兌換所（學分） |
| `assets/resources/data/gacha-reward-pools.json` | 新增第 4 個池 `POOL_SUPPORT` |

### 22.2 `status-effect` 目標表（效果欄接 SKL）

| `modifiers[].target` | 效果 |
| --- | --- |
| `academy.trainBoost` | 修業加成 |
| `academy.favoredWeight` | 得意課出現率 |
| `academy.initStat` | 入學初始屬性（需帶 `stat`） |
| `academy.bondGain` | 羈絆加成 |
| `academy.hintFreq` | 點撥頻率 |
| `academy.vigorSave` | 體力消耗降低 |
| `academy.restRecover` | 午睡回復 |
| `academy.eventBoost` | 事件加強 |
| `academy.bondStart` | 入學初始羈絆 |
| `academy.togetherBoost` | 促膝同心加成 |
| `academy.stressSave` | 每回合壓力減少 |
| `academy.allStat` | 入學全屬性 |

### 22.3 `support-rules.json` 重點欄位

| 欄位 | 值 |
| --- | --- |
| `cap0` | `{R:20,SR:25,SSR:30}`；`capPerBreak` 5；`maxBreak` 4 |
| `expToNext` | `100 + 40 × (L − 1)` |
| `creditExp` | 20；`creditOverflow` `{R:5,SR:20,SSR:60}` |
| `deckSlots`／`borrowSlots` | 5／1；`deckPresets` 3 |
| `showWeight` | `{base:100, favoredBase:0.5}` |
| `bond` | `{courseGain:7, restGain:4, eventStable:8, eventPlayful:4, togetherAt:80, hintAt:50}` |
| `together` | `{base:0.20, cap:1.0, stat:{R:2,SR:3,SSR:5}, vigorDiscount:0.10, break4Mult:1.25}` |
| `caps` | `{trainBoost:0.8, vigorSave:0.3, restRecover:1.0, hintRate:0.6}` |
| `hint` | `{baseRate:0.15, bondBonus:0.05, pointsPerLevel:[2,4,6,8,10], discount:[0,0.1,0.2,0.3,0.4,"learn"], learn5Mastery:0.6, candidateMinLv:3, eventPoints:2}` |
| `event` | `{thresholds:[25,55,80], minTurn:3, perTurnMax:1, stable:{bond:8,mult:1.0}, playful:{bond:4,mult:1.25}, boostPerTier:0.05, boostBreak:{1:0.2,3:0.4}, epilogue:{stat:2,bond:10}}` |
| `stageReward` | 第 8.3 節表 |

### 22.4 教官池 `POOL_SUPPORT`（加到 `gacha-reward-pools.json`，格式同現有三池）

```json
{
  "rosterRefs": {
    "gacha.support.up.ssr": ["SUP_HUA_TUO"],
    "gacha.support.up.sr": ["SUP_PANG_DEGONG", "SUP_HUANG_YUEYING"]
  },
  "pools": [
    {
      "schema": "reward-pool.v1",
      "id": "POOL_SUPPORT",
      "nameKey": "gacha.pool.support",
      "disclosure": { "public": true, "version": "2026-11-21" },
      "currency": ["supportTicket", "gems"],
      "maxCount": 10,
      "draw": { "mode": "weighted", "picks": 1, "replacement": true },
      "tiers": ["R", "SR", "SSR"],
      "tierRates": { "R": 0.80, "SR": 0.17, "SSR": 0.03 },
      "tierGroups": {
        "SSR": [{ "group": "up", "share": 0.5 }, { "group": "normal", "share": 0.5 }],
        "SR":  [{ "group": "up", "share": 0.6 }, { "group": "normal", "share": 0.4 }]
      },
      "entries": [
        { "tier": "SSR", "group": "up",     "effect": { "kind": "supportCard" }, "itemQuery": { "ref": "gacha.support.up.ssr" } },
        { "tier": "SSR", "group": "normal", "effect": { "kind": "supportCard" }, "itemQuery": { "category": "supportCard", "rarity": "SSR", "excludeRefs": ["gacha.support.up.ssr"] } },
        { "tier": "SR",  "group": "up",     "effect": { "kind": "supportCard" }, "itemQuery": { "ref": "gacha.support.up.sr" } },
        { "tier": "SR",  "group": "normal", "effect": { "kind": "supportCard" }, "itemQuery": { "category": "supportCard", "rarity": "SR", "excludeRefs": ["gacha.support.up.sr"] } },
        { "tier": "R",                      "effect": { "kind": "supportCard" }, "itemQuery": { "category": "supportCard", "rarity": "R" } }
      ],
      "pity": [
        { "counterKey": "gacha.support.sr",  "tier": "SR",  "soft": { "startAt": 6,  "curveExp": 1 }, "hard": { "count": 10, "guaranteeTier": "SR" } },
        { "counterKey": "gacha.support.ssr", "tier": "SSR", "soft": { "startAt": 50, "curveExp": 2 }, "hard": { "count": 90, "guaranteeTier": "SSR" } }
      ],
      "rules": ["support.duplicate.limitBreak", "support.creditOverflow"],
      "sources": ["shop", "bundle"],
      "presentation": { "type": "gachaReveal", "args": { "pool": "support" }, "skippable": true }
    }
  ]
}
```

- `effect.kind="supportCard"`（RWD 效果種類新增一種，結算＝ITM 入庫或傳承，1186 §3.3 補列）；`itemQuery` 是 `rosterQuery` 的物品版：依 ItemDef 的 `category`、`rarity`、`ref` 展開成逐卡項目。展開後逐卡機率就是第 17 章表（單元測試以解析計算核對）。
- 既有三池設定不動；`reward.pools` 回傳四個池。

## 23. 驗收（供實作卡直接引用）

1. TC-SUP-01：師門 6 席（5 自選＋1 借用）；同卡不可重複；修業開始後鎖定。
2. TC-SUP-02：支援卡出現在任何出征、守城、派遣編制的候選為 0；`usage=academyOnly` 被排除。
3. TC-SUP-03：同種子同結果：到場抽籤、點撥、事件觸發；SL 後結果相同。
4. TC-SUP-04：`trainBoost`、`vigorSave`、`restRecover` 各自上限（80%、30%、100%）生效；促膝總上限 +100%。
5. TC-SUP-05：卡羈絆 ≥ 80、同堂且主修為得意課堂才促膝；3 張同時促膝合計 +100% 封頂。
6. TC-SUP-06：每張卡等級效果表與附錄逐格一致（以公式回歸測試 25 張 × 各檢查點）。
7. TC-SUP-07：重複卡傳承 +1，滿 4 次轉學分；十連中途斷線，重連後帳目相同（冪等）。
8. TC-SUP-08：點撥積分 2／4／6／8／10 對應折扣 10／20／30／40%／直接習得；Lv≥3 進弱冠三選一候選。
9. TC-SUP-09：57 段連續事件羈絆門檻、前段完成、每回合最多 1 個；選項穩／皮的羈絆與倍率；彩蛋尾聲需傳承 4。
10. TC-SUP-10：師承組合 2／3／4 張效果與主場加成 ×1.5 正確；雜學與均衡不疊加（取高）。
11. TC-SUP-11：結業師承稱號與派系影響力 +0.5；B 評級以下不給。
12. TC-SUP-12：`POOL_SUPPORT` 機率總和為 1；逐卡機率與引擎權重同源；十萬次蒙地卡羅誤差 < 0.5 個百分點；硬保底 SSR 80、SR 以上 10 抽必出。
13. TC-SUP-13：教官池不接受銀兩扣款（送銀兩扣款即失敗 E301 類錯誤）；連線券與靈玉可用。
14. TC-SUP-14：機率說明鈕可開，顯示四池各自機率表與保底進度；UI 沒有寫死的機率常數。
15. TC-SUP-15：教官武將與同人物連線卡並存：本尊駕到事件一屆一次；教官武將仍不給屬性加成。

## 24. 實作卡表（只列，不開卡；卡號由總 PM 核發）

> 依賴欄的名稱：ITM-M、SHP、RWD-M、SKL-BASE、STY-BASE、OCC-M 為共用框架最小版（總綱第 13 章）；A4、A5、A6、A7、A10 為 doc_spec_1179 第 14.10 節的學府卡；GCH-R1、R2、R3、R4、R6 為 1186 第 12.7 節轉蛋卡。**每張卡依賴的其他卡寫在這裡。**

| # | 卡名 | 範圍 | 依賴 | 驗收 |
| --- | --- | --- | --- | --- |
| SUP-1 | 支援卡資料與物品化 | `support-cards.json`（25 張）、`item-def` 的 `category=supportCard`、`instanceState`、出征編制排除 | ITM-M | TC-SUP-02 |
| SUP-2 | 升級與材料 | 經驗材料 ITM `use`、`expToNext`、等級上限、學分當材料 | SUP-1 | TC-SUP-06 |
| SUP-3 | 傳承與溢出轉換 | RWD 規則 `support.duplicate.limitBreak`、學分轉換、效果 `supportCard` | SUP-1、RWD-M、GCH-R4 | TC-SUP-07 |
| SUP-4 | 師門編組與課程槽位接線 | 入學畫面編師門 UI、3 組存檔位、借用席（系統客座）、到場抽籤 step | SUP-1、A6 | TC-SUP-01、03 |
| SUP-5 | 效果欄結算 | `status-effect` 目標表聚合、上限、牌組成型、風格加權、修業收益算式 | SUP-4、SKL-BASE | TC-SUP-04、06 |
| SUP-6 | 羈絆與促膝論道 | 羈絆增量、促膝條件與疊加、結算畫面 | SUP-5 | TC-SUP-05 |
| SUP-7 | 連續事件 | 57 段事件卡（STY）、穩／皮、事件加強、彩蛋尾聲、本尊駕到 | SUP-6、STY-BASE、A7 | TC-SUP-09、15 |
| SUP-8 | 點撥與學府戰法 | 點撥積分、折扣、頓悟習得、弱冠候選 | SUP-5、SKL-BASE、A5 | TC-SUP-08 |
| SUP-9 | 師承組合與結業稱號 | 師承組合效果、雜學、稱號、派系影響力 | SUP-5、A10 | TC-SUP-10、11 |
| SUP-10 | 教官池 JSON 與卡池接線 | `POOL_SUPPORT`、`itemQuery`、連線券扣款、四池機率說明 | SUP-1、GCH-R1、GCH-R2、GCH-R3、SHP | TC-SUP-12、13、14 |
| SUP-11 | 起手禮包與連線券來源 | 開幕禮包、結業與任務發放、簽到 | SUP-10、RWD-M | 禮包入帳且冪等 |
| SUP-12 | 名師兌換所 | `support-exchange.json`、商店品項表（價格待使用者） | SUP-3、SHP | 學分兌換入庫 |
| SUP-13 | 舊教官卡存檔遷移 | 對 1179 14.2 的修訂，舊卡轉連線卡 | SUP-1、A4 | 遷移後不遺失 |
| SUP-14 | 文案與 i18n | 25 張簡介、57 段事件、稱號，依第 3 章語氣指南 | SUP-7 | 抽查 10 段符合 3.1 原則 |
| SUP-15 | 好友借用（第二批，待決） | 網路版好友卡快照 | SUP-4、網路版 | 待 Q-S2 |

依賴順序：SUP-1 → SUP-2／SUP-3／SUP-4 → SUP-5 → SUP-6 → SUP-7；SUP-5 → SUP-8、SUP-9；SUP-1 → SUP-10 → SUP-11。

## 25. 待使用者決定

| # | 題目 | 推薦 | 說明 |
| --- | --- | --- | --- |
| Q-S1 | 連線券與靈玉的價格、是否直接販售、每日購買上限 | 先不賣券，只給遊戲內免費來源 | 價格與付費不在本書定案 |
| Q-S2 | 好友借用要不要做（需網路） | 單機版只做系統客座，網路版再評估 | 借用席已預留 |
| Q-S3 | 舊教官碎片兌換銀兩的比率 | 延用 1179 14.2 的待決 | 與本書無關，一併處理 |
