<!-- doc_id: doc_spec_1338 -->
# 家族子嗣與血統總規格書（分片索引） — 16 11/26 修訂：姻緣單一流程（相親 → 提親 → 成婚 → 結緣）

> 這是 `家族子嗣與血統總規格書.md` 的「16」分片。完整索引見 `docs/遊戲規格文件/系統規格書/家族子嗣與血統總規格書.md`。
> 設計卡：PROG-2-10098（純設計，不含程式）；實作卡：PROG-2-10099（status: open，只開不做）。
> 依據：使用者 2026-11-26 裁決「相親／結緣併成單一流程」；稽核報告 `artifacts/matchmaking-audit-1126.md`（未提交）。
> 修訂範圍：取代第 3.2 節「結緣好感納配偶」「媒人說親」兩列中「選 1 位直接入名冊」的說法；補上「母方須為配偶」的結緣守門。其餘第 3 章（配偶定義、上限、人數壓力）與第 5 章以後不變。

## 16.0 結論（先看這段）

1. 大廳只留一顆「**姻緣**」按鈕（取代現在武將群組裡的「結緣」）。點進去看到的是「對象清單」，每位女性依目前狀態只顯示**下一步**：相親 → 提親 → 成婚 → 結緣（洞房生子）。
2. 同一位女性任何時刻只有**一個關係狀態**（`stage`），所以不可能再出現「同一人同時相親又結緣」。已是配偶者不再出現在相親名單；沒成婚者不能被選為結緣母方。
3. 結緣（受孕）只對**家族配偶**開放（新增資格 `mother-not-spouse`）；原本「任何名冊女性都能直接結緣」的路徑關閉。
4. 媒人說親改語意：只給「相親名單」候選（生成型三位），**不再直接入冊**；入冊要走完提親與成婚。
5. 多配偶不變：上限依幕府等級（Lv1～2＝2、Lv3～4＝3、Lv5＝4），在**提親**與**成婚**兩處都擋。
6. 第 1 年第 3 季若還沒有配偶，紅娘保底（候選一位保底、提親成功率 80%）。
7. 結緣不只管生小孩，也管「雨露均霑」：新增吃醋事件（笑點，不悲劇）。

## 16.1 名詞（口語對照）

| 名詞 | 玩家看到的字 | 定義 |
| --- | --- | --- |
| 相親 | 「相親」「相看」 | 把一位對象放進**相親名單**並見面一次（檢視相性 K、好感 F）。來源有二：媒人說親、名冊女性（紅顏、轉蛋女將、傭兵女將、他國仕官女將）。做完狀態＝`met`。 |
| 提親 | 「提親」「下聘」 | 對 `met` 的對象送上聘禮，對方回覆。成功＝`engaged`；失敗＝留在 `met`（好感 −12、誠意 +12%，可再提）。名門求親、聯姻外交是「對方來提親」，從這一步進場。 |
| 成婚 | 「過門」「拜堂」 | `engaged` 的對象選吉日過門，進名冊成為配偶（`kind=spouse`，走共通 API `family.enrollSpouse`）。 |
| 結緣 | 「洞房」「結緣」 | 配偶與父方受孕（血統配種）。受孕、待產、出生、血統一律沿用第 4～5 章與 doc_spec_0268／0530／0531，本章不改公式，只加守門。 |
| 媒人 | 「媒婆」「紅娘」 | 相親名單的來源之一，每年 `matchmakerPerYear` 次（暫 2），禮金銀兩（暫 100）。 |

## 16.2 狀態機

### 16.2.1 狀態

`stage` 是「主公家 × 某位女性」的單一欄位，存 `familyState.courtship[personId]`；配偶不存此表，狀態由 `family.get(id).kind === 'spouse'` 推導為 `married`。

| stage | 中文 | 說明 | 可出現的清單 |
| --- | --- | --- | --- |
| `stranger` | 路人 | 預設，不存檔。 | 不在姻緣清單（紅顏／轉蛋女將另見下文入口規則） |
| `met` | 已相親 | 在相親名單，見過面。 | 相親名單頁籤 |
| `engaged` | 已提親成功 | 聘禮已收，待過門。 | 進行中頁籤 |
| `married` | 已婚（配偶） | `kind=spouse`。 | 家眷頁籤，可結緣 |
| `left` | 離開 | 外嫁、送回母國、離開（既有機制）。 | 不顯示 |

「提親中等回覆」不設獨立狀態：主公**自己提親**當場結算（成功 → `engaged`；失敗 → 留在 `met`，好感 −12、誠意 +12%，可立刻再提），不佔等待季數；**對方來提親**（名門求親、聯姻外交）沿用既有「年末彈窗，稍後再問」，回覆應允時直接 `engaged`→立刻成婚（見 16.2.3）。

### 16.2.2 轉移表

| 從 | 動作 | 到 | 守門（全部要過） | 副作用 |
| --- | --- | --- | --- | --- |
| `stranger` | 媒人說親選一位 | `met` | 媒人已開放、本年說親次數 > 0、銀兩 ≥ `matchmakerPrice`、對象 id 不在名冊與相親名單 | 扣禮金；說親次數 −1；初始好感 = `matchmakerStartAffinity`（暫 20，剛好過成婚門檻） |
| `stranger` | 名冊女性相親（約見） | `met` | 對象在名冊、女性、非配偶（已是配偶者不出現）；無好感門檻（Antigravity 11/26 對照表：相親只是「檢視相性 K、好感 F」） | 開啟對象卡顯示 K 與 F；送禮、互動累積好感（沿用 `giftAffection`）；他國仕官女將可相親（成婚才辭官） |
| `met` | 提親 | `engaged` | 配偶人數＋`engaged` 人數 < 上限、通過近親與同父系檢查（`clanMarriageBlock`）、擲骰成功（16.6） | 扣聘禮（暫 0，見 Q-M1）；誠意歸零 |
| `met` | 提親 | `met`（被拒） | 同上守門都過但擲骰失敗 | 好感 −12、誠意 +12%（可累積，見 Q-M6）；不退媒人禮金；可立刻再提 |
| `engaged` | 成婚 | `married` | 配偶人數 < 上限（再檢一次）；好感 ≥ `marryMinAffinity`（暫 20；紅娘保底候選免此門檻，見 Q-M5）；對象未死亡 | `enrollSpouse`（`source: 'courtship'`）；寫夫妻動態關係（KIN-06）；他國仕官女將自動辭官；首年目標「配偶數」對帳 |
| `engaged` | 逾期 | `met` | 超過 `engagedExpireSeasons`（暫 4 季）未成婚（例如一直滿員） | 無懲罰；聘禮退還 |
| 對方來提親（名門求親／聯姻） | 應允 | `engaged` 並立即 `married` | 配偶人數 < 上限；通過近親檢查 | 聘禮入帳（既有）；外交 +20（聯姻） |
| 對方來提親 | 婉拒 | 無（對象不入表） | 無 | 清掉提親 |
| `married` | 結緣 | `married`（`pregnancySeasonsLeft = 2`） | 十一項資格 + `mother-is-spouse`（16.4） | 精力、壽命、血統既有 |

> 11/26 Antigravity 對照表採用處：取消「婉拒冷卻」，改為被拒後好感 −12、誠意 +12%、可立刻再提（與其第 1 年算例一致）；因此不再有 `declined` 狀態。

### 16.2.3 互斥守門矩陣（回答「不得同時相親又結緣」）

| 對象狀態 | 相親 | 提親 | 成婚 | 結緣 | 說明 |
| --- | --- | --- | --- | --- | --- |
| `stranger` | 可 | 不可 | 不可 | 不可 | 結緣母方必須是配偶 |
| `met` | 不可（已相親） | 可 | 不可 | 不可 | 按鈕文字自動變「提親」 |
| `engaged` | 不可 | 不可 | 可 | 不可 | 還沒過門就不能洞房 |
| `married` | 不可，且不出現在相親名單 | 不可 | 不可 | 可 | 已婚者只留結緣 |

資料層做法：單一函式 `courtshipNextStep(person): 'meet' | 'propose' | 'marry' | 'bond' | 'blocked'` 回傳**唯一**下一步，UI 與 API 都只認它；`family.enrollSpouse`、`BreedingSystem.checkBreedingEligibility`、媒人名單產生器都呼叫同一個 `courtshipStageOf(personId)`，不各算各的（共用「人員占用」與「關係」框架的差異欄位，不另建平行系統）。

## 16.3 各來源如何進場

| 來源 | 進場點 | 說明 |
| --- | --- | --- |
| 媒人說親（紅娘叩門、春季說親） | `stranger → met` | 三位固定種子候選，選一位入相親名單（原本選一位直接入冊）。高階血統加成見 16.5。 |
| 名冊女性（紅顏池、轉蛋女將、傭兵女將、他國仕官女將） | `stranger → met`（相親） | 無好感門檻（好感在相親與提親中累積）；他國仕官女將要待成婚才辭官（Q-SP1 不變）。「已加入名冊，可到結緣配對」類 Toast 改為「可到姻緣相親」。 |
| 名門求親（G4 §E #4） | 對方提親 → 應允即 `married` | 不經 `met`；仍受上限與近親守門。 |
| 聯姻外交 | 同上 | 外交門檻 ≥ 友好（40）；成婚外交 +20。 |
| 首子系統配偶（doc_spec_1233） | `married`（系統直入） | 沿用 `family.enrollSpouse { source: 'first-child' }`，不經姻緣流程。 |
| 開局義子／家臣子嗣成年 | 不屬姻緣（義子是子嗣，不是對象） | 無 |

## 16.4 結緣守門（新增資格）

在 doc_spec_0530「資格十一項」之後新增第十二項，**不改原十一項順序**：

| 資格 | 阻擋碼 | 規則 | 玩家文字 |
| --- | --- | --- | --- |
| 12. 母方須為配偶 | `mother-not-spouse` | `family.get(mother.id)?.kind === 'spouse'` 才過 | 「她還沒過門，洞房花燭夜先排隊。」 |

- 檢查位置：`checkBreedingEligibility`（程式規則層）與 `BondingSetupController.mothers()`（清單層，非配偶者直接不列，不出現在結緣母方清單）。AI 他國結緣（doc_spec_0498）不受此限（他國有自己的婚配資料）。
- 父方不限制（沿用現行男性清單與同父系擋）。是否限主公本人見 Q-M3。

## 16.5 媒人加權與保底

### 16.5.1 高階血統加成（11/22 裁決，不變）

`bonusHighTierRate = clamp(rankBonus + clanTierBonus + titleBonus, 0, 0.35)`

| 項 | 值 |
| --- | --- |
| rankBonus（年度風雲榜名次） | 前 3 名 +0.18；4～10 名 +0.12；11～50 名 +0.06；其餘 0 |
| clanTierBonus（門閥） | 門閥 +0.12；望族 +0.06；寒門 0 |
| titleBonus | 持有頭銜 +0.05 |
| 作用 | 三位候選中**每位**獨立擲 `bonusHighTierRate`，命中者改抽「高階血統範本」（家傳／名門） |

### 16.5.2 第 1 年第 3 季紅娘保底（80%）

- 條件：遊戲年 1、當季 = 3（秋季）、`spouseCount = 0`、`engagedCount = 0`、本年尚有說親次數；每存檔只觸發一次（旗標 `matchmakerGuaranteeY1Done`）。
- 效果：該季季結排入「紅娘叩門」（沿用既有導流隊列，`promptType: 'guarantee'`）；三位候選中**第一位為保底候選**（EP ≥ 65，家世範本，不受 `bonusHighTierRate` 影響）；該候選的**提親成功率下限為 80%**（`max(P, 80%)`），成婚免好感門檻。
- 與既有「開場教學後第一次換季的紅娘叩門（first-visit）」並存：first-visit 照舊（教學引導），保底只在前兩者都沒讓玩家成婚時補上；已有配偶者不觸發。
- 保底解讀為「第 3 季前若仍無配偶，補一個 80% 成功的選項」，待 PM 確認（Q-M2）。

## 16.6 提親成功率（採 Antigravity 11/26 透明加法公式；資料放 JSON）

`P = clamp(baseRate + (K − kBase) × kSlope + F × favorPerPoint + 誠意 + 媒人, minRate, maxRate)`

| 參數 | 暫定值 | 說明 |
| --- | --- | --- |
| `baseRate` | 25% | 基礎 |
| K | 相性（`family-compatibility-rules.json` 的主公×對象相性，預設 1.0） | 對象卡一眼顯示 |
| `kBase` / `kSlope` | 0.8 / 45% | 相性 1.0 → +9% |
| F | 好感（可為負） | `favorPerPoint` = 0.5%（即 F/2 %）；F 取送禮好感與傭兵好感較高者再加提親／被拒增減 |
| 誠意 | 被拒一次 +12%（累積） | 成婚或本次提親成功即歸零；上限見 Q-M7 |
| 媒人 | 媒人說親來源 +20% | 媒婆說合；名冊來源 0 |
| `minRate / maxRate` | 15% / 95% | 夾區間 |
| 保底（16.5.2） | 80% | 僅第 1 年第 3 季保底候選：`max(P, 0.80)` |

算例（第 1 年新手，K = 1.0、F = 0、名冊來源）：

1. 第 1 次提親：25 + (1.0 − 0.8) × 45 + 0 = **34%**。被拒 → F = −12、誠意 +12%。
2. 第 2 次：25 + 9 + (−12 × 0.5) + 12 = 25 + 9 − 6 + 12 = **40%**。
3. 第 3 季紅娘叩門保底候選：`max(P, 80%)` = **80%**（Antigravity 算例「第 3 季紅娘保底 80% 成親」）。
4. 好感 60、K = 1.2、誠意 24、媒人來源：25 + 18 + 30 + 24 + 20 = 117 → 夾到 **95%**。
5. 好感 −40、K = 0.5、無誠意、名冊來源：25 − 13.5 − 20 = −8.5 → 夾到 **15%**。

擲骰走固定種子（`rng.derive('courtship', personId, 提親序號)`），同存檔重進不變，避免「讀檔重擲」。

## 16.7 多配偶

- 上限檢查兩處：**提親前**（按鈕灰：「家裡塞不下啦（配偶 2/2），先等主公升級幕府」，不扣聘禮）與**成婚前**（`engaged` 逾期退回 `met`）。
- 已有 `engaged` 對象時，上限計算 = 配偶數 + `engaged` 數，避免同時訂婚超額。
- 上限只擋**新增**，不踢人（升降級、舊檔遷移皆同）。
- 好感衰退、輪流維護（第 3.3 節）不變，由 16.8 吃醋事件補上趣味。

## 16.8 吃醋事件（輕鬆搞笑，不影響戰力、不離婚）

| 項目 | 規則 |
| --- | --- |
| 解鎖 | 配偶數達 `unlockSpouseCount`（2）起，於換季才開始累積與觸發（Antigravity 11/26） |
| 觸發累積 | 每次「結緣」或「新配偶成婚」，**其他每位配偶** `jealousy` +1；每季自然 −1（不低於 0） |
| 觸發門檻 | `jealousy ≥ jealousyThreshold`（暫 3） |
| 效果 | 排入一則吃醋事件（劇情框架，三選項，見下），事件期間該配偶好感每季 −1 |
| 選項 | 送禮安撫（耗銀兩 `jealousyGiftSilver` 暫 20，`jealousy −3`，好感 +3）／陪逛一天（耗精力，`jealousy −3`，好感 +2）／裝睡（不耗，`jealousy −1`，好感 −3，笑點台詞） |
| 上限 | 每位配偶每年最多 2 則；全家同季最多 1 則，避免洗版 |
| 禁止 | 不扣忠誠到離開、不影響待產、不致命、不離婚（世界觀：現代口語講典故、不悲劇） |

範例台詞（可擴充）：「大喬小聲說：『主公，您這星期去西廂房的次數，比我去廚房的還多。』」

## 16.9 與血統子嗣的銜接

1. 結緣流程、受孕率、待產 2 季、出生、子嗣數量全沿用第 4、5 章；**唯一改變是母方必須是配偶**。
2. 夫妻動態關係（KIN-06）改在**成婚當下**寫入，不再等第一次結緣；親子關係仍在出生時寫入。
3. 近親檢查前移：`met → engaged` 就用 `clanMarriageBlock` 擋同父系；結緣時仍保留原檢查（雙保險）。外戚表親放行、血脈疲勞與純化不變。
4. 生成型配偶（媒人候選）的 EP、家世、家傳提示沿用 `generatedSpouseEp`；子嗣潛力繼承不變。
5. 首年目標（`year1-goals.json`）的「配偶數」以**成婚**為準（`enrollSpouse` 對帳），相親、提親不算。
6. 新手保護：結緣面板（洞房）保留既有血統樹、名士批語、EP 預估等 UI，只改入口（從姻緣面板的 `married` 對象進入），不重寫 `BondingSetupController`。

## 16.10 存檔欄位與舊檔遷移

### 16.10.1 新欄位（皆選填，缺值＝預設）

| 欄位 | 位置 | 型別 | 說明 |
| --- | --- | --- | --- |
| `courtship` | `familyState` | `Record<personId, { stage: 'met'｜'engaged'; source: 'matchmaker'｜'roster'｜'guarantee'; since: number; sincerity: number; proposeCount: number; guarantee?: true }>` | 只存非配偶；配偶不存 |
| `jealousy` | `familyState` | `Record<spouseId, { value: number; eventsThisYear: number }>` | 吃醋累積 |
| `matchmakerGuaranteeY1Done` | 存檔頂層 | boolean | 第 1 年第 3 季保底旗標 |
| `courtshipMigratedV1` | 存檔頂層 | boolean | 遷移只做一次 |

`FAMILY_STATE_VERSION` 不升（只新增選填欄位，舊檔讀為空表）；`FamilyService.normalizeFamilyState` 補預設；server sync 白名單同步加入（同 PROG-2-10062 做法）。

### 16.10.2 舊存檔對照

| 舊檔狀況 | 新狀態 | 處理 |
| --- | --- | --- |
| 已是 `kind=spouse`（媒人、聯姻、求親、首子配偶納入者） | `married` | 不動 |
| 名冊女性，非配偶，**曾結緣**（有親子紀錄、`breedingCount > 0` 或 `pregnancySeasonsLeft > 0`） | `married` | 自動補辦：`enrollSpouse(source: 'legacy-bond')`，**可超過上限**（上限只擋新增）；大廳彈一則搞笑通知「主公，您的結婚證書補辦好了」；寫夫妻關係 |
| 名冊女性，非配偶，從未結緣 | `stranger`（可相親） | 不遷移，玩家自行相親；好感值保留（`giftAffection`、傭兵好感） |
| 本年媒人額度 | 沿用 | 年度已用次數 = 名冊內 `spouse_gen_matchmaker_y<年>_*` 數 + `courtship` 內同年來源 `matchmaker` 數（不重算舊檔） |
| 已觸發過 first-visit | 保留 `matchmakerFirstVisitDone` | 不重彈 |
| 讀檔時第 1 年已過第 3 季 | 視為保底已用 | `matchmakerGuaranteeY1Done = true` |

遷移在 `PlayerSaveService` 載入後執行一次，寫 `courtshipMigratedV1 = true` 後自動存檔；遷移結果進日誌（補辦人數），供 QA 對帳。

## 16.11 資料放 JSON：`assets/resources/data/courtship-config.json`（新檔，缺欄位 fail-fast）

```json
{
  "marryMinAffinity": 20,
  "matchmakerStartAffinity": 20,
  "proposeGiftSilver": 0,
  "engagedExpireSeasons": 4,
  "propose": { "baseRate": 0.25, "kBase": 0.8, "kSlope": 0.45, "favorPerPoint": 0.005, "rejectFavor": -12, "sincerityPerReject": 0.12, "sincerityCap": 0.36, "matchmakerBonus": 0.20, "minRate": 0.15, "maxRate": 0.95 },
  "guarantee": { "year": 1, "season": 3, "minEp": 65, "proposeRateFloor": 0.80, "bypassMarryAffinity": true },
  "jealousy": { "unlockSpouseCount": 2, "threshold": 3, "decayPerSeason": 1, "giftSilver": 20, "maxEventsPerYear": 2, "maxEventsPerSeason": 1 }
}
```

不重複存的值：`bondAffinityToMarry`（本章起不再作提親門檻，見 Q-M5）、`matchmakerPerYear`、`matchmakerPrice`、`spouseCapByHallLevel` 仍在 `family-config.json`；`rankBonus`／`clanTierBonus` 在高階血統加成表（沿用 11/22 裁決資料）；待產季數在 `breeding-rules.json`。

## 16.12 UI：單一「姻緣」入口與排版錨點

- 入口：`LobbyCityHubController` 武將群組的 `bonding`（「結緣」）改名「姻緣」（路由 id 保留 `bonding` 以相容，新增面板 id `courtship`）；有可推進對象或媒人叩門時掛紅點，吃醋事件待回覆也掛紅點。大廳其他位置不得再出現獨立的「相親」「結緣」按鈕。
- 畫面（UCUF 三層：`courtship-main` layout、`courtship-screen.skin`、`courtship-screen` screen，新檔）：版面全走錨點與相對比例，不寫死橫式，保留日後直式（沿用 UI 保留直式彈性裁決）。

| 區塊 | 錨點（相對父節點） | 內容 |
| --- | --- | --- |
| 頂欄 | top-stretch，高 8% | 標題「姻緣」、配偶 N/上限、本年說親剩 M 次、銀兩 |
| 左：對象清單 | left，寬 28%，上下 stretch | 頁籤三個：相親名單（`met`／路人候選）、進行中（`engaged`）、家眷（`married`）；列重用、不建動態節點 |
| 中：對象卡 | center，寬 44% | 立繪、名字、家世提示、好感條、**唯一主按鈕**（見 16.13，文字由 `courtshipNextStep` 決定） |
| 右：詳情 | right，寬 28% | `married`：血統樹、EP 預估、名士批語（沿用結緣面板元件）；其他：家世、提親成功率預覽（含算式文字） |
| 底部 | bottom-stretch，高 8% | 說明列（口語提示）、稍後再說 |

- 手機記憶體：列重用、頭像走既有 `loadGeneralAvatar`、不新增大圖集。
- 媒人叩門導流（大廳隊列 `matchmaker-guide`）按鈕改為「去姻緣看看」，直接開姻緣面板並定位到相親名單。

## 16.13 每步畫面文字（zh-TW，口語輕鬆；四語系鍵見 16.14）

| 步驟 | 主按鈕 | 對象卡說明／提示 | 成功 Toast | 失敗／守門 Toast |
| --- | --- | --- | --- | --- |
| 相親 | 「去茶館偷看一眼（相親）」 | 「喝杯茶、見個面，成不成再說。」 | 「相看完畢！{name}說：『主公看起來……還行。』」 | 已是配偶：不出現在名單 |
| 提親 | 「硬著頭皮上門提親（成功率 {rate}%）」 | 「相性 {k}、好感 {f}、誠意 +{sincerity}%、媒婆說合 +{bonus}%」 | 「{name}點頭了！擇日過門。」 | 被拒：「好人卡收一張（誠意 +12%）」 |
| 成婚 | 「快點拜堂入洞房！」 | 「選好日子，拜堂。」 | 「良緣締結！{name}已成為主公家眷。」（稱號「新婚燕爾」） | 滿員：「點頭待機中：家裡塞不下啦（配偶 {n}/{cap}），先等幕府升級。」 |
| 結緣 | 「今夜月色真美（洞房生子）」 | 沿用結緣畫面（血統樹、EP 預估） | 沿用既有受孕文案；出生時抽「天賦小名」（11/25 裁決） | 非配偶：「她還沒過門，洞房花燭夜先排隊。」 |
| 媒人禮金不足 | 灰 | — | — | 「家族銀兩不足，媒婆說她不賒帳。」 |
| 吃醋事件（納第 2 位配偶起，換季解鎖） | 三選項 | 「{name}小聲說：『主公，您這幾天都去哪一房了呀？』」 | 「{name}破涕為笑，順手把你的外套抱走了。」 | — |
| 紅娘保底 | 「去姻緣看看」 | 「媒婆說：『主公，這季再不挑，我的號碼牌都要作廢了！』」 | — | — |

## 16.14 i18n 鍵（四語系 zh-TW／zh-CN／en／ja，鍵在 `assets/resources/i18n/*.json`，前綴 `ui.courtship.*`）

| 鍵 | zh-TW 預設 |
| --- | --- |
| `ui.courtship.title` | 姻緣 |
| `ui.courtship.tab.meet` / `.engaged` / `.family` | 相親名單／進行中／家眷 |
| `ui.courtship.header.spouse_cap` | 配偶 {0}/{1} |
| `ui.courtship.header.matchmaker_left` | 本年說親剩 {0} 次 |
| `ui.courtship.action.meet` / `.propose` / `.marry` / `.bond` | 去茶館偷看一眼（相親）／硬著頭皮上門提親（成功率 {0}%）／快點拜堂入洞房！／今夜月色真美（洞房生子） |
| `ui.courtship.toast.propose_reject` | 好人卡收一張（誠意 +12%） |
| `ui.courtship.hint.meet` / `.propose_rate` / `.marry` | 見 16.13 |
| `ui.courtship.toast.meet_ok` / `.propose_ok` / `.propose_fail` / `.marry_ok` | 見 16.13 |
| `ui.courtship.block.affinity_low` / `.cap_full` / `.silver_low` / `.not_spouse` | 見 16.13 |
| `ui.courtship.guide.matchmaker` / `.guarantee` | 媒人叩門與保底導流文案 |
| `ui.courtship.jealousy.title` / `.line.<n>` / `.opt.gift` / `.opt.stroll` / `.opt.sleep` / `.result.<opt>` | 吃醋事件 |
| `ui.courtship.migration.legacy` | 主公，您的結婚證書補辦好了 |
| `ui.breed.block.mother_not_spouse` | 她還沒過門，洞房花燭夜先排隊。 |

既有 `MATCHMAKER_*` 鍵保留相容；`MATCHMAKER_ACTION_ACCEPT` 預設值由「立即相看」改為「去姻緣看看」。文字一律走 i18n，畫面不寫死。

## 16.15 驗收清單（供實作卡引用）

| # | 驗收 | 算例／判定 |
| --- | --- | --- |
| TC-MAR-01 | 單一狀態：同一人在相親名單中，結緣母方清單不出現；成婚後相親名單不出現，結緣母方清單才出現 | 對象 A：`stranger`→相親→`met`→提親→`engaged`→成婚→`married`，逐步斷言可用按鈕只有一個 |
| TC-MAR-02 | 結緣守門：直接呼叫 `checkBreedingEligibility(father, 非配偶母方)` 回傳 `mother-not-spouse` | 紅顏好感 100 但未成婚，結緣被擋 |
| TC-MAR-03 | 配偶上限：配偶 2/2（Lv1）時提親按鈕灰；`engaged` 計入上限；升 Lv3 後可提親 | 2 配偶 + 1 `engaged` 在 Lv3（上限 3）→ 第 4 位不可提親 |
| TC-MAR-04 | 提親成功率算例 | 見 16.6 五個算例（34%、40%、80%、95%、15%），誤差 < 0.001 |
| TC-MAR-05 | 高階血統加成 | rank 5 +0.12、門閥 +0.12、頭銜 +0.05 = 0.29；rank 2 +0.18、門閥 +0.12、頭銜 +0.05 = 0.35（夾上限）；寒門、rank 30 = 0.06 |
| TC-MAR-06 | 第 1 年第 3 季保底：無配偶無 `engaged` → 該季排入保底；候選第一位 EP ≥ 65、提親率 ≥ 0.80、成婚免好感門檻；已有配偶不觸發；同存檔只一次 | 旗標 `matchmakerGuaranteeY1Done` 為 true 後不再觸發 |
| TC-MAR-07 | 媒人新語意：選一位只進 `met`，名冊無此人；扣禮金 100；說親次數 −1；額滿不可再選 | 名冊人數不變，`courtship` 多一筆 |
| TC-MAR-08 | 名門求親／聯姻應允直接成婚；婉拒不入表；近親被擋 | 沿用 TC-FAM-06 補近親案例 |
| TC-MAR-09 | 吃醋：配偶 A 結緣 3 次，配偶 B 的 `jealousy` = 3 → 觸發事件；每位每年 ≤ 2 則、同季全家 ≤ 1 則；安撫後 −3 | 事件不扣忠誠、不離婚 |
| TC-MAR-10 | 舊檔遷移：曾結緣的非配偶女性自動補辦成配偶（可超上限）並彈一則通知；從未結緣者維持路人；遷移只做一次 | 3 位曾結緣 + 上限 2 → 配偶 3 位、不能再新增 |
| TC-MAR-11 | 存檔往返：`courtship`、`jealousy` 讀寫一致；舊檔缺欄位讀為空表；server sync 白名單包含新欄位 | 存→讀→相等 |
| TC-MAR-12 | 首年目標：配偶數以成婚計；相親、提親不計 | `year1-goals` 對帳測試 |
| TC-MAR-13 | UI：姻緣面板三頁籤、唯一主按鈕、紅點；大廳不再有獨立「結緣」「相親」按鈕；1920 寬無頭截圖四步各一張；四語系鍵齊全 | 實跑截圖，非只驗無錯誤 |
| TC-MAR-14 | 靜態檢查：流程不直接寫名冊、存檔（TC-FAM-09 延伸）；`courtship-config.json` 缺欄位載入失敗 | lint 與載入測試 |

## 16.16 待決（大方向才問；數值企劃已自決）

| # | 題目 | 建議 |
| --- | --- | --- |
| Q-M1 | 提親聘禮要不要另收銀兩（目前只有媒人禮金 100 一筆） | **建議 0**（`proposeGiftSilver: 0`），避免多一道價格；若要收，由商業化裁決 Q-F2 一併決定 |
| Q-M2 | 「第 1 年第 3 季紅娘 80% 保底」的解讀：候選一位保底＋提親率下限 80%（本章寫法），還是「保證第 3 季前一定成婚（100%）」 | **建議本章寫法**（保留一點賭運，不成功可立刻再提，仍有第 4 季補救）；若要 100%，把 `proposeRateFloor` 改 1 即可 |
| Q-M3 | 結緣父方要不要限定主公本人（現行：任何男性名冊武將） | **建議維持不限**（血統配種的深度來自配對自由）；若限主公，配偶只與主公結緣，吃醋事件觸發更好玩 |
| Q-M4 | 舊檔曾結緣者補辦配偶可否超過上限 | **建議可超過**（上限只擋新增、不踢人；已在 16.10.2 採用） |

| Q-M5 | 成婚好感門檻：Antigravity 對照表為好感 ≥ 20，既有規格為 `bondAffinityToMarry` 70；其算例（F = −12 仍靠保底成親）也與 ≥ 20 衝突 | **建議採 ≥ 20**（`marryMinAffinity`），原 70 退役；保底候選免門檻（`bypassMarryAffinity`）；可避免新手第 1 年卡死 |
| Q-M6 | 被拒後：Antigravity「好感 −12、誠意 +12%、可立刻再提」，與我先前草稿「冷卻 2 季」衝突 | **建議採 Antigravity**（已寫入本章）：沒有冷卻，風險全在好感下滑，節奏符合一年循環 |
| Q-M7 | 誠意累積上限（Antigravity 未寫） | **建議上限 36%**（三次被拒封頂），`sincerityCap` 放 JSON，避免無限刷 |
| Q-M8 | 實作分期：使用者裁決單一流程為主；稽核的「A 先守門」作第一階段 | **建議採**：第一階段只做 M1～M3（守門 `mother-not-spouse`、單一狀態與存檔遷移），第二階段 M4～M6（姻緣面板、吃醋、i18n） |

## 16.17 實作卡切分（只列，不開子卡；整包由 PROG-2-10099 承接，開工時可再切）

| # | 內容 | 依賴 |
| --- | --- | --- |
| M1（第一階段） | 純邏輯：`CourtshipStage`、`courtshipStageOf`、`courtshipNextStep`、提親率、保底判定；`courtship-config.json` 與載入／驗證；單元測試 | F1（家族資料模型） |
| M2（第一階段） | 守門：`mother-not-spouse`、`BondingSetupController.mothers()` 過濾、媒人新語意（`enrollMatchmakerSpouse` 改寫入 `met`）、`family.*` API 新命令（`courtship.meet`／`propose`／`marry`）與錯誤碼 | M1 |
| M3（第一階段） | 存檔欄位與舊檔遷移（`PlayerSaveService`、`FamilyService.normalizeFamilyState`、server sync 白名單） | M1 |
| M4 | 吃醋事件（劇情框架三選項、JSON 台詞、每年上限） | M2 |
| M5 | UI：姻緣面板（UCUF 三層）、大廳入口改名與紅點、導流隊列改接、結緣面板改為 `married` 子視圖 | M1、M2 |
| M6 | 四語系 i18n、驗收腳本（TC-MAR-01～14）、無頭截圖 | M2～M5 |


---

## 增補：核准體驗強化規格（2026-11-28）

### 1. 幼兒近況小卡（0～4 歲微互動）
- **觸發條件**：子嗣年齡 `< 5` 歲（未滿 5 歲不進幕府大廳期間）。
- **互動機制**：於族譜／內政側邊顯示「幼兒近況小卡」，每季自動刷新 1 句成長趣事；玩家點擊「摸頭」可觸發親子互動（每季限 1 次），親子好感 `+1`。
- **資料驅動（JSON）**：數值與冷卻參數統一定義於 `assets/resources/data/master/bloodline-infant-care-config.json`（含 `maxInfantAge: 4`、`patFavorGain: 1`、`patLimitPerSeason: 1`）。
- **台詞 i18n**：成長趣事與摸頭回應走 `ui.bloodline.infant_anecdote.*` 與 `ui.bloodline.infant_pat_reply.*`，皆需帶入性別參數（`{childName}`、`{genderLabel}`）。

### 2. 義叔／義母贈禮（結義連動血統）
- **觸發時機**：子嗣誕生或 5 歲抓周時，若雙親任一方擁有結義兄弟／姊妹。
- **效果**：隨機擇一結義親屬觸發 1 次「義叔／義母贈禮」，給予子嗣 `+1` 隨機基礎屬性，或附加 1 枚小名記憶標籤（二選一，機率與上限由 JSON 控制）。
- **資料驅動（JSON）**：參數定義於 `assets/resources/data/master/bloodline-oath-gift-config.json`（`statBonus: 1`、`triggerStages: ["birth", "zhouzhua"]`、`maxGiftsPerChild: 1`）。
- **台詞 i18n**：贈禮祝詞走 `ui.bloodline.oath_gift.*`，需帶入贈禮者稱謂與性別參數（`{oathTitle}`、`{selfPronoun}`、`{childName}`）。
