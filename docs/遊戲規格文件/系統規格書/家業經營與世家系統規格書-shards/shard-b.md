# 家業經營與世家系統規格書（分片索引） — 3 依賴的共用框架（六套 base 對照與候選）

> 這是 `家業經營與世家系統規格書.md` 的「3 依賴的共用框架（六套 base 對照與候選）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/家業經營與世家系統規格書.md`。

## 3. 依賴的共用框架

> 使用者定案：同本質系統一律共用 base，玩法只做包裝與差異 JSON，不准各寫一套。共六套：**商店、物品庫存、任務、獎勵、技能、劇情**。各框架的正式規格由另一位企劃撰寫（卡號 9200 起），本章**只引用框架名稱、標出家業各功能依賴哪一套、只寫差異欄位**，不重複定義框架本身。下方「最小契約」只是為了讓差異欄位有名字可掛，正式欄位以 9200 系列為準，衝突時以其為準。

### 3.1 現有程式盤點（有哪些可抽共用核心）

掃描範圍：`assets/scripts/core/systems`、`assets/scripts/shared`、`assets/scripts/battle/skills`。

| 框架 | 現有程式 | 現況與缺口 |
| --- | --- | --- |
| 商店 | `ItemShopPricing.ts`（`ShopOffer` 只有 itemId、單一貨幣 gem、價格；`purchaseShopOffer`）、`WishPool.ts`（許願池另一套價格與倍率）、`WishAltarController`、他國 AI 貿易兌換（doc_spec_0496） | 沒有上架下架、打折、換期、庫存、限購、多貨幣；購買邏輯各寫各的。可從 `ItemShopPricing` 抽出購買原子操作當核心。**缺 base。** |
| 物品庫存 | `ItemDef.ts`（五大分類、稀有度暫全 1）、`PlayerInventory.ts`（`Record<itemId, count>`，只有玩家一個持有者）、`ItemBagView.ts`、`HeirloomCardView.ts`（傳家寶）、`TreasureCodex.ts`、`EquipPageSegments.ts`（裝備） | 沒有「持有者」概念；道具、寶物、裝備各有存取與顯示。持有者統一為：武將＝背包、家＝庫房、幕府＝公庫、家族＝倉庫。**缺 base。** |
| 任務 | `HallMissionData.ts`／`HallMissionLoop.ts`（牆任務：dispatch、recon、settle、記錄）、`DispatchJobs.ts`／`DispatchCatalog.ts`、`ExtremeTaskBoard.ts`、`GovernanceAssignment.ts`、`MissionSave.ts` | 四套各自有佔用與結算；資源命名也不一致（HallMission 用 grain／silver，派遣用 food／gold）。**半有 base：`HallMissionLoop` 的接取、派人、到期結算、記錄可抽。** |
| 獎勵 | `BattleAftermath.ts`、`StageSalvageSettlement.ts`、`ExtremeTaskDrop.ts`、`GiftBundle.ts`、`WishPool.ts`、`SeasonPass.ts`、`HallMissionLoop` 內的發獎 | 獎池、掉落、發獎、保底分散在各處；沒有統一的給獎演出（寶箱、藏寶圖、骰子、轉盤）與懲罰。**缺 base，由任務拆出。** |
| 技能 | `shared/SkillRuntimeContract.ts`（`SkillSourceType` 六來源，偏戰場）、`battle/skills/adapters`、因子與奧義規格 | 只有戰場契約；人物、培育、家族技能與個人天賦沒有同一套。**缺 base。** |
| 劇情 | 武將日誌（doc_spec_0015）、季報市井奇遇（doc_spec_1171）、大廳情境文案庫、羈絆與傳記敘事、NPC 腦（`3klife-npc-brain`） | 歷史、培育、羈絆、任務、傳記劇情的事件文案、選項、條件各寫各的。**缺 base。** |

### 3.2 家業各功能底層對照（只寫差異欄位）

| 家業功能 | 框架 | 差異欄位（只寫這些） |
| --- | --- | --- |
| 家族商店上架、下架、打折、庫存、限購 | 商店 | `mode=sell`、`listingOwner=estate:shop`、`priceFormula=shopMarkup`、`forbiddenTags=[premium,token,speedup]`、貨幣只有 gold |
| 家族商店換期商品（換季貨） | 商店 | `rotation={group:season, length:1}` |
| 貿易：港市進貨與出貨 | 商店 | `mode=both`、`shopId=port:<routeId>`、每季換期、`limit` 由船艙容量決定、`marketMult` 由種子決定 |
| 酒店採買食材 | 商店 | `shopId=market:grocery`、`stock=∞`（I1）、I2 每季限量 20 |
| 活動商店、百寶閣（既有） | 商店 | 貨幣 gem／destinyPoint；**本規格不改**，只確認與家族商店 listing 池分開 |
| 家業庫房：食材、菜餚、商貨、戲本、貨艙 | 物品庫存 | `holderKind=home`、`containerTag=estate:<id>`；食材＝材料＋tag `ingredient`；菜餚＝消耗品＋tag `dish`；新增 `freshSeasons`、`boundChildId`、`premiumPurchasable`、`tradable` |
| 幕府公庫（金、建材、聘禮） | 物品庫存 | `holderKind=shogunate`；家業收益進此處 |
| 傳家寶、家族倉庫 | 物品庫存 | `holderKind=clan`、`rarity>=4` |
| 武將背包（乾糧、補給） | 物品庫存 | `holderKind=general` |
| 家業差事、季結算工作 | 任務 | `kind=estateErrand`、`settleRule=estateSeason`、`durationSeasons=1` |
| 義勇營委託 | 任務 | `kind=mercContract`、`settleRule=mercClash`、`requirements.power` |
| 出海航次 | 任務 | `kind=voyage`、`settleRule=voyageRoll`、`durationSeasons` 1~4、`seeded=true` |
| 學院家學課 | 任務 | `kind=lesson`、`settleRule=lessonCredit`、對象為孩子 |
| 成長膳（點名宴） | 任務 | `kind=tonicMeal`、`target=childId`、`settleRule=tonicServe`；結果事件交給 9198 |
| 航次盈虧、貨物入庫 | 獎勵 | `rewardPool=voyageCargo`（貨物＋聲望）、`penalty=cargoLoss/idleShip` |
| 義勇營戰利品、酬勞、重傷停職 | 獎勵 | `rewardPool=mercLoot`、`penalty=injury(1季)`；**大勝使用「寶箱」演出** |
| 航次大順利、發現漂流寶 | 獎勵 | `presentation=藏寶圖`（東海航線大順利才有），內容為食材／配方卷／戲本 |
| 好事事件的小獎勵（美食評鑑、新戲大紅、貴客） | 獎勵 | `presentation=轉盤`（只在玩家在線時看；託管時直接發放，不演出） |
| 家業年報的年度大獎（聲望階晉升禮） | 獎勵 | `presentation=寶箱`，內容含家業名品 |
| 事件抽取與機率（家業 25%、種子） | 獎勵 | `pool=estateEvents`，權重抽樣、保底（連續 3 季無事件下季必出好事） |
| 廚師專長（刀工、火候、調味、食療） | 技能 | `domain=estate`、`source=person`、效果目標 `dish.quality`、`recipe.unlock` |
| 掌櫃、主演、掌教專長 | 技能 | `domain=estate`、`source=person` |
| 家業 perk（精打細算、名廚招牌、堂會…） | 技能 | `source=estate`，由家業等級解鎖 |
| 郡望家風加成 | 技能 | `domain=house`、`source=house`，條件是家業 `statTag` 等於家風維度 |
| 歷練專長（1180）、教官傳道專長 | 技能 | `domain=career`；**本規格不改，只共用同一套** |
| 家業風險事件文案與選擇題（竊賊、倒彩、海盜、食材不新鮮…） | 劇情 | `storyKind=estateEvent`、`choices[]`、`conditions`（家業、季節、職缺者）；結果效果交給獎勵（獎懲）與任務 |
| 歌劇廳劇目（空城計、赤壁等）與英靈劇目 | 劇情 | `storyKind=history`；劇目故事與歷史劇情共用條目，解鎖條件為「家中有該武將」 |
| 學院師徒緣、家學課小故事 | 劇情 | `storyKind=bond`，`bondSeed` 寫入羈絆 |
| 家業年報敘事、世家招牌文案 | 劇情 | `storyKind=biography`（傳記），掛在家族或家主 |
| 成長膳受膳小劇場（孩子吃飯的反應） | 劇情 | `storyKind=nurture`（培育），內容由 9198／1180 定 |

### 3.3 商店分界與商業化

- 家族商店＝商店框架的 `sell` 實例，只用金幣；商城＝商店框架的 `buy` 實例，用付費貨幣。兩者 listing 池完全分開。
- 家族商店**不售**：加速卡、入學令、轉職令、傳道令、歸宗令、抽卡券、任何 `premium`／`token`／`speedup` tag 物品。
- 商城**不售**：家業貨物、菜餚、食材、配方卷。成長膳相關物品（菜餚、配方卷、主味食材）`premiumPurchasable=false`，避免「付費買加速成長」。
- 金幣不能換付費貨幣。商業化接口只留空欄位 `monetizationHook`（Q3）。

### 3.4 建議新增共用框架（候選，**待 PM 裁決，本規格不定案**）

以下是在六套之外、找到兩處以上類似功能的候選：

| 候選 | 現有重複處 | 說明 |
| --- | --- | --- |
| A. 人員占用登記（PersonOccupancy） | 太守府 `GovernanceAssignment`、大廳 `hallBusyGeneralIds`、派遣 `DispatchJobs`、學府入學凍結、10 歲歷練、傭兵出戰、待產與重傷旗標、家業職缺（共 8 處） | 現在每處自己檢查「這個人忙不忙」。一張登記表 `{personId, kind, refId, since, until}` 加一張互斥矩陣即可。**強烈建議**；第 10 章互斥規則可直接寫成矩陣。 |
| B. 設施等級階梯（FacilityLadder） | 太守府 Lv1~5（doc_spec_0587）、水軍船塢擴建、大牢格數擴展、幕府等級、家業等級（5 處） | 都是「等級→花費→門檻→解鎖與上限」。 |
| C. 季結算管線（SeasonTick） | 領地季結算（0501、0588）、家業、學府凍結銜接（0524）、家族名聲季維護（0447）、傭兵到期、待產、`settleDueHallMissions`（7 處） | 註冊式 hook、固定順序、可重播，並解決「凍結期不結算」。 |
| D. 聲望階梯（ReputationLadder） | 家族名聲階（0615）、四階門閥（0446）、官職經驗（0014）、英靈供養（0447）、家業聲望階（5 處） | 都是「累積值→階→特權」，目前至少四套階梯各寫各的。 |
| E. 種子化抽選（SeededDraw） | 10 歲歷練事件池與心願（HMAC 種子）、家業事件、HallMission 亂數（mulberry32）、抓周、傭兵地下城（5 處） | 「權重＋存檔種子＋先存後顯示」的抽選核心；大部分可歸入「獎勵」的獎池，但種子與重讀防護是獨立關注，建議由獎勵與劇情框架共同依賴。是否獨立由 PM 裁決。 |
| F. 配方合成（Recipe） | 戰法碎片合成（教官支援卡被動）、菜色配方、重塑洗髓（3 處，較弱） | 酒店菜色先走家業自帶配方表；若成立再收斂。 |

以上暫以「家業內部最小實作＋留接口」處理：占用先用 `occupation` 欄位；季結算先掛在既有季節拍；不阻擋第一版。
