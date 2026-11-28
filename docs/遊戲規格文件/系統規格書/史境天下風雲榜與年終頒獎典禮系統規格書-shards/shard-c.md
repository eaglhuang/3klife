<!-- doc_id: doc_spec_1286 -->
# 史境天下風雲榜與年終頒獎典禮系統規格書（分片索引） — 9–14 共用框架對應、建議 JSON 草案、AI 全真實沙盤前置、驗收測試、文案範例、W1 拆卡清單

> 這是 `史境天下風雲榜與年終頒獎典禮系統規格書.md` 的「9–14」分片。完整索引見 `docs/遊戲規格文件/系統規格書/史境天下風雲榜與年終頒獎典禮系統規格書.md`。

## 9. 共用框架對應（對齊 `doc_spec_1182`）

本系統嚴守共用 base 原則，所有數值發放、條件、演出與存檔均走共通 API，嚴禁旁路寫死：

| 玩法元件 | 繼承共用框架 | 只寫差異與接線 |
|---|---|---|
| 頒獎典禮互動劇本 | **劇情 `STY-M`**（`doc_spec_1188`） | 使用 `ceremony` 演出模組；新增通用全息立繪濾鏡 `hologram` 與梯形站位 `groupPhoto` CueHandler；先結算後播放 |
| 上榜榮譽稱號與徽章 | **獎勵 `RWD-M`**（`doc_spec_1186`） | 依各榜 `rewardBundleId` 走 `reward.claim` 發放純榮譽稱號、徽章與個人名冊背景，**不發放任何戰鬥實體數值** |
| 觀禮諸侯彈幕互動 | **友誼／關係（第 8 框架）** | 依現場各君王勢力對玩家家族／當選武將之關係（同盟、敵對、仇視、崇拜），動態觸發吐槽或喝彩氣泡 |
| 特別獎開啟條件 | **基礎工具 `FND-M`**（`Condition.ts`） | `enabledWhen` 與參賽資格條件直接複用 `Condition` DSL 與 `DeterministicRng`（同分平手破局用） |
| 參賽與賽道互斥波動 | **人員占用 `OCC-M`**（`doc_spec_1241`） | 讀取既有 `nursing`／`mentorAssign`／`academy` 狀態自然限制當季出征，創造年度排名流動 |
| 存檔寫入 | **伺服器 API / 共通 API `B0`** | `annualCeremonyArchive`（純資料 DTO、禁存 Base64/PNG）走 `save.write` 讀寫（`check-api-bypass` 納管） |

## 10. 建議 JSON 欄位草案（`assets/resources/data/annual-ranking-config.json`）

```json
{
  "schema": "annual-ranking-config.v1",
  "archive": { "trackTopN": 100, "awardTopN": 10, "keepFullYearRecords": true },
  "ceremony": {
    "year1FallbackHosts": ["npc_shi_xiaojing", "sima_hui"],
    "backdropStyleId": "ceremony_hall_hologram_v1",
    "frontRowHalfBodyMax": 10,
    "backRowChibiMax": 40
  },
  "boards": [
    {
      "boardId": "governance", "ceremonyOrder": 1, "kind": "annual_board",
      "evaluatorKey": "governance", "titleKey": "ui.ranking.board.governance",
      "weights": { "taskDefault": 1.0, "taskDiplomacyRecon": 1.6, "seasonCap": 800, "yearCap": 3200 },
      "rewardBundleId": "BUNDLE_RANK_GOV_TOP10", "mindTag": "rank_gov"
    },
    {
      "boardId": "mentor", "ceremonyOrder": 2, "kind": "annual_board", "enabled": false,
      "evaluatorKey": "mentor", "titleKey": "ui.ranking.board.mentor",
      "weights": { "grad": { "S": 400, "A": 250, "B": 120, "C": 40 }, "inheritBonus": 120, "bondMult": 1.2, "alumniPct": 0.1, "alumniCap": 400, "hintPoint": 15 },
      "rewardBundleId": "BUNDLE_RANK_MENTOR_TOP10", "mindTag": "rank_mentor"
    },
    {
      "boardId": "kills", "ceremonyOrder": 3, "kind": "annual_board",
      "evaluatorKey": "kills", "titleKey": "ui.ranking.board.kills",
      "weights": { "powerBase": 1000, "powerClamp": [0.6, 2.5], "leadMult": 1.15, "battleCap": 3000 },
      "rewardBundleId": "BUNDLE_RANK_KILLS_TOP10", "mindTag": "rank_kills"
    },
    {
      "boardId": "charm", "ceremonyOrder": 4, "kind": "annual_board",
      "evaluatorKey": "charm", "titleKey": "ui.ranking.board.charm",
      "weights": { "hypeDivisor": 50, "voteMaxPerGeneral": 50, "totalCap": 9999 },
      "rewardBundleId": "BUNDLE_RANK_CHARM_TOP10", "mindTag": "rank_charm"
    },
    {
      "boardId": "rookie", "ceremonyOrder": 5, "kind": "annual_board", "enabled": true,
      "evaluatorKey": "rookie", "titleKey": "ui.ranking.board.rookie",
      "enabledWhen": { "any": [{ "graduatedThisYear": true }, { "maxAge": 22, "debutThisYear": true }] },
      "weights": { "debut": { "S": 300, "A": 220, "B": 140, "C": 60 }, "charmFactor": 0.8, "prodigyBonus": 150 },
      "rewardBundleId": "BUNDLE_RANK_ROOKIE_TOP10", "mindTag": "rank_rookie"
    }
  ]
}
```

## 11. AI 全真實沙盤前置要求（對齊 A3 裁決）

為達成「**AI 與玩家站在同一個真實規則下競爭**」，計算年度排行前必須先落地以下 3 個真實事件源（依 `doc_spec_1280` 確定性稀疏思路實作，低效能負擔）：
1. **統一年度帳本（`AnnualGeneralLedger`）**：玩家與 AI 共用 `metrics: Record<string, number>` + `highlights[]`；每季累積，Q4 結算後歸零。
2. **AI 勢力季度交戰記帳**：`RivalOfficerSeason` 於季度推進時執行國界戰事推演，將 AI 武將真實擊殺與對手 `totalPower` 寫入帳本（與玩家極速決戰／委託代打完全同一套記帳口徑）。
3. **AI 演藝與學府季度流轉**：AI 勢力依性格排程高魅女將演出／堂會，以及指派 AI 名師招收青年將結業，雙雙寫入帳本 metrics，絕不靠假倍率生分數。

## 12. 驗收標準（供實作卡引用）

- **TC-RNK-01**：純年度歸零：第 1 年殺敵第 1 名若第 2 年全年改任教官（`mentorAssign`），第 2 年殺敵榜為 0 分並顯示 `▼` 掉出或出榜，同時於教官榜登場。
- **TC-RNK-02**：極速／代打一致性：同一場戰鬥以手動、極速決戰、委託代打取得相同戰果，寫入殺敵帳本分數完全相等。
- **TC-RNK-03**：可插拔零改動：於測試中向 `RankingBoardRegistry` 註冊第 6 個自訂榜單並在設定開啟，主引擎、`CeremonyScriptAssembler` 與存檔皆不修改即自動結算並納入典禮與存檔。
- **TC-RNK-04**：雙主持傳承：第 1 屆主持人為 `year1FallbackHosts`；第 2 屆主持人自動切換為第 1 屆 `charm` 榜首與 `rookie` 榜首。
- **TC-RNK-05**：歷年史冊查詢與輕量快照：第 5 年時可查回第 1 年完整得獎名單、異動、評語與大合照構圖 DTO，存檔不含任何 PNG 二進位圖檔。
- **TC-RNK-06**：心智誇耀與純榮譽結算（對齊 11/22 總 PM 裁決）：進入前 10 名之武將正確寫入 `MindEvent(PRAISED)`，獲頒榮譽稱號與徽章，且驗證未增加任何戰鬥/戰場實體數值，數值天花板嚴格維持不變。

## 13. 文案範例（對齊 `doc_spec_1273` 現代口語、輕鬆詼諧）

1. **史小境典禮開場**：「各位玩家與遠端連線的諸侯投影們晚上好！本屆《史境天下風雲榜》正式開播！提醒一下，投影閃爍屬正常現象，請勿對著隔壁曹操的投影丟杯子。」
2. **司馬徽第一屆客串評語**：「今年總評我只說一個字：『好』。（後面三千字解析我們直接跳過，來看第一名！）」
3. **殺敵榜評審備註（因果組裝）**：「本年連破【呂布】等頂尖敵陣（強度 2.4x），張飛在直播間直呼這波操作太秀，榜一實至名歸！」
4. **紅顏魅力榜粉絲熱評**：「在歌劇廳連演《鳳儀亭》兼赴江東堂會，【周瑜】領銜的儒將粉絲團狂刷 148 票直接送進第一名！」
5. **最佳新人王交棒台詞**：「恭喜新科新人王！來，這支司儀麥克風先給你保管，明年年底記得準時穿帥一點回來主持啊！」

## 14. W1 實作卡切分（總 PM 預留卡號 `PROG-2-9601～9605`，排程於年終守城與典禮底座之後由子代理接手）

| 代號 | 預留卡號 | 實作任務內容 | 依賴 |
|---|---|---|---|
| **W1a** | `PROG-2-9601` | `AnnualGeneralLedger`（通用 metrics＋highlights 帳本、Q4 歸零、極速/代打同口徑寫入）＋ **AI 勢力季度交戰戰報模擬** | B0 API、`RivalOfficerSeason` |
| **W1b** | `PROG-2-9602` | **AI 演藝與堂會季度排程** ＋ **AI 學府季度收徒與結業流轉**（寫入帳本 metrics） | W1a、`RivalGovernance` |
| **W1c** | `PROG-2-9603` | **可插拔排行榜核心引擎**（`IRankingBoardProvider`、`RankingBoardRegistry`、首發 4 個 Provider（kills／governance／charm／rookie；mentor 為第二階段儲備）、`annual-ranking-config.json`、去年快照比對、無 LLM 評語組裝） | W1a、W1b、FND-M |
| **W2** | `PROG-2-9604` | **心智誇耀與白因子寫回 ＋ 歷年史冊存檔**（`MindEvent` 寫入、`annualHonorSeeds` 對接 `WhiteAchievementCriteria`、`annualCeremonyArchive` 讀寫） | W1c、RWD-M、SKL-M |
| **W3** | `PROG-2-9605` | **年終頒獎典禮劇本與大合照 UI**（`CeremonyScriptAssembler` 對接 STY-M、`hologram`/`groupPhoto` CueHandler、雙層梯形大合照 `RenderTexture` 定格背景與史冊查詢畫面） | W1c、W2、STY-M |


---

## 增補：核准體驗強化規格（2026-11-28）

### 1. 第 4～5 名觀眾勉勵台詞
- **觸發條件**：玩家家族於年度天下名門榜排名第 4 或第 5 名（差一步上領獎台）。
- **效果**：台下觀眾隨機講出激勵台詞，點出「明年再多拿 `{deltaScore}` 分就能進前三」。
- **資料驅動（JSON）**：名次區間與差額門檻定義於 `assets/resources/data/master/ceremony-crowd-lines.json`：
  - `nearPodiumRanks` (`number[]`, 預設 `[4, 5]`)：觸發勉勵台詞的玩家名次區間
  - `nearPodiumMaxDeltaScore` (`number`, 預設 `250`)：與第 3 名的最大分數差額門檻（`deltaScore <= 250` 時才顯示勉勵台詞）
- **台詞 i18n**：走 `ui.ceremony.crowd_near_podium.*`，需帶入 `{selfPronoun}`（性別自稱）與 `{deltaScore}`。

### 2. 典禮觀眾結義彩蛋台詞
- **觸發條件**：典禮領獎台得獎者與台下某位觀禮武將具備「結義」關係。
- **效果**：點擊該觀禮武將時，優先播放專屬結義祝賀台詞。
- **資料驅動（JSON）**：彩蛋權重與優先級定義於 `assets/resources/data/master/ceremony-crowd-lines.json`：
  - `oathEasterEggPriority` (`boolean`, 預設 `true`)：點擊結義觀眾時是否優先播放結義專屬祝賀台詞
- **台詞 i18n**：走 `ui.ceremony.crowd_oath_congrats.*`，需帶入 `{selfPronoun}`、`{winnerName}` 與 `{oathRelation}`（義兄／義弟／義姊／義妹）。
