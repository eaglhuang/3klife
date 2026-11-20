# 家業經營與世家系統規格書（分片索引） — 12 資料結構

> 這是 `家業經營與世家系統規格書.md` 的「12 資料結構」分片。完整索引見 `docs/遊戲規格文件/系統規格書/家業經營與世家系統規格書.md`。

## 12. 資料結構

### 12.1 設定檔清單

| 檔案 | 內容 |
| --- | --- |
| `estate-defs.json` | 幕府等級與六個家業定義（職缺、收益、聲望、升級、方針、perk） |
| `estate-dishes.json` | 菜色階與成長膳（含 `childEffect` 欄位） |
| `estate-ingredients.json` | 食材階、保鮮、來源 |
| `trade-routes.json` | 航線、船型、貨物、風險 |
| `estate-events.json` | 各家業風險事件（6 條／家業） |
| `estate-items.json` | 新增道具與寶物（登記進 `ItemDef`，`tags` 區分） |
| `house-rank.json` | 世家聲望階與郡望家風對照 |

### 12.2 設定 JSON 草案

`estate-defs.json`（節錄；`incomeByLv`、`renownByLv`、`slotsByLv` 皆為 Lv1~5）：
```json
{
  "version": 1,
  "shogunate": {
    "levels": [
      {"lv":1,"officerTier":"OFFICER_TIER_1","cost":{"gold":0,"material":0},"estateCap":0},
      {"lv":2,"officerTier":"OFFICER_TIER_2","cost":{"gold":2500,"material":1000},"estateCap":1},
      {"lv":3,"officerTier":"OFFICER_TIER_2","cost":{"gold":6000,"material":2400},"estateCap":2},
      {"lv":4,"officerTier":"OFFICER_TIER_3","cost":{"gold":12000,"material":4800},"estateCap":3},
      {"lv":5,"officerTier":"OFFICER_TIER_4","cost":{"gold":24000,"material":9600},"estateCap":4},
      {"lv":6,"officerTier":"OFFICER_TIER_5","houseRankMin":3,"cost":{"gold":48000,"material":19200},"estateCap":5}
    ],
    "treasuryHolder": {"holderKind":"shogunate"}
  },
  "estates": [
    {
      "id":"familyShop","name":"家族商店","unlockShogunateLv":2,"statTag":["pol","cha"],
      "build":{"gold":2000,"material":800},
      "slotsByLv":[1,2,2,3,3],
      "incomeByLv":[120,200,320,500,760],
      "renownByLv":[1,2,3,4,6],
      "upgradeGold":[1500,3500,8000,16000],
      "roles":[{"role":"keeper","stat":"pol","suit":["leader","civil"],"minAge":15},
               {"role":"clerk","stat":"cha","suit":["leader"],"minAgeRef":"spec9198.minorPostAge","apprentice":true}],
      "policies":[{"id":"thin","incomeMult":1.0,"renownAdd":2},
                  {"id":"premium","incomeMult":1.25,"needTier":2,"fallbackMult":0.9},
                  {"id":"hoard","incomeMult":0.4,"nextMult":1.8,"limitPerYear":1}],
      "seasonMult":[1.0,0.95,1.1,1.3],
      "perks":[{"lv":2,"skillId":"perk_thrift"},{"lv":3,"skillId":"perk_regulars"},
               {"lv":4,"skillId":"perk_tradeRoute"},{"lv":5,"skillId":"perk_brand"}],
      "shop":{"mode":"sell","forbiddenTags":["premium","token","speedup"],"currency":["gold"]},
      "eventChance":0.25
    },
    {
      "id":"familyTavern","name":"家族酒店","unlockShogunateLv":3,"statTag":["cha","pol"],
      "build":{"gold":2500,"material":1000},
      "slotsByLv":[1,2,3,3,4],
      "incomeByLv":[100,170,270,420,640],
      "renownByLv":[2,3,5,7,10],
      "upgradeGold":[1800,4000,9000,18000],
      "mealsByLv":[8,12,18,26,36],
      "tonicMealsByLv":[0,1,1,2,2],
      "rationsByLv":[0,10,20,35,50],
      "roles":[{"role":"chef","stat":"cook","suit":["cook"],"minAge":15,"apprenticeMinAgeRef":"spec9198.minorPostAge"},
               {"role":"sousChef","stat":"cook","minAge":15},{"role":"waiter","stat":"cha","minAge":15},
               {"role":"keeper","stat":"pol","minAge":15}],
      "seasonMult":[1.0,0.9,1.1,1.25],
      "dishRevenueMultByTier":[1.0,1.15,1.35,1.7,2.2]
    },
    {"id":"familyTheater","unlockShogunateLv":4,"slotsByLv":[2,2,3,4,5],"incomeByLv":[90,150,240,380,570],
     "renownByLv":[3,5,8,12,18],"upgradeGold":[2500,5500,12000,24000],"seasonMult":[1.0,1.0,1.1,1.4],
     "repeatDecayPerSeason":0.10,"repeatDecayFloor":0.6},
    {"id":"familyAcademy","unlockShogunateLv":3,"slotsByLv":[1,2,2,3,4],"incomeByLv":[60,100,160,250,380],
     "renownByLv":[2,4,6,9,13],"upgradeGold":[1500,3500,8000,16000],"seasonMult":[1.1,0.8,1.0,0.9],
     "homeSchool":{"perSpecialtyCap":4,"totalCap":10,"bondSeedMax":5,"studentAge":[5,14]}},
    {"id":"mercCompany","unlockShogunateLv":5,"slotsByLv":[2,3,4,5,6],"incomeByLv":[80,140,230,360,540],
     "renownByLv":[2,3,5,8,12],"upgradeGold":[3500,7500,16000,32000],"seasonMult":[1.0,1.1,1.0,0.8],
     "meritToClanScore":0.5,"battleEntry":{"enabled":false,"request":"battleEntryRequest","result":"battleResult"}},
    {"id":"tradingHouse","unlockShogunateLv":4,"slotsByLv":[1,2,2,3,3],"renownByLv":[2,3,5,7,10],
     "upgradeGold":[3000,6500,14000,28000],"berthsByLv":[1,1,2,2,3],
     "ships":[{"id":"sampan","hold":20,"minLv":1},{"id":"merchant","hold":60,"minLv":2},{"id":"tower","hold":120,"minLv":4}]}
  ],
  "output": {"gold":"clamp(avg(effect)/1.5,0.5,1.5)","fillFloor":0.4}
}
```

`estate-dishes.json`（成長膳，加速與補償數值**不在此檔**，由 9198 提供）：
```json
{
  "tiers": [
    {"tier":1,"dish":"家常小菜","tonic":null,"tavernLv":1,"cookMin":0,"ingredients":[{"tag":"I1","n":1}]},
    {"tier":2,"dish":"名樓小炒","tonic":"tonic_t2_yiling","tavernLv":2,"cookMin":20,"specialtyMin":{"fire":3},
     "ingredients":[{"tag":"I1","n":1},{"tag":"I2","n":1},{"tag":"flavorMain","n":1}],
     "childEffect":{"kind":"growthTonic","boostGrade":1,"compTier":1,"flavorSlots":1,"specRef":"doc_spec_1180#growthTonic","clampToSpecMax":true}},
    {"tier":3,"dish":"宴席大菜","tonic":"tonic_t3_longqing","tavernLv":3,"cookMin":40,"specialtyMin":{"seasoning":6},
     "ingredients":[{"tag":"I2","n":2},{"tag":"I3","n":2},{"tag":"flavorMain","n":1}],
     "childEffect":{"kind":"growthTonic","boostGrade":2,"compTier":2,"flavorSlots":1,"specRef":"doc_spec_1180#growthTonic","clampToSpecMax":true}},
    {"tier":4,"dish":"山海珍饌","tonic":"tonic_t4_baZhen","tavernLv":4,"cookMin":60,"specialtyMin":{"knife":10,"fire":10},
     "ingredients":[{"tag":"I3","n":2},{"tag":"I4","n":2},{"tag":"flavorMain","n":2}],
     "childEffect":{"kind":"growthTonic","boostGrade":3,"compTier":3,"flavorSlots":1,"specRef":"doc_spec_1180#growthTonic","clampToSpecMax":true}},
    {"tier":5,"dish":"國宴","tonic":"tonic_t5_taiLao","tavernLv":5,"cookMin":80,"specialtyMin":{"diet":15},
     "ingredients":[{"tag":"I4","n":2},{"tag":"I5","n":2},{"tag":"flavorMain","n":2},{"itemId":"item_recipe_legacy","n":1}],
     "childEffect":{"kind":"growthTonic","boostGrade":4,"compTier":4,"flavorSlots":2,"specRef":"doc_spec_1180#growthTonic","clampToSpecMax":true}}
  ],
  "flavorMain": {"ing_beef_tendon":"str","ing_roast_lamb":"lea","ing_longan_walnut":"int","ing_five_grains":"pol","ing_lotus_pearl":"cha"},
  "sousChefRelaxPerHead": 1, "sousChefRelaxMax": 3,
  "tonicItem": {"boundChildRequired": true, "tradable": false, "premiumPurchasable": false}
}
```

`trade-routes.json`：
```json
{
  "routes": [
    {"id":"r_jiangdong","seasons":1,"minShip":"sampan","safety":0.85,"enabledInV1":true,
     "buy":["rice_tea_silk","herb_I2"],"sell":["iron","bamboo_slip"]},
    {"id":"r_jingyang","seasons":1,"minShip":"sampan","safety":0.82,"enabledInV1":true,
     "buy":["salt","shu_brocade","herb_I3"],"sell":["silk","lacquer"]},
    {"id":"r_bohai","seasons":2,"minShip":"merchant","safety":0.72,"blockedSeasons":["winter"],"enabledInV1":false,
     "buy":["horse","fur","antler_I3"],"sell":["salt","silk"]},
    {"id":"r_nanhai","seasons":3,"minShip":"merchant","safety":0.65,"enabledInV1":true,
     "buy":["spice","pearl","seafood_I4","ing_lotus_pearl"],"sell":["silk","iron","lacquer"]},
    {"id":"r_donghai","seasons":4,"minShip":"tower","safety":0.55,"enabledInV1":false,
     "buy":["reishi_I5","dragon_saliva_I5","pearl_east","item_recipe_legacy@0.15"],"sell":["lacquer","silk","gold_ware"]}
  ],
  "windows": {"tailwindRiskDelta": -1, "headwindRiskDelta": 1, "headwindSafetyPenalty": 0.15},
  "tariff": 0.06, "portFeeWithoutPort": 0.05, "marketMultRange": [0.85,1.20],
  "outcomes": [{"min":0.9,"id":"great","profit":1.1,"renown":1.2},{"min":0.6,"id":"ok","profit":1.0,"renown":1.0},
               {"min":0.4,"id":"minor","cargoLoss":0.15,"renown":0.6},{"min":0,"id":"major","cargoLoss":0.40,"berthIdle":1,"renown":0.3}]
}
```

`house-rank.json`：
```json
{
  "ranks":[{"rank":1,"name":"小戶經營","renown":0},{"rank":2,"name":"殷實之家","renown":150,"goodEventBonus":0.05},
           {"rank":3,"name":"一方富戶","renown":600,"dowryEnabled":true},
           {"rank":4,"name":"郡中望族","renown":1800,"marriageDealBonus":0.05,"diplomacyBanquet":true},
           {"rank":5,"name":"天下名家","renown":4500,"brandOnHouseOverview":true}],
  "fameTransfer": {"ratio":0.5,"capPerSeason":60},
  "commanderyBonus": {"tier2":1.10,"tier3":1.15,
     "map":{"str":["mercCompany","tradingHouse"],"lea":["mercCompany","tradingHouse"],"int":["familyAcademy","familyTavern"],
            "pol":["familyShop","tradingHouse"],"cha":["familyTheater","familyTavern"]}},
  "dowry": {"minRarity":3,"successBonusCap":0.10,"stackRule":"max_with_spec0615"}
}
```

`estate-items.json`（登記進 `ItemDef`，全部以 `tags` 區分）：商貨（絲帛、鐵料、鹽、蜀錦、漆器、竹簡、香料、珍珠、毛皮、馬匹…）14 項；食材 18 項（I1 米麵蔬肉、I2 草藥乾貨蜜、I3 山珍鹿茸人參、I4 海參鮑魚燕窩珍珠、I5 靈芝龍涎東海珍珠、主味 5 項）；菜餚（一般 5 階、成長膳 4）；雜貨（補給箱、乾糧、冷鹽）；戲本 6；配方卷 `item_recipe_legacy`（rarity 5）。稀有度：商貨與食材 I1~I2＝1、I3＝2、I4＝3、I5＝4、配方卷＝5。

### 12.3 存檔欄位

```json
{
  "estateSave": {
    "version": 1,
    "shogunateLevel": 1,
    "houseRenown": 0,
    "houseRank": 1,
    "estates": {
      "familyShop": {
        "lv": 1, "built": true, "policy": "thin", "annualPolicy": "thin",
        "slots": [{"slotId":"keeper#1","personId":"gen_001","sinceSeason":3,"emeritus":false}],
        "hoardPending": 0, "hoardUsedYear": 0,
        "lastSettleSeason": 0, "renown": 0
      }
    },
    "kitchen": {"orders": [{"orderId":"o1","childId":"child_x","dishTier":3,"flavorStats":["int"],"chefId":"gen_y","season":12}]},
    "voyages": [{"questId":"v1","routeId":"r_nanhai","shipId":"merchant","leaderId":"gen_a","escortIds":["gen_b"],"cargo":{},"departSeason":9,"returnSeason":12}],
    "theater": {"currentPlay":"play_kongcheng","consecutiveSeasons":1},
    "academy": {"students":[{"childId":"child_x","subject":"literature","seasons":2}]},
    "events": {"seed": 123456789, "pending": [], "recent": []},
    "ledger": [{"season":12,"estateId":"familyShop","gold":240,"renown":2,"eventId":null}],
    "monetizationHook": null
  }
}
```
- 人物新增欄位：`person.occupation = {kind, refId, sinceSeason}`、`person.careerAttr.cook`（0~100）、`person.specialties.{knife,fire,seasoning,diet}`、`child.homeSchoolPoints.{specialty:n}`。
- 庫存：家業庫房走「物品庫存」框架的 `home` 容器，不在 `estateSave` 內另存一份；`estateSave` 只存家業狀態與引用。
- 存檔預算：`estateSave` 預估 ≤ 12 KB（ledger 只保留最近 16 季）。
- 還原容錯：壞資料項目丟棄，缺欄位用預設；`shogunateLevel` 缺省視為 1。
