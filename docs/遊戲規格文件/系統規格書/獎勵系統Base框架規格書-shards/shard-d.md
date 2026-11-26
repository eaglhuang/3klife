# 獎勵系統Base框架規格書（分片索引） — 14 獲得面板（RewardPresenter：任何獲得的統一出口）

> 這是 `獎勵系統Base框架規格書.md` 的「14 獲得面板」分片。完整索引見 `docs/遊戲規格文件/系統規格書/獎勵系統Base框架規格書.md`。
> 任務卡：PROG-2-10101（本規格）、PROG-2-10102（實作，open）。mockup：`artifacts/ui-review/acquire-panel-1126/`（不提交）。
> 相關：物品庫存 (doc_spec_1184，入帳)、劇情演出 (演出播放)、轉蛋 (gachaReveal 演出保留)、任務回報 `HallMissionReportStack`（PROG-2-9966，風格基準）。


<!-- doc_id: doc_spec_1332 -->

## 14. 獲得面板（RewardPresenter）

使用者 11/26 原話：「我方獲得任何人物或物品時，要有一個通用 UI 面板。」

### 14.1 定位與原則

1. **一個面板、一個 API**：任何系統給玩家東西（人、物、錢、名號），都呼叫 `RewardPresenter.show(grants[], ctx)`；各系統**不得自做彈窗**。這是 §3.4 演出綁定的 `instant` 預設演出的正式 UI，也是所有特殊演出（寶箱、轉盤、轉蛋揭曉…）結束後的共同收尾。
2. **先入帳、後顯示**（沿用 §3.4）：面板只「回放已定結果」，不入帳、不改帳。跳過、閃退、重進都不影響帳目；離線期間的 `reward.pending` 登入時用同一面板補播。
3. **掛在既有框架上，不新增平行系統**：
   - 內容來源 = 獎勵框架 `RewardGrantResult.plan[].applied`（效果帳本）＋ 物品庫存 `inventory.overflow`（溢出轉換）；
   - 播放 = 既有 `PresentationRegistry`（`shared/reward/RewardPresentation.ts`）：本章把 **`instant` 內建演出的 sink（`GrantPresentationSink.showRewardList`）改由此面板實作**，並新增 `acquire` 別名；`chest`／`wheel`／`gachaReveal` 等演出播完後**自動串接**面板顯示「本次共獲得」彙整頁（可關：演出 args `chainPanel:false`）；
   - 單機版：資料走本機 API adapter（`core/api/localserver/RewardCommands.ts`），面板只吃 adapter 回傳的 grants，不直讀存檔。
4. **一般不拖慢**：一般物品／貨幣**零演出、單擊完成**；僅 SSR 以上或「新人物」加 ≤0.6 秒光暈，可跳過。
5. **手機記憶體優先**：全程單一面板節點重用（換內容不增減節點）；圖示走既有圖集（物品圖示、頭像用既有 `loadGeneralAvatar` 只載當筆）；**不新增大圖**；光暈用既有粒子／Graphics，不放新貼圖。

### 14.2 資料結構 `acquire-grant.v1`

```ts
interface AcquireGrant {
  type: 'general' | 'retainer' | 'heir' | 'spouse'      // 人物（general=武將，retainer=家臣）
      | 'item' | 'treasure' | 'equipment' | 'tigerTally'  // 物品類（treasure=寶物，tigerTally=虎符）
      | 'currency'                                         // gold(國家)／silver(家族銀兩)／jade(玉璧)／其他
      | 'title' | 'nameFragment' | 'skill' | 'other';     // 稱號、小名圖鑑碎片、習得戰法、其他
  id: string;                  // 人物 id／itemId／currencyId／titleId…
  qty: number;                 // 人物、稱號固定 1
  rarity: 'N'|'R'|'SR'|'SSR'|'UR'|'LR';   // 與全遊戲同一組（UIRarityMark）；無稀有度的貨幣用 'N'
  isNew: boolean;              // 首次獲得（人物新加入、圖鑑首次、稱號首次）→ 可觸發演出與「新」標
  source: { kind: string; ref?: string; label?: string };  // 任務／商店／轉蛋／歷練／戰利品／事件…；label 為 i18n 鍵
  line?: { speakerId?: string; key: string; params?: Record<string, string|number> }; // 一句台詞（見 14.7）
  detail?: Array<{ labelKey: string; value: string }>;     // 數值／效果行（武將五圍、物品效果、碎片進度）
  cta?: { labelKey: string; route: string };               // 「前往查看」鈕：route 為既有畫面路由
  overflow?: { toCurrency: string; amount: number };       // 背包滿溢出轉換結果
  grantId?: string;            // 對應 RewardGrantResult.grantId（用於 reward.ack 與去重）
}
interface AcquireContext { titleKey?: string; skin?: string; allowSkipAll?: boolean; grantKey: string; }
```

- 由 `toAcquireGrants(result: RewardGrantResult | pending): AcquireGrant[]` 轉換（純函式，不依賴 cc，放 `shared/reward/`）；非獎勵框架的老系統過渡期可直接組 `AcquireGrant[]`，但來源必須帶 `grantKey`（防重）。
- 稀有度判定：人物取 `resolveRarityTier`（R／SR／SSR／UR／LR 色票來自 `UIRarityMark`）；物品取 `ItemConfig.rarity`（數字→等階表）；貨幣一律 N；稱號取稱號表等階。**面板不自訂稀有度色**。

### 14.3 各類型呈現對照表

| type | 左側（128 圖框） | 標題行 | 狀態行（綠／稀有度色） | 獎勵／詳情行 | 台詞 | 按鈕 | 演出 |
|---|---|---|---|---|---|---|---|
| general／retainer | 頭像（既有載入器） | 「名字・稱號」 | 新加入　歸入我方（isNew） | 五圍＋專長一行 | 本人入隊台詞（性別參數） | 完成／前往查看（武將詳情） | SSR↑ 或新武將：光暈 ≤0.6s |
| heir（子嗣） | 子嗣頭像（少年款） | 「姓名（家族）」 | 新生／新入門 | 天賦小名、年齡 | 父母或本人 | 完成／前往查看（家族） | 光暈（新人物一律） |
| spouse | 配偶頭像 | 「姓名」 | 結為連理 | 好感、家族加成 | 本人 | 完成／前往查看 | 光暈 |
| item／treasure／equipment | 物品圖示（既有圖集） | 「名稱 ×qty」 | 已放入背包（庫存 N）／溢出轉換 | 一行效果、來源 | 無（可選旁白） | 完成（裝備加：前往裝備） | 無；SSR↑ 寶物裝備：光暈 |
| tigerTally | 虎符卡面小圖 | 「名稱」 | 新虎符／虎符+1 | 兵種、加成 | 無 | 完成／前往查看（虎符面板） | SSR↑ 光暈 |
| currency | 幣別圖示（金＝國家、銀兩＝家族、玉璧） | 「金（國家）＋300」 | 以幣別色標示 | 列表式一幣一行 | 無（可選一句） | 完成 | 無 |
| title | 稱號牌（既有稱號圖示） | 「稱號『新人王』」 | 新獲得 | 效果說明 | 授予者台詞 | 完成／前往查看（稱號） | 光暈（SR↑） |
| nameFragment | 小名碎片圖示 | 「小名『某某』碎片 +1」 | 首次／進度 n/m | 集滿進度 | 無 | 完成／前往查看（圖鑑） | 集滿一次：光暈 |
| skill | 戰法圖示 | 「習得 戰法名」 | 新習得 | 一行效果 | 師傅台詞 | 完成 | SR↑ 光暈 |

- 多種類型同一批時，**同批小項目（貨幣、一般物品、碎片）合併成「列表頁」**（mockup 情境 4）；人物與 SR↑ 單品獨立成頁。

### 14.4 排隊、合併與翻頁

1. 同一次 `show()` 的 grants 依序為：人物 → 稀有度高到低的物品／虎符／稱號 → 貨幣列表頁（合併）→ 小名碎片。多筆顯示左上「獲得　標題 **i/N**」，圓點指示；`下一筆` 逐頁，`全部收下` 直接收尾（**不略過任何帳目**，帳早已入）。
2. **合併規則**：同 `type+id` 疊加 qty；同幣別加總；同批所有 N／R 物品與貨幣組成一頁列表（上限 6 行，超過分頁）；人物、SR↑ 不合併。
3. **跨呼叫排隊**：全域單一佇列（FIFO）。面板開著時新的 `show()` 附加到佇列尾端並更新 N，不開第二面板；同 `grantKey` 重送忽略（防重）。
4. 戰鬥中不開面板：戰場內發的獎勵累積到結算頁一次呈現；全螢幕演出中（轉蛋、典禮）排在其後。
5. 返回鍵／點背景 = 看完當前頁（等同「完成」）；佇列清空後關閉並呼叫 `reward.ack`（僅標已讀）。

### 14.5 演出規則（短、可跳過、不拖慢）

| 條件 | 演出 | 時間 |
|---|---|---|
| isNew 的人物（武將／家臣／子嗣／配偶）或任何 SSR↑ | 稀有度色光暈（Graphics 放射漸層）＋框微縮放 0.92→1 | ≤0.6 秒 |
| UR／LR | 同上＋金色粒子一圈（用既有粒子組件、單次） | ≤0.6 秒（不得延長） |
| 其他（N／R／SR 物品、貨幣、碎片） | 無演出，立即顯示 | 0 |

- 點螢幕任意處＝跳過演出（直接到最終畫面），設定「一律快速」則全免；連續多筆新人物時，**第 2 筆起光暈縮為 0.3 秒**，避免十連堆疊拖時。
- 演出結束即釋放特效節點；不新增貼圖／音檔（音效走既有 `ui_get_*` 音效鍵，沒有就靜音）。

### 14.6 API

```ts
// shared/reward/RewardPresenter.ts（零 cc 依賴的佇列與合併邏輯）＋ ui/core/AcquirePanelController.ts（cc 端面板）
interface RewardPresenter {
  show(grants: AcquireGrant[], ctx: AcquireContext): Promise<void>;   // 面板全部看完（或全部收下）才 resolve
  showResult(result: RewardGrantResult, ctx?: Partial<AcquireContext>): Promise<void>; // = show(toAcquireGrants(result))
  pending(): number;                                                  // 佇列剩餘（供測試／Toast）
}
```

- 失敗不得吞獎：面板建構失敗／節點缺失 → 退回 Toast 單行「獲得 X」並記 log（沿用 §4 規則 6）。
- 與演出註冊表：`registerBuiltinPresentations` 的 `instant` sink 指向 `RewardPresenter.showResult`；`chest`／`gachaReveal` 等 module 的 `play()` 結尾呼叫 `RewardPresenter.showResult`（`chainPanel` 預設 true）。
- 伺服器：不新增命令。`reward.ack`（既有）標已讀；`reward.pending`（既有）登入補播。單機版以 `core/api/localserver/RewardCommands.ts` 提供同形資料。

### 14.7 台詞與性別參數

- `line.key` 為 i18n 鍵（四語系 zh-TW／zh-CN／en／ja），文案中**自稱、稱謂用佔位符**：`{self}`（自稱）、`{honor}`（對玩家稱謂）、`{sir}`（他稱）。由 `speakerId` 的 `gender` 解成對應詞：男＝某／俺／在下等（依性格）；**女＝妾身／本姑娘／奴家／我（依性格）**。
- **硬規則**：女角台詞不得出現「某」「在下」「俺」「咱家」等男性自稱；驗收以單元測試掃全部台詞鍵＋女角代入，違者失敗。台詞缺失 → 用 `acq.line.default.<type>`（無自稱的中性句），不留空。
- 台詞挑選優先序：事件／任務自帶台詞 > 武將個人台詞系統（共用快取，不為此新增生成呼叫）> 類型預設。**面板不呼叫 AI 生成**。

### 14.8 要改接的既有彈窗與保留特殊演出

| 現有出口 | 處置 | 說明 |
|---|---|---|
| 任務回報 `HallMissionReportStack`（PROG-2-9966） | **保留版面，資料與按鈕改走面板** | 風格基準。回報卡「獎勵行」改由 `AcquireGrant[]` 產生；季末「一疊」仍可逐張／全部略過，最後一張的獎勵彙整交面板 |
| 季報 `SeasonReportComposite` 的獎勵區 | 改走 | 結算獎勵以面板列表頁呈現，季報本體（財務、事件）不動 |
| 轉蛋 `GachaFlowCoordinator`／`DestinyOpeningController`／`GachaResultRanking` | **保留揭曉演出（`gachaReveal`）**，結束後接面板「本次共獲得」彙整（含重複卡轉換、碎片）；新卡走 isNew 光暈但**揭曉期間不重播光暈** | 十連結果頁（排名）保留；面板只補「入帳彙整」 |
| 寶箱／藏寶圖／骰子／轉盤（§3.4） | 保留各自演出，結尾串面板 | 不另做結算彈窗 |
| `ResultPopup`（戰後結果）的戰利品行 | 戰利品改走面板；勝敗結算本體保留 | 戰場專家負責，走訊息通知，本卡不改戰場 |
| 首年目標領獎 Toast（PROG-2-10062）、歷練格子拿寶、商店購買成功 | 改走 | 單筆小額可維持 Toast（`ctx.mode:'toast'`），≥SR 或人物一律面板 |
| 學府入學／畢業、結緣、子嗣誕生等人物新增 | 改走（isNew 光暈） | 人物新加入一律走面板，避免各畫面各自「恭喜」 |
| 劇情選項／事件給物 | 改走 | 事件效果帳本的 `item／currency／title／relation` 行轉 grants |
| 純數值變動（友誼 +6、聲望 +3 等 `relation／fame`） | **不走面板** | 仍用任務回報行內小字或 Toast；面板只管「得到東西」 |

### 14.9 版面、i18n 與主題

- 版面：單一圓角深色框（風格對齊任務回報：`FILL=(34,26,18)`、金邊、`TEXT/SUB` 色），框色隨稀有度；**全用錨點＋相對比例**（框寬＝容器寬 78%、上限 700；圖框 128 為最小觸控尺寸基準，直式時縱向堆疊），不寫死橫式 1920。
- i18n：所有文字走鍵（`acq.hd.*`、`acq.state.*`、`acq.btn.*`、`acq.line.*`），數字用佔位符；四語系補齊，寬度風險走 `ui-i18n-localize` 盤點。
- 主題可換：面板皮膚註冊為 UCUF 家族 `acquire`（框、底、按鈕、光暈色表可換）；季節／節慶整套換皮只改皮膚表，不動邏輯。
- 效能：一個面板節點＋一個光暈節點重用；翻頁只換 Sprite／Label 內容；列表頁用 6 行固定池。

### 14.10 實作卡切分（本卡只開一張，不做）

PROG-2-10102（實作）：①`shared/reward/RewardPresenter.ts`＋`toAcquireGrants`（純邏輯、佇列／合併／稀有度排序／性別台詞解析）＋單元測試；②`ui/core/AcquirePanelController.ts`＋UCUF `acquire` 家族三件＋四語系；③`instant` sink 改接；④改接清單 14.8 的前四項（任務回報、季報、轉蛋收尾、首年目標領獎），其餘列後續卡；⑤本機 adapter 回傳 pending 補播；⑥無頭 Chrome 實跑截圖（四情境）。

### 14.11 驗收清單

1. 全專案 grep：新增的獲得提示不再自造彈窗（白名單：轉蛋揭曉、典禮、戰場結算）。
2. 同一 `RewardGrantResult` 轉 grants 結果穩定（單元測試）：排序、合併、稀有度、溢出轉換、重複 `grantKey` 忽略。
3. 女角台詞掃描零「某／在下／俺」；缺台詞走預設鍵；四語系鍵齊全。
4. SSR 以上與新人物光暈 ≤0.6 秒且可跳過；一般物品／貨幣零演出；十連新人物不累積超時。
5. 多筆 1/N、全部收下、返回鍵＝完成；全部收下後帳目與直接逐頁看完一致。
6. 面板開著時再發獎勵 → 排入同一佇列不開第二面板；戰鬥中發獎延到結算。
7. 記憶體：面板節點數固定（與筆數無關）、無新增大圖；連跑 50 筆節點不增長。
8. 直式／手機橫式視窗下版面不破（錨點驗證）；換主題皮膚不改邏輯。
9. 轉蛋保留揭曉演出，結束後出現彙整頁；跳過揭曉不影響彙整。
10. 單機版（本機 adapter）與伺服器模式呼叫同一 `RewardPresenter.show`，結果一致。

### 14.12 待決（附建議）

- **Q-ACQ-1**：單筆小額（如一個普通物品）預設走面板還是 Toast？**建議**：N／R 單筆走 Toast（可點開）、SR↑與人物一律面板，避免連續獲得時一直被打斷。
- **Q-ACQ-2**：十連新人物的面板要不要逐位播？**建議**：揭曉演出已逐位，面板只出一頁「本次共獲得」列表，新人物以光暈小標標示。
