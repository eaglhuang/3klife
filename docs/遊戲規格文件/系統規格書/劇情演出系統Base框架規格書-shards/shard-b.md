# 劇情演出系統Base框架規格書（分片索引） — 4–10 共用 API、包裝接入、依賴、遷移、實作卡、驗收、待決

> 這是 `劇情演出系統Base框架規格書.md` 的「4–10 共用 API、包裝接入、依賴、遷移、實作卡、驗收、待決」分片。完整索引見 `docs/遊戲規格文件/系統規格書/劇情演出系統Base框架規格書.md`。

## 4. 共用 API（介面草案，引擎中立；播放由 UI 實作）

```ts
interface IStoryService {                       // 劇本層（伺服器側邏輯，單機＝本機 adapter）
  available(ctx: StoryCtx): StoryTrigger[];                          // 目前可觸發的劇本（已排優先序）
  start(storyId: string, ctx: StoryCtx): StoryStartResult;           // 登記開始，回傳可播放的節點圖或起點
  choose(storyId: string, choiceId: string, optionId: string): StoryChooseResult;   // 選項後果由伺服器結算
  complete(storyId: string): StoryCompleteResult;                    // 寫已看、旗標、解鎖
  seen(storyId: string): SeenRecord | null;
}
interface IPresentationPlayer {                 // 演出層（客戶端）
  play(script: StoryScriptView | PresentationRequest): Promise<PlayResult>;
  registerModule(id: string, m: PresentationModule): void;           // 可插拔
  enqueue(req: PresentationRequest, priority: number, opts?: { interrupt?: boolean }): void;   // 演出佇列
  skip(): void; auto(on: boolean): void; readonly log: PresentationLog;
}
interface IMilestoneFlowRunner { run(def: MilestoneFlowDef, ctx: unknown): Promise<MilestoneResult>; }   // 儀式流程模板
```

規則：
1. **先結算、後演出**：選項後果（獎勵、旗標、任務、物品）一律先交伺服器結算，再回放演出；中斷、跳過、閃退不影響結果。
2. 劇情選項只送「我選了哪個」，後果由伺服器依 `story-def` 計算；客戶端不可自報後果。
3. 演出模組缺失時退回 `fallback`，並寫 error log，不阻擋流程（開發期可依專案規定改為拋錯）。
4. 演出佇列：優先序高者先播；`interrupt=true`（如年終守城、學府期中打斷）可中斷低優先演出並在處理完後回到原演出；同優先依觸發時間。
5. 手機記憶體：演出模組重用節點、少佔常駐圖集（沿用專案規則），`budget` 寫入宣告供檢查。
6. 文案一律 i18n key（四語）；資料不足時回空字串，不以模板句硬補（沿用 keep 共識：fallback 不是敘事腦）。

## 5. 各包裝如何只用差異設定接入

1. **開場與新手引導（開場信、宿命轉蛋、首戰教學）**：一份 `story-def`（`kind=system`）＋ `callModule: gachaReveal／popup`；流程控制器 (doc_spec_0470) 的順序即 `next`，進出條件即 `trigger.when`。
2. **學府打斷彈窗與結業典禮（doc_spec_1179，PROG-2-9190）**：期中方針三選一、弱冠戰法三選一、共鳴見證、結業確認＝四個 `MilestoneFlow` 實例（`interrupt=true`），`callModule: ceremony`，選項後果呼叫技能 `learn`／獎勵 `fixed`；現有 `showAcademyInheritDraw` 是其 `popup` 模組。
3. **子嗣歷練（doc_spec_1180）**：生日小事件、周歲抓周與開蒙儀式、事件卡文案與選項分支＝`story-def`（歷練規格 18.1 的「劇情」欄位 `storyId／choices／condition／speaker` 直接對映本書）；自動走寶路＝`callModule: treasureRoad`（獎勵綁定）。
4. **獎勵給獎演出**：獎勵送 `PresentationRequest{ module: "chest", grantPlan }`，本系統播放；開寶、藏寶圖、骰子、轉盤都是 `kind=grant` 的演出模組。
5. **戰場奧義演出**：技能施放送 `PresentationRequest{ module: "ultimateCutin", comicSequenceId }`；`totalMaxMs` 控制長度。
6. **季報市井奇遇、日報事件、羈絆與武將傳記**：`kind=growth／bond／biography` 的 `story-def`，文案來源可為靜態資料或 NPC 腦（見 Q1），選項後果交獎勵、任務。
7. **任務劇情**：任務定義的 `storyRef` 指向劇本；任務結算與劇情選項共用同一獎勵套件。

## 6. 與其他框架的依賴

- 依賴 **獎勵**（選項後果、`GrantPlan`）、**任務**（`quest.spawn`、任務劇情觸發）、**物品庫存**、**技能**（`skill.learn`）——全部經命令，不直接耦合。
- 被 **獎勵**（給獎演出）、**技能**（奧義演出）、**任務**、**商店**（商人劇情）、**學府、歷練、戰場** 呼叫。
- 與共用條件評估 `IConditionEvaluator` 共用觸發條件語言（總綱第 11 章）。

## 7. 現有程式盤點與遷移建議

| 現有實作 | 位置 | 可否抽成 base | 說明 |
|---|---|---|---|
| 開場流程與進度 | `core/systems/OpeningFlowController.ts`、`core/config/OpeningFlowConfig.ts`、`OpeningProgress.ts`、`NewPlayerOpening.ts`、`DestinyOpening.ts`、`OpeningLetter.ts`、`OpeningOffer.ts`；`ui/core/OpeningIntroController.ts`、`OpeningAct1Cues.ts`、`DestinyOpeningController.ts`、`ui/components/UIOpeningLetterPanel.ts` | 可，順序狀態機＝`story-def` 節點；`OpeningAct1Cues` 已是 cue 雛形 | 規格 doc_spec_0031、0470、0471、0618 |
| 對話 | `core/services/NpcDialogueService.ts`、`core/dialogue/NpcDialogueCache.ts`、`NpcMemoryAdapter.ts`、`core/systems/NpcDialogueHook.ts`、`LobbyDialogueProvider.ts`、`AptitudeDialogue.ts` | 文本產生屬 NPC 腦；播放走 `say` | 保留 NPC 腦 (doc_spec_0176) 為文案來源 |
| 日誌與日報 | `JournalEvents.ts`、`JournalLog.ts`、`JournalReaction.ts`、`GeneralJournalPeek.ts`；`ui/core/JournalHubController.ts`、`GeneralJournalController.ts`（doc_spec_0480、0481） | 事件條目與選項可抽為 `story-def`；日誌是已看紀錄的一種 | 武將日誌 doc_spec_0015 |
| 事件系統 | `EventSystem.ts`、`NurtureEvents.ts`、`RelationEvents.ts`、`SeasonPersonalityEvents.ts`、`GovernanceEvents.ts`、`HallMapEventMapper.ts`、`OfflineInteractionEvents.ts`；`assets/resources/data/hall-map/hall-map-events.json` | 觸發與條件可抽；效果交獎勵 | 季報市井奇遇 doc_spec_1171 |
| 羈絆與傳記 | `BondingStoryLines.ts`、`MercenaryBond.ts`、`MercenaryBondPermanent.ts`、`OverflowBond.ts`、`RivalBonding.ts`、`StoryStripCells.ts`、`BloodlineStoryDockLayout.ts` | 可 | 傭兵羈絆 doc_spec_0584、五格命運故事帶 doc_spec_0678 |
| 信件與信箱 | `FarewellLetterInbox.ts`（遺書進信箱） | 屬信箱候選（總綱第 11 章） | |
| 奧義演出 | `assets/scripts/shared/cutin/*`、`assets/resources/data/ult-cutin/*.json`、`battle/shared/SkillCastPresentation.ts`、`BattleSkillPresentation.ts`；美術規範 `美術-武將大招分鏡規範-01-交付與連貫.md`（doc_other_2703）及 02、03 | 可，即 `comic-sequence.v1` 與 `ultimateCutin` 模組 | 戰場專家負責其內容 |
| 各畫面自帶演出 | `ui/core/GachaFullScreenPanel.ts`、`GachaFlowCoordinator.ts`、`SeasonEventPopupController.ts`、戰場勝敗結算演出（PROG-2-9427）、學府打斷彈窗 | 轉為演出模組，統一進演出佇列 | 目前沒有共用演出佇列，彈窗各自疊放 |
| 彈窗卡片契約 | `assets/resources/ui-spec/contracts/dialog-card-content.schema.json` | 可作 `popup` 模組的內容契約 | |

遷移順序：(1) 先做 `IPresentationPlayer` 與演出佇列，把既有彈窗與給獎演出註冊為模組（不改外觀）；(2) 做 `story-def` 與 `IStoryService`，先遷開場與學府打斷（流程單純、已有規格）；(3) 日報、季報、羈絆、傳記事件條目逐批遷；(4) 奧義漫畫模組；(5) 與 NPC 腦對接文案來源。

## 8. 實作卡拆分建議（API 層排第一張，本框架 base 排第二張）

0. **前置 API-BASE**（總綱第 9 章）。
1. **STY-BASE**：`story-def／comic-sequence／presentation-module` 型別、`IStoryService`（劇本層純邏輯）、`IPresentationPlayer` 與演出佇列介面＋`instant／popup` 兩模組＋測試。
2. 儀式流程模板 `MilestoneFlow` 與學府打斷遷移。
3. 給獎演出模組（`chest`；與獎勵 RWD 卡同步），其後 `treasureRoad`、`treasureMap`、`dice`、`wheel`。
4. 開場與新手引導遷移。
5. 日報、季報、羈絆、傳記事件條目遷移。
6. 漫畫式奧義演出模組（與戰場專家對接）。

## 9. 驗收重點

- 新增一個劇情只加 JSON；新增一種給獎或奧義演出只加一個演出模組。
- 演出被跳過或中斷，旗標、獎勵、任務結果不變。
- 多個演出同時觸發時依優先序排隊，不互相覆蓋。
- 演出模組缺失時退回 `instant`，不遺失結果。

## 10. 待使用者決定的大方向（推薦項為第一個）

- **Q1 劇情文案來源：** A（推薦）靜態劇本 JSON 為主，NPC 腦只補「日報、閒談」類可丟棄的變化文案；B 重要劇情也由 NPC 腦即時生成；C 全部靜態。
- **Q2 演出是否可跳過：** A（推薦）預設可跳過，第一次看的劇情與重大儀式（結業、及笄）不可跳過第一次；B 全部可跳過；C 全部不可跳過。
- **Q3 已看紀錄是否上傳伺服器：** A（推薦）上傳（換機可保留回放與圖鑑）；B 只存本機。
- **Q4 漫畫式奧義演出的長度上限：** A（推薦）單次 ≤ 2.8 秒、可設定關閉；B ≤ 4 秒；C 不限制。（涉及戰場節奏，戰場核心規則請先問使用者）
- **Q5 演出佇列是否由本系統獨占管理所有彈窗：** A（推薦）是，所有彈窗與演出都進同一佇列；B 只管劇情與給獎演出，其他彈窗維持現狀。
