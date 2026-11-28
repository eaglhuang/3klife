<!-- doc_id: doc_spec_1363 -->
# Q版武將作息表與喜好查看規格書（QSCHED-01）

> **規格代碼**：`QSCHED-01`　**任務卡**：PROG-2-10264　**裁決來源**：使用者 2026-11-28 本人核准「點武將時可以看到他今天在哪些時段去了哪裡、有什麼喜好，方便玩家去堵人、送禮」；要求資料接 `LifeSceneChooser` 的 7 個時段與 `life-profile`、符合情報 Lv0～5 可見規則、**自家家臣永遠可見**。
> **狀態**：規格草案（只有規格，不含程式；數值是 PM 暫定，全放 JSON 可調，不用問使用者）
> **定位**：「Q 版社會」的第 6 份，是 QLIFE-01 喜好與作息的**玩家端讀法**。引擎已有（PROG-2-10213 純邏輯），本書只管「怎麼讓玩家看到、看多少」。
> **依賴**：Q版生活系統規格書（`doc_spec_1356`，QLIFE-01：喜好模型、7 時段、`chooseScene`、送禮）、Q版社會總規格書（`doc_spec_1357`，QSOC-01：情報 Lv0～5、搜尋跳場景）、共用框架總綱（`doc_spec_1182`）、物品庫存 Base（`doc_spec_1184`）、人員占用 Base（`doc_spec_1248`）。
> **姊妹篇**：Q版街上偶遇他國武將規格書（QENC-01，同一批核准）。
> **程式對應（已存在）**：`assets/scripts/core/life/LifeSceneChooser.ts`（`chooseScene`、`topScenes`、`buildSnapshot`、`LifeSnapshot.trail`）、`types.ts`（`LifeSlot` 1～7）、資料 `life-profile.json`、`life-scenes.json`、`life-roster.json`。

## 0. 結論（先看這段）

1. 點武將的名牌（或從搜尋結果、小圓選單的「作息」進來）會開**作息卡**：上面是一天 7 個時段的時間軸，每格寫他去了哪、做什麼；下面是他的喜好（喜歡、討厭、愛的作息型）。
2. **看得到多少，由情報等級決定**（Lv0～5，沿用 QSOC-01 5.2）：Lv0 什麼都沒有，Lv5 連下一時段預測和每個時段的「慣例去處」都看得到。
3. **自家家臣永遠可見**：家臣的作息表（已過時段、目前時段）與喜好**不受情報等級限制**；他在做什麼的「下一時段預測」仍要 Lv5。
4. 資料不另造一份：作息是 `LifeSceneChooser` 每個時段的選擇結果，加一份**每日 7 格時段紀錄**（`lifeSlotLog`）；喜好直接讀 `life-profile.json`。
5. 作息卡的用途是**堵人與送禮**：有「去找他」（跳到他所在場景）、「送他喜歡的」（庫存篩出命中喜好的物品）兩顆按鈕；**看作息表、跳場景都不耗每季 6 次互動**，只有送禮、搭話這些真互動才扣。
6. UI 走錨點與區域資料檔，橫式是右側抽屜、直式是底部面板，保留日後改直式。
7. 台詞與提示句帶**說話者性別／玩家稱謂／代名詞**參數。

## 1. 名詞

| 名詞 | 意思 |
|---|---|
| 作息卡 | 點武將後開的資訊面板，含時間軸與喜好 |
| 時間軸 | 一個生活日 7 個時段（晨、上午、午、下午、傍晚、夜、深夜）的橫排／縱排格子 |
| 實況 | 已經發生的時段（過去）與目前時段的真實去處，來自時段紀錄 |
| 預測 | 還沒發生的下一個時段（Lv5）的最可能去處 |
| 慣例 | 這位武將在某個時段**平常最常去**的場景（由偏好權重推算，不是今天的結果）|
| 已知喜好 | 玩家靠送禮反應、聊天、偷聽「試出來」的喜好標籤，即使情報不夠也會記住 |
| 顯示等級 | 玩家情報等級經過熟人例外、躲避、戰爭修正後的等級（QSOC-01 5.4）|
| 家臣 | 我方家臣（`life-roster` 的 `kind: retainer`）；訪客、傭兵、浪人、俘虜、他國遊歷者視為非自家 |

## 2. 資料來源與接法

### 2.1 時段與場景（接 `LifeSceneChooser`）

`LifeSceneChooser` 每個時段為每位武將挑一次場景，結果是 `LifeChoice { generalId, sceneId, reason }`，快照 `LifeSnapshot` 帶 `quarter`、`slotSeq`、`slot`（1～7）、`season`、`choices`、`trail`（**只有最近 3 個時段**，最新在前）。

作息卡要 7 格，`trail` 不夠，所以**新增每日時段紀錄**：

| 項目 | 規則 |
|---|---|
| 寫入點 | 每個時段開始 `buildSnapshot` 算完後，對活躍名冊每位武將追加 1 筆 `SlotRecord`（`slot`、`sceneId`、`activityId`、`reason`、`withIds`）|
| 範圍 | 只記**目前生活日**的 7 格；換生活日（時段回到 1）清掉前一天；**換季整個清空** |
| 儲存 | 客戶端存檔（環形，每人 ≤ 7 筆）；**不需伺服器權威**（顯示用，且由確定性亂數＋世界狀態可重算，見 2.4）|
| 離線／不看 | 沿用 QLIFE-01 3.2：不在生活層時不模擬；進入時以「當下時段」直接生成快照，**已過的時段標成「不明」**，不補算過去（避免作息表騙人）|
| 同場景同行者 | `withIds`：同一時段同場景的其他武將 id（作息卡可顯示「跟誰在一起」，受同樣的 Lv 規則）|

### 2.2 喜好（接 `life-profile`）

| 讀取欄位（`life-profile.json`）| 作息卡顯示 |
|---|---|
| `likes`／`dislikes`（標籤 id，如 `tag_wine`）| 喜歡、討厭 chip；顯示字走 i18n `life.tag.<id>`，不存中文 |
| `chronotype`（`day`／`night`）| 「日行」「夜貓」小圖示；影響第 6、7 時段的慣例 |
| `sociability` | 愛湊熱鬧／獨來獨往 的小條 |
| `stubbornness` | 「愛換地方／念舊」的小條（Lv5 才看得到，因為它影響預測）|
| `props` | 「常拿的東西」（酒壺、書、長槍），用來暗示送禮方向；Lv4 以上 |
| `homeScene` | 「回哪裡睡」；Lv4 以上或家臣 |
| `affinityScene` / `affinityTag` | **不直接顯示數字**，只用來算「慣例」（2.3）|

### 2.3 慣例與預測怎麼算

| 項目 | 規則 |
|---|---|
| 慣例 `habit(g, slot)` | 呼叫 `topScenes(ctx, n)` 取**中立情境**（心情 0、無世界事件、無官職變化、目前所在忽略）下該時段分數前 N 名（預設 N＝3），顯示場景名與強度條（高／中／低，不顯示數字）|
| 預測 `forecast(g, slot+1)` | Lv5 才有：用**目前真實情境**（心情、世界事件、官職、跟主角關係）呼叫 `topScenes(ctx, 2)`，顯示最可能 1～2 個場景＋機率檔位（很可能／可能）；**不顯示確定結果**，因為抽籤是加權隨機，預測只是機率（避免玩家覺得作息表騙人）|
| 機率換檔 | `score^k`（`k=1.6`）正規化後：≥ 0.5 很可能、0.25～0.5 可能、其餘不列 |
| 被占用的人 | OCC 占用（出征、學府、待產、哺乳、療傷）者，預測與慣例都改顯示占用地點與理由，例如「在學府讀書（還有 3 季）」（走 `resolveOccupancyScene`）|
| 戰爭 | 戰爭期間軍事區加成已在 `chooseScene`，不另處理 |

### 2.4 確定性

- `chooseScene` 的亂數 `seed＝(generalId, 季度序號, 時段序號)`，**同一情境重算結果一致**。
- 但心情、友誼、世界事件會在時段中改變；因此**已過時段以紀錄為準**，不重算。
- 預測用「現在」的情境算，下一個時段開始真正抽籤時如果情境變了（例如玩家剛送禮改變心情），結果可能和預測不同——這是設計：預測只是機率，卡面註明「預測不一定準」。

## 3. 情報 Lv0～5 可見規則

### 3.1 對非自家武將（訪客、傭兵、浪人、俘虜、他國遊歷者）

換算沿用 QSOC-01 5.2。**顯示等級**＝玩家情報等級，經 QSOC-01 5.4 修正：熟人（友誼 ≥ +30 或有羈絆）+1；友誼 ≤ −20 且避開主角 −1；戰爭時軍事區場景 +1；上限 Lv5、下限 Lv0。

| 資訊 | Lv0 | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 |
|---|---|---|---|---|---|---|
| 作息卡可不可以開 | 可（只剩剪影）| 可 | 可 | 可 | 可 | 可 |
| 武將身分（頭像＋名）| 剪影＋「?」 | 剪影＋「?」 | 剪影＋「?」 | 顯示 | 顯示 | 顯示 |
| 已過時段去哪（實況）| 全「?」，只回「這個時段他在城裡」| **大區名**（官署區、市井大街…）| **場景名** | 場景名 | 場景名 | 場景名 |
| 目前時段在哪 | 「?」 | 大區 | 場景 | 場景＋頭像 | 場景＋頭像 | 場景＋頭像 |
| 在做什麼（活動符號）| ─ | ─ | ─ | ─ | 顯示 | 顯示 |
| 跟誰在一起（`withIds`）| ─ | ─ | ─ | 只顯示家臣與已識破者 | 顯示 | 顯示 |
| 作息型（日行／夜貓）| ─ | ─ | ─ | ─ | 顯示 | 顯示 |
| 最愛 1 項（`likes[0]`）| ─ | ─ | ─ | 顯示 | 顯示 | 顯示 |
| 全部喜歡／討厭、常拿的東西 | ─ | ─ | ─ | ─ | 顯示 | 顯示 |
| 慣例（每時段常去 Top 3）| ─ | ─ | ─ | ─ | ─ | 顯示 |
| 下一時段預測 | ─ | ─ | ─ | ─ | ─ | 顯示 |
| 固執、愛湊熱鬧的小條 | ─ | ─ | ─ | ─ | ─ | 顯示 |

> 「─」＝顯示成鎖頭或「?」，點開只說明「情報再高一些就看得到」，**不給數字、不洩漏**。
> 實況那一欄 Lv0 的唯一一句「這個時段他在城裡」與 QSOC-01 4.3 一致。

### 3.2 對自家家臣（**永遠可見**，使用者 11/28 本人要求）

| 資訊 | 規則 |
|---|---|
| 身分（頭像＋名）| 永遠顯示（QSOC-01 已定）|
| 已過時段實況、目前時段（場景名＋頭像）| **永遠顯示，不看情報等級** |
| 活動符號（在做什麼）| **永遠顯示** |
| 喜歡、討厭、最愛、作息型、常拿的東西、回哪裡睡 | **永遠顯示** |
| 慣例（每時段常去 Top 3）| **永遠顯示**（讓玩家能堵家臣；也是「自家排班」）|
| **下一時段預測** | **仍要 Lv5**（保留「情報」的價值，也避免作息表變成劇透）|
| 固執、愛湊熱鬧小條 | Lv4 以上（家臣是自己人，放寬一級）|

> **和 QSOC-01 5.2 的差異（待使用者確認，見 Q-S1）**：QSOC-01 5.2 寫「情報等級只限制家臣的位置與活動；Lv0～2 於場景內不顯示其活動符號，也無法查詢或預知他在哪個場景」。使用者這次要求「自家家臣永遠可見」，本書建議把**作息卡**視為「自家排班表」例外：作息卡永遠給家臣的實況與慣例；**場景內 Q 頭上的活動符號與搜尋跳場景仍照 QSOC-01 5.2 的 Lv 限制**。這樣不會破壞情報養成線，但作息卡讓低 Lv 玩家也找得到家臣。

### 3.3 已知喜好（Lv 不夠也能試出來）

玩家用行動「試出」的喜好，永久記進 `knownTags`，**不受情報等級限制**：

| 試出的方式 | 記什麼 |
|---|---|
| 送禮，對方反應「喜歡」（×2）| `likes` 加入該禮物的標籤 |
| 送禮，對方反應「討厭」（×−1.5）| `dislikes` 加入該標籤 |
| 聊天、偷聽到「我最愛…」台詞（`life_tag_reveal` 事件）| 該標籤 |
| 兩個家臣的雙人互動被旁觀 | 偶爾揭露一個 |

顯示規則：`knownTags ∪ 等級允許看見的 likes／dislikes`；試出來的 chip 右上角有一個小「試」字徽記，與 Lv 看見的區分。這鼓勵玩家**先送禮試水溫**。

### 3.4 遊歷者與已離開的人

- 他國遊歷者（QENC-01）：只在**遊歷停留期間**可開作息卡；內容只有停留的實況（入場時刻、現在場景）；`likes` 依 Lv 規則；**沒有慣例與預測**（他不是常駐者）。
- 離場後作息卡顯示「他已離開市井大街」。
- 被招攬成為家臣：從 `wanderer` 轉 `retainer`，之後作息表永遠可見（3.2）。
- 出征、被擒、學府、重傷休養中的家臣：實況顯示占用地點與理由，不顯示逛街時段。

## 4. 作息卡 UI

### 4.1 進入方式

| 入口 | 說明 |
|---|---|
| 點場景裡 Q 頭的**名牌** | 最直覺；非自家 Lv0～2 的剪影點名牌開的是剪影版卡 |
| 小圓選單新增「作息」鈕 | QLIFE-01 6 的圓選單原本 6 顆，**作息放最外圈小圓、不佔主要位置**；按鈕 ≥ 44 像素 |
| 場景切換 UI 的搜尋結果（QSOC-01 4.3）| 搜到人後點頭像開作息卡 |
| 大廳或人物頁 | 日後可從武將頁加「今日作息」連結（本書不做）|

**不耗任何次數**：開卡、看、切時段、跳場景都不扣每季 6 次免費互動。

### 4.2 橫式草圖（預設，右側抽屜；寬度為螢幕 34%，最小 360 dp）

```
┌────────────────────────────────────────────┐
│ [頭像] 張飛        蜀 · 日行      [Lv4]  [X]│  ← 標題列：頭像、名、勢力徽、顯示等級 chip、關閉
├────────────────────────────────────────────┤
│ 今天的行程                     （第 3 日·春）│
│ ┌──┬──┬──┬──┬──┬──┬──┐                      │
│ │晨│上│午│下│傍│夜│深│                      │  ← 7 格；已過＝實色，目前＝亮框脈動，未來＝鎖/虛線
│ │兵│校│酒│酒│澡│酒│宅│                      │  ← 場景縮寫（點格子看全名）
│ │營│場│館│館│堂│館│  │                      │
│ │ 武│ 武│ 酒│ 酒│ 浴 │ ？│ ？│                      │  ← 活動符號（Lv4+）；未到＝？ 或 預測 chip（Lv5）
│ └──┴──┴──┴──┴──┴──┴──┘                      │
│ 現在：酒館（午）· 跟 關羽、劉備 一起          │
│ 下一時段預測（Lv5）：酒館 很可能 / 澡堂 可能  │
│ 預測不一定準。                               │
├────────────────────────────────────────────┤
│ 平常愛去（慣例）          〔晨 午 傍 夜 …〕 │  ← 切時段分頁，顯示該時段前 3 名＋強度條
│  ① 兵營 ▮▮▮▮   ② 演武場 ▮▮▮   ③ 酒館 ▮▮    │
├────────────────────────────────────────────┤
│ 喜好                                         │
│  喜歡：[酒] [兵器] [肉]                      │
│  討厭：[文書] [茶]                           │
│  常拿：酒壺、長槍      回哪裡睡：自宅        │
├────────────────────────────────────────────┤
│  [去找他]        [送他喜歡的]        [提醒]  │  ← 三顆主按鈕，≥ 44 像素
└────────────────────────────────────────────┘
```

說明：

- **頂部**：頭像＋名＋勢力徽＋顯示等級 chip（Lv 越高 chip 越亮；熟人例外時 chip 旁有小「+1」）。
- **時間軸 7 格**：寬度平均分配；已過格＝實色（可點，顯示該時段的全場景名與同行者，受 Lv 規則）；目前格＝亮框脈動；下一格＝Lv5 顯示預測 chip，否則鎖；其餘未來格＝鎖頭。
- **慣例分頁**：Lv5 或家臣才有，切換時段看前 3 名場景；沒資格時整區變一行「情報等級再高些就能看出他的習慣」。
- **喜好區**：喜歡（愛心框）、討厭（裂痕框），試出來的標「試」；Lv 不夠的欄位顯示鎖頭與一行白話提示。
- **按鈕**：
  - **去找他**：跳到他**目前所在場景**並對焦（走 QSOC-01 4.3 的跳轉，遵守顯示等級：Lv0 只能提示「在城裡」，Lv1 跳大圖，Lv2 以上跳場景）；若目前不可跳，按鈕灰色並說明原因。
  - **送他喜歡的**：開背包（ITM），**預先篩出命中他 `likes` 或 `knownTags.likes` 的物品**，沒有就顯示「你手上沒有他喜歡的東西」；送出本身走 QLIFE-01 6.2，**扣 1 次互動**，且必須人在同一場景（不在就先提示「先去找他」並提供「去找他」按鈕）。
  - **提醒**：設一個「下一次他來到我所在的大圖／某場景時通知我」的追蹤；每位玩家最多追蹤 3 位；只有家臣或 Lv4 以上才能設（否則等於洩漏位置）。通知用 toast，不耗任何次數。

### 4.3 直式草圖（保留日後使用；現在先不支援 480 直式，但資料與錨點要能切）

```
┌──────────────────────┐
│ [頭像] 張飛  蜀 [Lv4] [X]│
├──────────────────────┤
│ 晨   兵營      武   已過 │  ← 時間軸改縱向，每時段一列，高度 ≥ 44 dp
│ 上午 校場      武   已過 │
│ 午   酒館      酒  ◀ 現在│
│ 下午 ？（預測：酒館 很可能）│
│ 傍晚 鎖                │
│ 夜   鎖                │
│ 深夜 鎖                │
├──────────────────────┤
│ 喜好 …（同橫式，換行排列） │
├──────────────────────┤
│ [去找他] [送他喜歡的] [提醒]│
└──────────────────────┘
```

- 容器：**底部面板**（高度 60%，可拖到 90%）。
- 實作規則：
  1. 所有排布走**錨點、相對比例、區域資料檔**（`life-schedule-layout.json`，見 5.3），**不寫死橫式**。
  2. 時間軸元件同一份程式，由 `axis: "row" | "column"` 決定方向。
  3. 切橫直式不重建節點（重用，手機記憶體優先）。

### 4.4 狀態與細節

| 情況 | 顯示 |
|---|---|
| 沒資格看（Lv0 非自家）| 時間軸全灰、每格「?」；最上方一行「只知道他在城裡」|
| 顯示等級被修正 | chip 旁小標：熟人 +1、躲你 −1、戰爭 +1 |
| 已知喜好試出 | chip 右上角「試」徽記 |
| 被占用 | 整個時間軸替換成一條占用橫幅：「正在學府讀書，還有 3 季」|
| 傷勢 | 時間軸前方加「養傷中」圖示，慣例改成醫館、自宅、溫泉（QLIFE-01 6.4.1）|
| 剛換季／換時段 | 時間軸平滑捲動；**不重建**整張卡 |
| 手機 | 一次只打開一張作息卡；關卡釋放；不存卡圖，頭像走共通頭像圖集（不佔大圖集）|

## 5. 資料檔與 JSON schema

| 檔案（建議）| 內容 |
|---|---|
| `life-schedule-view.json` | 每個情報等級看得到什麼的可見性矩陣、慣例／預測參數、追蹤上限（5.1）|
| `life-schedule-layout.json` | 作息卡橫式與直式的錨點、區塊順序、按鈕尺寸（5.3）|
| 存檔 `lifeSlotLog`（客戶端）| 每日 7 格時段紀錄（5.2）|
| 存檔 `lifeKnownTags`（走存檔 API）| 已知喜好（5.2）|
| `life-profile.json`、`life-scenes.json`、`life-roster.json`（既有）| 喜好、場景、名冊，**本書不改它們的欄位** |

### 5.1 `life-schedule-view.json`

```json
{
  "schema": "life-schedule-view.v1",
  "levels": {
    "0": { "identity": false, "past": "none", "now": "none", "activity": false, "withIds": "none", "chronotype": false, "likesTop": 0, "dislikes": false, "props": false, "habit": false, "forecast": false, "bars": false },
    "1": { "identity": false, "past": "area", "now": "area", "activity": false, "withIds": "none", "chronotype": false, "likesTop": 0, "dislikes": false, "props": false, "habit": false, "forecast": false, "bars": false },
    "2": { "identity": false, "past": "scene", "now": "scene", "activity": false, "withIds": "none", "chronotype": false, "likesTop": 0, "dislikes": false, "props": false, "habit": false, "forecast": false, "bars": false },
    "3": { "identity": true,  "past": "scene", "now": "scene", "activity": false, "withIds": "known", "chronotype": false, "likesTop": 1, "dislikes": false, "props": false, "habit": false, "forecast": false, "bars": false },
    "4": { "identity": true,  "past": "scene", "now": "scene", "activity": true,  "withIds": "all", "chronotype": true,  "likesTop": 99, "dislikes": true, "props": true, "habit": false, "forecast": false, "bars": false },
    "5": { "identity": true,  "past": "scene", "now": "scene", "activity": true,  "withIds": "all", "chronotype": true,  "likesTop": 99, "dislikes": true, "props": true, "habit": true,  "forecast": true,  "bars": true }
  },
  "retainerOverride": {
    "identity": true, "past": "scene", "now": "scene", "activity": true, "withIds": "all",
    "chronotype": true, "likesTop": 99, "dislikes": true, "props": true, "habit": true,
    "forecast": false, "forecastMinLevel": 5,
    "bars": false, "barsMinLevel": 4
  },
  "habit": { "topN": 3, "neutralMood": 0, "ignoreCurrentScene": true },
  "forecast": { "topN": 2, "bands": { "veryLikely": 0.5, "likely": 0.25 }, "pickExponent": 1.6 },
  "displayLevelAdjust": { "familiar": 1, "avoiding": -1, "warMilitaryArea": 1, "min": 0, "max": 5 },
  "familiarFriendMin": 30,
  "avoidFriendMax": -20,
  "knownTags": { "enabled": true, "markKnown": true },
  "track": { "maxPerPlayer": 3, "minLevel": 4, "retainerAlways": true },
  "pastUnknownWhenNotObserved": true
}
```

| 欄位 | 說明 |
|---|---|
| `levels.<n>.past／now` | `none`／`area`／`scene`：看得到到大區或場景 |
| `withIds` | `none`／`known`（只列家臣與已識破者）／`all` |
| `likesTop` | 看得到幾項喜歡；99＝全部 |
| `retainerOverride` | 家臣覆寫；`forecastMinLevel`、`barsMinLevel` 表示這兩項仍要情報等級 |
| `displayLevelAdjust` | 對應 QSOC-01 5.4 的修正 |
| `pastUnknownWhenNotObserved` | 玩家沒在看時沒紀錄的時段標「不明」|
| 所有字串 | 沒有中文字面；顯示一律走 i18n（第 6 章）|

### 5.2 存檔資料

```json
{
  "schema": "life-slot-log.v1",
  "quarter": 12,
  "lifeDay": 3,
  "generals": {
    "zhang_fei": [
      { "slot": 1, "sceneId": "mil_barracks", "activityId": "act_train",  "reason": "chosen", "withIds": ["guan_yu"] },
      { "slot": 2, "sceneId": "mil_arena",    "activityId": "act_train",  "reason": "chosen", "withIds": [] },
      { "slot": 3, "sceneId": "mkt_tavern",   "activityId": "act_drink",  "reason": "chosen", "withIds": ["guan_yu", "liu_bei"] }
    ]
  }
}
```

```json
{
  "schema": "life-known-tags.v1",
  "generals": {
    "zhao_yun": { "likes": ["tag_horse"], "dislikes": ["tag_wine"], "sources": { "tag_horse": "gift", "tag_wine": "gift" } }
  }
}
```

| 規則 | 說明 |
|---|---|
| `reason` | 沿用 `LifeChoiceReason`：`occupied`、`chosen`、`fallback` |
| `lifeDay` | 本季內第幾個生活日（生活時鐘轉滿 7 個時段算 1 天）|
| 換日／換季 | 換日清前一日；換季整個清空 |
| 已知喜好 | 走存檔 API（單機走本機 adapter）；`sources` 標來源（`gift`、`chat`、`eavesdrop`）|
| 客戶端 | 時段紀錄只供顯示，不影響任何數值；**已知喜好影響送禮提示**，但送禮的友誼計算仍走伺服器（QLIFE-01 6.2），客戶端不得用已知喜好直接改友誼 |

### 5.3 `life-schedule-layout.json`

```json
{
  "schema": "life-schedule-layout.v1",
  "variants": {
    "landscape": {
      "container": "drawerRight", "widthRatio": 0.34, "minWidthDp": 360,
      "timeline": { "axis": "row",    "cellMinDp": 44 },
      "blocks": ["header", "timeline", "nowForecast", "habit", "likes", "actions"]
    },
    "portrait": {
      "container": "bottomSheet", "heightRatio": 0.6, "maxHeightRatio": 0.9,
      "timeline": { "axis": "column", "cellMinDp": 44 },
      "blocks": ["header", "timeline", "likes", "actions"]
    }
  },
  "buttons": { "minDp": 44, "ids": ["goFind", "giveLiked", "track"] },
  "anchorRules": { "usePercentOrAnchor": true, "forbidFixedPixels": true }
}
```

## 6. i18n key

文字**不寫死**，中／簡中／英／日四份語系檔各補一份。

| key | 用途 |
|---|---|
| `life.sched.title` | 「今天的行程」|
| `life.sched.slot.1`～`life.sched.slot.7` | 晨、上午、午、下午、傍晚、夜、深夜 |
| `life.sched.now` | 「現在」 |
| `life.sched.past` | 「已過」 |
| `life.sched.forecast.title` | 「下一時段預測」 |
| `life.sched.forecast.veryLikely`／`likely` | 很可能／可能 |
| `life.sched.forecast.disclaimer` | 「預測不一定準」 |
| `life.sched.habit.title` | 「平常愛去」 |
| `life.sched.habit.strength.high`／`mid`／`low` | 強度 |
| `life.sched.likes`／`dislikes`／`props`／`home` | 區塊標題 |
| `life.sched.badge.tried` | 「試」徽記 |
| `life.sched.badge.familiar`／`avoiding`／`war` | 顯示等級修正小標 |
| `life.sched.chrono.day`／`night` | 日行／夜貓 |
| `life.sched.lock.<field>` | 各欄位的鎖頭說明，例如「情報等級再高些就看得到」|
| `life.sched.unknown` | 「不明」（沒看到的時段）|
| `life.sched.cityOnly` | 「這個時段他在城裡」 |
| `life.sched.occupied.<kind>` | 出征、學府、待產、哺乳、養傷 的占用說明，帶 `{seasons}` |
| `life.sched.btn.goFind`／`giveLiked`／`track` | 三顆按鈕 |
| `life.sched.hint.noLikedItem` | 「你手上沒有{pronoun}喜歡的東西」 |
| `life.sched.hint.goFirst` | 「要先去找{pronoun}才能送」 |
| `life.sched.hint.track.limit` | 追蹤已滿 3 位 |
| `life.sched.toast.arrive` | 「{name}來到{scene}了」 |
| `life.sched.line.<id>.<m｜f>` | 作息卡裡武將的台詞（例如被堵到）|
| `life.pronoun.m`／`f`、`life.title.player.m`／`f` | 沿用 QENC-01 第 8.3 的共用參數 |
| `life.tag.<id>` | 送禮標籤顯示名（`life-profile` 存的是標籤 id）|

### 6.1 性別參數（台詞與提示句）

| 參數 | 說明 |
|---|---|
| `{speakerGender}` | 武將性別，選 `.m`／`.f` 台詞變體 |
| `{playerGender}`、`{callPlayer}` | 武將稱呼玩家（公子／姑娘…），不寫死在台詞裡 |
| `{pronoun}` | 他／她，用在系統提示句 |
| `{name}`、`{scene}`、`{seasons}` | 名字、場景、剩餘季數 |

範例（zh-TW）：

```
life.sched.hint.noLikedItem = "你手上沒有{pronoun}喜歡的東西。"
life.sched.hint.goFirst     = "要先去找{pronoun}才能送。"
life.sched.line.caught.m    = "咦，{callPlayer}怎麼知道我在這裡？"
life.sched.line.caught.f    = "哎呀，{callPlayer}怎麼找到這裡來了？"
```

缺 `.f` 退回 `.m`，再缺退回中性；白話寫作，不要文言。

## 7. 與每季 6 次互動額度的關係

| 動作 | 扣次數 |
|---|---|
| 開作息卡、看時間軸、看喜好、看慣例與預測 | **不扣** |
| 去找他（跳場景）| **不扣**（切換場景本身不耗任何東西，QSOC-01 4.4）|
| 設追蹤提醒 | **不扣** |
| 送他喜歡的（真正送出）| 扣 1（沿用 QLIFE-01 6.2，被友誼季上限擋下不扣）|
| 搭話（堵到後）| 扣 1 |
| 被堵到時武將主動說話的台詞 | **不扣**（被動事件）|

## 8. 與共用框架的關係

| 本書功能 | 商店 SHP | 庫存 ITM | 任務 QST | 獎勵 RWD | 技能 SKL | 劇情 STY | 占用 OCC | 友誼 FRD |
|---|---|---|---|---|---|---|---|---|
| 武將是否被占用、占用地點與理由 | | | | | | | 主（`resolveOccupancyScene`，讀占用）| |
| 送他喜歡的（篩背包、送出）| | 主（篩標籤、`inventory.transfer`）| | | | | | 用（送禮友誼）|
| 已知喜好、堵人的「首次堵到」成就 | | | 用（可掛任務：「在酒館堵到張飛」）| 用（首次堵到某人 `intel` +0.2，沿用 QSOC-01 5.3「首次到達」的上限，不另開新來源）| | | | |
| 被堵到時的台詞演出 | | | | | | 用（短演出，不開專屬流程）| | |
| 友誼影響顯示等級（熟人 +1）| | | | | | | | 用（讀友誼值，不寫）|
| 提醒追蹤 | | | | | | | | |

說明：

- **任務（QST）**：可以做一類「堵人任務」（例如「今天在酒館遇到張飛，並送他一壺酒」），目標條件讀作息卡的資料（目前場景、喜好標籤）；任務完成後走 RWD。**本書不新增任務類型**，只提供資料與判定函式。
- **獎勵（RWD）**：作息卡本身不發獎勵；與情報的連動沿用 QSOC-01 5.3（首次到達某場景 +0.2，每季上限 3），不另加來源以免刷情報。
- **占用（OCC）**：作息卡只讀占用，不寫占用；被占用者顯示占用說明。遊歷者的 `wandering` 占用見 QENC-01。
- **友誼（FRD）**：作息卡只讀友誼（顯示等級修正）；真正送禮、搭話的友誼走 `FriendshipService.add`。
- **劇情演出（STY）**：被堵到時的台詞是短演出（泡泡），走武將台詞系統；沒有新劇情流程。
- **不新增框架、不新增 API**：作息資料是客戶端顯示層；已知喜好走既有存檔 API。

## 9. 驗收

1. 點任一武將名牌（或搜尋結果、小圓選單「作息」）能開作息卡，開卡不扣互動次數。
2. 同一情境下，作息卡的「慣例」前 3 名與 `topScenes(ctx, 3)` 一致；Lv5 的預測前 1～2 名與 `topScenes` 用目前情境一致。
3. 7 個時段全部跑一圈，時間軸 7 格與 `lifeSlotLog` 一致；換生活日清空前一日，換季整個清空。
4. 玩家沒在看時的時段標「不明」，不補算、不亂編。
5. 非自家武將：Lv0 全 ?；Lv1 只看到大區；Lv2 看到場景；Lv3 看到身分與最愛 1 項；Lv4 看到符號、全部喜好、作息型、常拿的東西；Lv5 才有慣例與預測。逐級驗證每一欄。
6. 熟人例外（友誼 ≥ +30）顯示等級 +1；躲你（友誼 ≤ −20 且避開）−1；戰爭時軍事區 +1；chip 旁小標正確。
7. **家臣在 Lv0 的存檔也能看到完整實況、活動、喜好與慣例**；下一時段預測仍要 Lv5；固執與愛湊熱鬧小條要 Lv4。
8. 家臣被占用（出征、學府、待產、哺乳、養傷）時顯示占用橫幅與剩餘季數，不顯示逛街時段。
9. 送禮試出喜好：送「喜歡」的禮物後，該標籤進 `knownTags`，Lv 不夠也顯示，並有「試」徽記；重新登入後仍在。
10. 「去找他」遵守 QSOC-01 4.3：Lv0 只提示「在城裡」，Lv1 跳大圖，Lv2 以上跳到場景；不扣次數。
11. 「送他喜歡的」只列命中喜好的物品；沒有時顯示提示；不在同一場景時引導先去找他；送出扣 1 次互動、被友誼季上限擋下不扣。
12. 提醒追蹤最多 3 位；Lv4 以下的非家臣不可設。
13. 橫式右側抽屜、直式底部面板兩個 layout 變體都能載入（直式即使不上線也要有資料與單元測試）；切換不重建節點。
14. 全部提示句與台詞有 `.m`／`.f` 或中性回退；代名詞「他／她」依說話對象性別正確；四語系 key 齊全。
15. 手機：一次最多 1 張作息卡；關閉後釋放；頭像走共通圖集，不新增大圖集。
16. 作息卡不改任何 `LifeSceneChooser` 結果、不影響確定性亂數（只讀不寫）。

## 10. 待使用者裁決

| 題 | 問題 | PM 建議 |
|---|---|---|
| Q-S1 | 「自家家臣永遠可見」要不要覆蓋 QSOC-01 5.2「Lv0～2 查不到家臣位置與活動」？ | 只對**作息卡**例外（本書 3.2）：卡上永遠給家臣的實況與慣例，下一時段預測仍要 Lv5；場景內符號與搜尋跳場景維持原 Lv 限制 |
| Q-S2 | 非自家武將的**喜好**（送禮方向）要在 Lv3 就給「最愛 1 項」嗎？ | 給。讓玩家 Lv3 就有送禮目標，Lv4 才給全部；再加上「送禮試出來」的已知喜好，前期不會卡死 |
| Q-S3 | 預測要不要顯示機率檔位（很可能／可能）還是直接給一個答案？ | 給檔位，不給單一答案；因為引擎本來就是加權抽籤，單一答案會常常不準，玩家以為壞掉 |

## 11. 實作順序建議（開卡由總 PM）

1. `LifeSlotLog` 純邏輯：每時段追加、換日／換季清空、不明標記（`LifeSceneChooser` 旁邊，無 Cocos 依賴）。
2. `LifeScheduleView` 純函式：輸入（武將、玩家情報、友誼、占用、時段紀錄、`life-schedule-view.json`），輸出 `ScheduleCardVM`（已套用可見規則，UI 只負責畫）。**可見規則全在這層，UI 不判斷等級**。
3. 資料檔兩份＋i18n 四語系骨架＋單元測試（Lv0～5 逐欄、家臣覆寫、熟人例外）。
4. UI：橫式抽屜、時間軸元件（`axis` 可切）、喜好區、三顆按鈕；直式變體先有資料。
5. 串接：搜尋跳場景、背包篩選、已知喜好存檔、追蹤 toast。
6. 驗收：照第 9 章逐項，玩家視角實點、看截圖。

## 12. 本書的文件地圖

| 文件 | 關係 |
|---|---|
| `Q版生活系統規格書.md`（doc_spec_1356）| 2 喜好模型、3 作息排程、6.2 送禮、6.4.1 傷勢 |
| `Q版社會總規格書.md`（doc_spec_1357）| 4.3 搜尋跳轉、5 情報 Lv0～5、5.4 熟人例外 |
| `Q版街上偶遇他國武將聊天切磋招攬規格書.md`（QENC-01）| 遊歷者作息卡範圍、招攬後轉家臣 |
| 程式 `assets/scripts/core/life/LifeSceneChooser.ts`、`types.ts` | 資料來源（只讀）|
