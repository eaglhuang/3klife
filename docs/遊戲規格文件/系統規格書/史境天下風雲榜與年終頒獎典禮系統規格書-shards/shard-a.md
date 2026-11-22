<!-- doc_id: doc_spec_1284 -->
# 史境天下風雲榜與年終頒獎典禮系統規格書（分片索引） — 0–4 結論、世界觀包裝與語氣、四層可插拔架構、五大首發榜單公式與算例、心智血統與戰場一致性

> 這是 `史境天下風雲榜與年終頒獎典禮系統規格書.md` 的「0–4」分片。完整索引見 `docs/遊戲規格文件/系統規格書/史境天下風雲榜與年終頒獎典禮系統規格書.md`。

# 史境天下風雲榜與年終頒獎典禮系統規格書

> 任務卡：`PROG-2-9600`（純文件，不含程式）。依據 2026-11-21 使用者裁決（A1～A5、每年頒獎＋歷年查閱、極速／代打一致）與總 PM 執行細節共識。
> 上游對齊：`doc_spec_1273`（世界觀總綱）、`doc_spec_1241`（家族子嗣與血統）、`doc_spec_1182`（共用框架總綱）、`doc_spec_0525`（年報）、`doc_spec_1264`（教官池）、`doc_spec_1280`（武將私塾）。

## 0. 結論

1. **官方定名與定調**：全名《**史境天下風雲榜（第 X 屆）**》。採 `doc_spec_1273` 的「AI 武將覺醒」世界觀：**機制嚴謹、包裝輕鬆詼諧、用現代口語講三國、不悲劇**。
2. **純年度歸零重算（A1）**：首發榜單（第一階段 4 大核心獎，見 §3）一律只採計該年度第 1～4 季發生的真實實績，次年 Q1 帳本歸零，確保每年名單劇烈洗牌（`▲+N`、`▼-N`、`—`、`NEW`）。
3. **全真實 AI 沙盤前提（A3）**：不作無根基假估算，前置補齊 AI 勢力逐將真實戰績、AI 歌劇廳／演藝與 AI 學府運作，讓玩家與 AI 在同一套規則下公平競逐。
4. **雙向玩法連動（純榮譽不加數值，對齊 11/22 總 PM 裁決）**：滿一年頒發年度榮譽稱號、成就徽章與個人名冊紀念背景。前 10 名直接寫入武將 `MindEvent`（誇耀記憶＋心情推升），在大廳對話主動吹噓自己的名次。**嚴格定調為純榮譽玩法，絕不直接發放攻擊/防禦等戰鬥數值 bonus**，確保遊戲戰力天花板絕對平衡。
5. **四層可插拔獨立架構（數據驅動）**：`AnnualAwardsRegistry` 純負責獎項定義與評分；資料定義、純邏輯計算註冊表、動態指標帳本、典禮組裝與通用 Map 存檔徹底解耦。日後新增任何新榜單或特別獎，核心引擎與 UI **零改動**。
6. **每年年終固定頒獎與歷年查詢**：每年 Q4 年報期間必辦頒獎典禮，所有君王勢力以 **全息立繪濾鏡（世界觀包裝為 3D 投影；「3D 投影觀禮」為 PM 提案，非使用者要求，技術上不做 3D 模型）** 連線觀禮。主持人由**上屆魅力之星（紅顏榜首）＋上屆新人王**聯袂主持（第 1 屆固定為史小境＋司馬徽，於結尾交棒給雙冠王）；結尾全員入圍者拍大合照定格為現場背景（僅執行期畫面）；存檔只存資料（ID、年份、獎項、評分快照、站位座標），走共用伺服器 API / `annualCeremonyArchive`，不存圖片或 Base64；「定格合影／紀念展示圖」於玩家查閱時依資料即時組裝。

## 1. 世界觀包裝與文案語氣（對齊 `doc_spec_1273`）

- **為什麼在《史境 Online》會有排行榜和 3D 投影頒獎？**
  2087 年史境公司用全人類網路資料訓練出的 AI 武將早已把直播、投票、衝熱搜當成日常（張飛開直播、司馬徽發「好」字三萬讚）。每年冬末，頭盔 AI 客服「**史小境**」會聯合司馬徽等名士 AI 評審團，開一個跨伺服器的「**史境雲端金殿**」（「3D 投影觀禮」為 PM 提案，非使用者要求），把天底下所有活著的君主用「**3D 全息投影（技術實作為全息 Shader / 立繪濾鏡）**」請進同一個房間——畢竟隔著投影誰也砍不到誰，剛好一起吃瓜看榜單！
- **評語生成鐵則（Q-RNK2）**：
  - **絕對不接 LLM**。由系統從 `AnnualGeneralLedger` 取出該武將年度貢獻佔比最高的真實因果紀錄（擊破對手名、演繹劇目名、最高票粉絲武將名、最高評級徒弟名），套入結構化語氣模板產出搞笑又精準的評審／粉絲短評。

## 2. 四層可插拔獨立架構（Plugin / Registry Pattern）

為確保未來新增第 5、第 10 個榜單時完全不需修改核心引擎與舊存檔，架構嚴格切分為獨立四層：

| 層級 | 模組與職責 | 新增榜單時要做什麼？ |
|---|---|---|
| **1. 資料定義層** | `annual-ranking-config.json`（陣列 `boards[]` 描述 `boardId`、`ceremonyOrder`、`enabledWhen` 複用 `FND-M Condition`、`evaluatorKey`、`rewardBundleId`、`mindTag`） | JSON 增加 1 筆設定物件與 i18n key |
| **2. 純邏輯計算註冊表** | `IRankingBoardProvider` + `AnnualAwardsRegistry`（純 TS 無狀態、`evaluate()` 算分、`buildEvidence()` 抽證據） | 新增 1 個獨立 `.ts` 小檔案並 `register()`；核心引擎 `WorldAnnualRankingsEngine` **0 行改動** |
| **3. 動態指標帳本** | `AnnualGeneralLedger.metrics: Record<string, number>` + `highlights[]`（各系統透過 `ledger.addMetric(id, key, val, meta)` 寫入，不綁死介面欄位） | 對應系統結算時多呼叫一次 `addMetric()` |
| **4. 典禮組裝與通用存檔** | `CeremonyScriptAssembler` 依當屆 `activeBoards` 迴圈生成 `StoryCue[]`；存檔用 `boards: Record<string, BoardArchiveEntry>` 動態鍵值 Map | **0 行改動**，舊存檔 100% 向後相容無須 Migration |

## 3. 第一階段 4 大核心榜單 ＋ 儲備擴充榜：資格、公式與 3 組算例

依總 PM 裁決，**第一階段只做 4 大獎（`kills`／`governance`／`charm`／`rookie`）**；獎項定義與評分權重放 JSON，評分函數以 evaluator id（`evaluatorKey`）註冊。名師人氣榜（`mentor`）移至第二階段儲備榜單（第一年新人王榜為第 2 屆起雙主持傳承必備基礎，故列入第一階段首發）：

### 3.1 殺敵巔峰榜（`boardId: "kills"`）
- **戰場一致性規則（11/21 裁決）**：不論玩家使用「極速決戰」或「委託代打」，皆嚴格以**實際戰鬥結算結果**寫入帳本，絕不因戰鬥模式打折或加權。
- **公式**：
  $$\text{KillScore} = \sum_{b \in \text{Battles}} \min\left(3000,\; \left(\frac{\text{Kills}_b}{100} \times \text{clamp}\left(\frac{\text{EnemyPower}_b}{1000}, 0.6, 2.5\right) + B_{\text{duel}, b}\right) \times M_{\text{lead}, b}\right)$$
  - 變數：$\text{Kills}_b \in [0, 50000]$（擊殺兵數）；$W_{\text{enemy}}$ 夾制 `[0.6, 2.5]`（以戰力 1000 為基準）；$B_{\text{duel}} \in \{0, 150, 300, 600\}$（單挑斬將／擊破強將）；$M_{\text{lead}} \in \{1.0, 1.15\}$（主將 1.15x）。單場上限 3000。
- **算例**：(1) 新手打 2 場賊寇各殺 1200、敵戰力 700(0.7x)、主將 → $(12\times 0.7)\times 1.15 \times 2 \approx 19$ 分；(2) 中期 5 場各殺 4500、敵 1500(1.5x)、副將＋1 次斬將(300) → $337.5 + 300 = 638$ 分；(3) 極端 8 場各殺 12000、敵 2800(夾制 2.5x)、主將＋3 次斬將 → $8\times 345 + 900 = 3660$ 分。

### 3.2 治理貢獻排行榜（`boardId: "governance"`，依 11/22 總 PM 裁決核可）
- **統計**：玩家太守府政務公務、家業掌櫃/主事兼任產出與 AI 季結 `aiGovernanceTick`（`RivalGovernance.ts`）真實產出。
- **公式**：
  $$\text{GovScore} = \min\left(3200,\; \sum_{s=1}^{4} \min\left(800,\; \sum_{t \in \text{Tasks}_s} \text{TaskScore}_{s,t} + \text{EstateScore}_s\right)\right)$$
  - **任務計分**：$\text{TaskScore} = \text{BaseYield} \times W_{\text{type}} \times M_{\text{stat}} \times M_{\text{volunteer}}$
  - **變數與權重（全部由 `annual-ranking-config.json` 配置，嚴禁程式硬編碼）**：
    - 任務類別權重 $W_{\text{type}}$：常規農耕/治水/兵源 `1.0`；商稅統籌 `1.2`；外交情報/策反 `1.6`。
    - 能力效率加成 $M_{\text{stat}} = \text{clamp}(0.6 + \frac{\text{POL} + \text{INT}}{200},\; 0.6,\; 1.6)$。
    - 自告奮勇加成 $M_{\text{volunteer}} = 1.2$（一般指派為 `1.0`）。
    - 家業加給 $\text{EstateScore}_s = \min(200,\; \frac{\text{EstateSilverQuarter}}{500} \times 10)$（單季上限 200）。
    - 單季防爆上限 `800`，全年封頂 `3200`。
- **算例**：(1) 新手文官 POL 74/INT 70 農耕 4 季未自告奮勇：$100\times 1.0\times 1.32\times 1.0\times 4 = 528$ 分；(2) 中期名臣 POL 92/INT 90 外交 4 季自告奮勇＋兼掌錢莊：$(200\times 1.6\times 1.51\times 1.2 + 60)\times 4 = 2560$ 分；(3) 極限名臣 POL 98/INT 95 單季公務 930 分＋家業 120 分，觸發單季防爆 clamp 至 800 分，全年四季滿分 3200 分。

### 3.3 紅顏表演魅力榜（`boardId: "charm"`，依 11/22 總 PM 裁決核可）
- **定位**：年度紅顏魅力女冠，決定次年年終盛典雙主持之女司儀人選。
- **公式（全部權重、上限、衰減係數由 `annual-ranking-config.json` 配置，嚴禁程式硬編碼）**：
  1. 演出熱度：$\text{Hype} = \sum_{p \in \text{Plays}} (\text{TheaterPrestige} \times \text{PlayHeat}_p \times \text{RepeatDecay}_p) + \text{BanquetBonus}$
     - 連演衰減率 $\text{RepeatDecay}_p = \max(0.6,\; 1.0 - (\text{consecutiveSeasons}_p - 1) \times 0.2)$（第 1 季 `1.0`、第 2 季 `0.8`、第 3 季及以上下限夾制 `0.6`，防斷崖歸零並保留新人競爭空間）。
  2. 全國存活武將 $v$ 對候選 $c$ 投票：$\text{Vote}(v, c) = \text{clamp}\left(\frac{\text{Hype}_c}{50} \times (1 + \frac{\text{CHA}_c}{100}) \times \text{PersonaMatch}(v, c),\; 0,\; 50\right)$
     - 單人投票上限 `50` 票；總榜總票數封頂 `9999` 票。
     - 個性契合度 $\text{PersonaMatch}$：儒將風雅 $1.3$、豪勇熱烈 $1.2$、家族親緣 $1.25$、一般 $1.0$。
- **算例**：(1) 新手卞夫人 CHA 72 出席宴會 Hype 40，18 位武將各投 1 票 → `18` 票；(2) 中期貂蟬 CHA 94 Lv3 歌劇廳名劇 Hype 260，40 位名將綜合投票 → 約 `480` 票；(3) 連演第 3 季大喬 CHA 92 觸發 0.6x 衰減，鐵粉孫策投 17 票，全國綜合投票 → 約 `1620` 票。

### 3.4 教官樹人成就榜（`boardId: "mentor"`，純年度實績）
- **公式**：
  $$\text{MentorScore} = \sum_{g \in \text{GradThisYear}} (S_{\text{grade}}(g) + B_{\text{inherit}}(g)) \times M_{\text{bond}}(g) + \sum_{a \in \text{Alumni}} \min(400, 0.10 \times \text{BestRankScore}(a)) + 15 \times N_{\text{hint}}$$
  - 變數：$S_{\text{grade}} \in \{400, 250, 120, 40\}$（S/A/B/C）；$B_{\text{inherit}} \in \{0, 120\}$（授出 `mentorTeach` 師承戰法）；$M_{\text{bond}} \in \{1.0, 1.2\}$（羈絆 $\ge 60$）；門徒本年最高榜單分反哺 10%（單徒上限 400）；同堂點撥 $N_{\text{hint}} \in [0, 36]$ 每次 +15。
- **算例**：(1) 新手帶 1 名 B 級無戰法、點撥 4 次 → `180` 分；(2) 中期帶 1 名 A 級＋戰法＋羈絆(444)，1 名舊徒今年拿 800 分(+80)，點撥 10 次(+150) → `674` 分；(3) 極端宗師 2 名 S 級滿羈絆(1248)＋3 名徒弟各反哺 300(900)＋點撥 24 次(360) → `2508` 分。

### 3.5 年度最佳新人武將（`boardId: "rookie"`，出道當年限定）
- **資格（A5）**：當年學府結業／成年禮出仕子嗣，或當年新入仕且年齡 $\le 22$ 歲之青年將（終身限參選 1 次）。
- **公式**：$\text{RookieScore} = S_{\text{debut}} + 1.0 \times \text{KillScore} + 1.0 \times \text{GovScore} + 0.8 \times \text{CharmVoteScore} + B_{\text{prodigy}}$
  - $S_{\text{debut}} \in [50, 350]$；$B_{\text{prodigy}} \in \{0, 150\}$（家門奇才或名師門生）。
- **算例**：(1) C 級不入學成年(50)＋農耕 220 → `270` 分；(2) 開局 14 歲趙雲(260)＋殺敵 180＋內政 160 → `600` 分；(3) S 級奇才(300+150)＋殺敵 1200＋吸粉 200 → `1850` 分。

## 4. 心智、血統白因子與人物占用（OCC）連動

- **人員占用自然造成榜單波動**：武將若去學府當教官（`mentorAssign`）或待產哺乳（`nursing`）會被擋出征，當年自然掉出殺敵榜（`▼`）並可能躍升教官或治理榜，使每年排行真實反映調度取捨。
- **心智誇耀（A2）**：前 10 名武將寫入一筆 `MindEvent`（`kind: 'PRAISED'`, tags 含 `'rank_top10'` / `boardId`），心情直接推升至 `EAGER` / `HIGH`，並在大廳對話引用自己的榜單事蹟。
- **純榮譽獎勵與名冊成就徽章（對齊 11/22 總 PM 裁決）**：
  - 滿一年發放專屬稱號、名冊成就徽章（如 `天下第一武聖`、`當朝棟樑`、`絕代佳人`、`年度天驕`）與個人紀念背景。
  - **嚴格守護數值平衡**：所有年終獎勵**純屬榮譽展示性質**，不給予攻擊力、防禦力、兵力等任何實體數值 bonus，確保零課與微課玩家不會因數值膨脹而破壞天花板。
  - 若未來擴充白因子連動，僅作為族譜/傳記之「榮譽履歷標籤」（名將後代有傳奇稱號標籤），絕不附帶戰力係數加成。
