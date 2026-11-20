<!-- doc_id: doc_spec_1188 -->
# 劇情（演出）系統 Base 框架規格書

> 上層總綱：`共用框架總綱規格書.md (doc_spec_1182)`。本書是六套共用框架之一，正式名稱為「劇情（演出）系統」。
> 伺服器 API 與網路原則見總綱第 5 章（本書第 11 章只列本框架端點與 schema，不重複原則）。
> 相關框架：獎勵 (doc_spec_1186，給獎演出的選擇歸獎勵、播放歸本系統)、任務 (doc_spec_1185，任務劇情)、物品庫存 (doc_spec_1184)、技能 (doc_spec_1187，奧義演出)、商店 (doc_spec_1183)。
> 任務卡：PROG-2-9200（文件）。狀態：草案，待使用者裁決第 10 節選擇題。

## 1. 目的與範圍

使用者定案：劇情有很多種（歷史劇情、培育劇情、羈絆劇情、任務劇情、武將傳記劇情…），本質相同；而且「劇情」只是演出的一種用途，**其他系統也能呼叫演出**。因此本系統涵蓋整個**演出層**，不只是劇情文本：

- 對話（台詞、旁白、四語系）
- 立繪與 CG（表情、入退場、特寫）
- 鏡頭與轉場（推拉、震動、淡入淡出、翻頁）
- 音效與音樂（BGM、音效、語音）
- 漫畫式演出（分格、擬聲字、奧義漫畫）
- 選項（分支、後果）

兩層結構：
1. **劇本層（Script）**：節點、分支、觸發條件、旗標、選項後果、已看紀錄。
2. **演出層（Presentation）**：把劇本節點或其他系統的請求，用「演出模組」播放；演出模組可插拔。

**與獎勵系統「給獎演出」的分工（硬規定）：獎勵系統決定給什麼、用哪種演出；演出系統只負責播放。** 開寶（寶箱、藏寶圖、骰子、轉盤、自動走寶路）是本系統註冊的演出模組，由獎勵送出 `GrantPlan＋演出綁定`；演出不改變帳目（先結算、後演出）。

其他可呼叫演出的系統：戰場奧義與放招演出、學府期中／弱冠／結業典禮與打斷彈窗、勝敗結算演出、轉蛋抽卡演出、開場與新手引導、年終守城。

範圍外：文本內容的撰寫與生成（由劇情資料與 NPC 腦負責）、實際美術資產、戰場即時渲染。

## 2. 核心概念與名詞

- **劇本（StoryDef）**：由節點組成的圖，帶觸發條件、分類（歷史／培育／羈絆／任務／傳記／系統）。
- **節點（Node）**：一個演出單位：`scene`（一段演出指令序列）、`choice`（選項）、`branch`（條件分支）、`effects`（效果，交獎勵／任務／庫存）、`jump`、`end`。
- **演出指令（Cue）**：最小演出動作：`say`、`narrate`、`portrait`、`cg`、`camera`、`transition`、`sfx`、`bgm`、`comic`、`wait`、`shake`、`showChoice`、`callModule`。
- **演出模組（PresentationModule）**：可插拔的完整演出，如 `chest`、`treasureMap`、`dice`、`wheel`、`treasureRoad`、`gachaReveal`、`ultimateCutin`、`ceremony`、`popup`、`resultBanner`；由其他系統或劇本 `callModule` 呼叫。
- **儀式流程（MilestoneFlow）**：人生節點（周歲抓周、開蒙、入學、結業、及笄分流、生日事件）共用的流程：觸發（跨越檢查）→ 彈窗 → 選擇 → 結算 → 回寫。是本系統內建的流程模板。
- **演出佇列（InterruptQueue）**：多個劇本、儀式、彈窗同時觸發時的優先序與排隊；「必中斷」事件可插隊；處理完繼續。
- **已看紀錄（SeenLog）**：哪些劇本、節點、CG 看過，供回放、跳過、圖鑑解鎖。
- **旗標（Flag）**：劇情寫入的狀態，如「已見過某人」「選了某方針」；屬重要數值，由伺服器權威保存。

## 3. 共用資料結構（設定 JSON 草案）

### 3.1 劇本 `story-def.v1`

```json
{
  "schema": "story-def.v1",
  "id": "STORY_BIRTHDAY_05_JOY",
  "kind": "growth",
  "trigger": { "event": "child.ageCrossed", "when": { "all": [{ "ageBand": "3-6" }, { "flagNot": "story.seen.STORY_BIRTHDAY_05_JOY" }] } },
  "priority": 40,
  "interrupt": false,
  "skippable": true,
  "start": "n1",
  "nodes": {
    "n1": { "type": "scene", "cues": [
        { "cue": "bgm", "id": "bgm_home" },
        { "cue": "portrait", "who": "child", "pose": "smile", "enter": "left" },
        { "cue": "say", "who": "child", "textKey": "story.b05.line1" },
        { "cue": "showChoice", "choiceId": "c1" } ], "next": "c1" },
    "c1": { "type": "choice", "options": [
        { "id": "kind",   "textKey": "story.b05.opt_kind",   "next": "e_kind" },
        { "id": "strict", "textKey": "story.b05.opt_strict", "next": "e_strict" } ] },
    "e_kind":   { "type": "effects", "effects": [ { "kind": "reward", "ref": "BUNDLE_BIRTHDAY_KIND" }, { "kind": "flag", "set": "child.trait.gentle" } ], "next": "end" },
    "e_strict": { "type": "effects", "effects": [ { "kind": "reward", "ref": "BUNDLE_BIRTHDAY_STRICT" } ], "next": "end" },
    "end": { "type": "end" }
  }
}
```

節點 `effects` 與獎勵系統的效果種類同一套（`reward／flag／item／quest.spawn／skill.learn…`），不另造後果格式。

### 3.2 演出指令表（可擴充）

| cue | 參數 | 說明 |
|---|---|---|
| `say`／`narrate` | `who`、`textKey`、`voice?` | 對話、旁白；文字一律走 i18n key，不內嵌文字 |
| `portrait` | `who`、`pose`、`enter／exit`、`slot` | 立繪入退場與表情 |
| `cg` | `cgId`、`transition` | 全螢幕 CG |
| `camera` | `type`（push／pan／shake／focus）、`target`、`durationMs` | 鏡頭 |
| `transition` | `type`（fade／wipe／pageTurn）、`durationMs` | 轉場 |
| `sfx`／`bgm` | `id`、`volume`、`loop` | 音效與音樂 |
| `comic` | `sequenceId` | 漫畫式演出（分格序列，見 3.3） |
| `showChoice` | `choiceId` | 顯示選項 |
| `callModule` | `module`、`args` | 呼叫演出模組（開寶、奧義、典禮） |

### 3.3 漫畫式演出 `comic-sequence.v1`（奧義漫畫）

```json
{
  "schema": "comic-sequence.v1", "id": "ULT_ZHAOYUN",
  "panels": [
    { "image": "ult/zhaoyun_p1", "layout": "wide", "enterMs": 300, "holdMs": 500, "sfxText": { "textKey": "sfx.rush", "style": "burst" } },
    { "image": "ult/zhaoyun_p2", "layout": "tall", "enterMs": 200, "holdMs": 600, "shake": 0.4 }
  ],
  "skippable": true, "totalMaxMs": 2800
}
```

沿用現有 `assets/resources/data/ult-cutin/*.json` 與 `assets/scripts/shared/cutin/`（`cutinCore／cutinBurstGlow／cutinSupport`）；`totalMaxMs` 限制總長，避免打斷戰場節奏。

### 3.4 演出模組宣告 `presentation-module.v1`

```json
{ "schema": "presentation-module.v1", "id": "chest", "kind": "grant", "inputs": ["GrantPlan"],
  "skippable": true, "autoPlay": false, "fallback": "instant",
  "budget": { "maxAtlasKb": 512, "reuseNodes": true } }
```

`fallback`：模組缺失或資源載入失敗時退回的演出（預設 `instant`＝直接列出結果），不得吞掉結果。

### 3.5 已看紀錄與旗標

```json
{ "seen": { "STORY_BIRTHDAY_05_JOY": { "at": 1763650000000, "choice": "kind" } },
  "cgUnlocked": ["CG_OATH_PEACH"], "flags": { "child.trait.gentle": true } }
```

`seen` 與 `cgUnlocked` 屬 `clientOwned`（可補丁），但「看過」若會影響解鎖或獎勵，由伺服器在 `story.complete` 時寫入；`flags` 屬權威。

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

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見 `共用框架總綱規格書.md (doc_spec_1182)` 第 5 章；本章只列劇情端點。演出本身（動畫、音效、鏡頭）純屬客戶端表現，不經伺服器。

### 11.1 命令與查詢

| 名稱 | 類型 | 說明 |
|---|---|---|
| `story.available` | 查詢 | 目前可觸發的劇本（已依條件、優先序、佇列排序） |
| `story.start` | 命令（需 idemKey） | 開始劇本；伺服器登記並回傳節點圖與（需要時）本次隨機種子的衍生結果 |
| `story.choose` | 命令（需 idemKey） | 送出選項；伺服器結算後果（獎勵、旗標、任務、物品、技能）並回傳下一節點 |
| `story.complete` | 命令（需 idemKey） | 完成劇本；寫已看、解鎖 CG／圖鑑 |
| `story.flags` | 查詢 | 劇情旗標 |
| `story.markSeen` | 命令（clientOwned，可樂觀） | 僅標記已看（不產生後果的演出，如回放） |

### 11.2 Schema

```json
// story.choose 請求 args
{ "storyId": "STORY_BIRTHDAY_05_JOY", "choiceId": "c1", "optionId": "kind" }
// 回應 result
{ "next": "e_kind", "effects": [ { "kind": "reward", "grantId": "gr_0012", "settled": true }, { "kind": "flag", "set": "child.trait.gentle" } ],
  "presentation": [ { "module": "popup", "args": { "textKey": "story.b05.result_kind" } } ] }
```

### 11.3 伺服器權威欄位

觸發判定、劇本可否開始（條件與冷卻）、選項合法性、選項後果（獎勵、旗標、任務、物品、技能）、旗標寫入、完成與解鎖、隨機節點的抽選結果。客戶端傳入 `effects／flags／next` → `E103`。

### 11.4 錯誤碼（E7xx）

| 碼 | reason | 說明 |
|---|---|---|
| E701 | `STORY_NOT_FOUND` | 劇本不存在 |
| E702 | `NOT_TRIGGERABLE` | 條件不符或已看且不可重看 |
| E703 | `NOT_STARTED` | 未先 `start` 就 choose／complete |
| E704 | `INVALID_OPTION` | 選項不存在或不可選（條件） |
| E705 | `CHOICE_ALREADY_MADE` | 該選擇已做過（冪等命中回原結果） |
| E706 | `QUEUE_CONFLICT` | 與必中斷事件衝突，需先處理（附待處理劇本） |

### 11.5 推送事件

`story.available`（新劇情可觸發）、`story.flag`（旗標變更）、`story.interrupt`（必中斷事件，客戶端須插隊播放）。

### 11.6 遷移與相容

- 開場進度（`OpeningProgress`）、學府打斷（`pendingInterrupt`／`RESOLVE_INTERRUPT`，學府 doc_spec_1179）的現有狀態機即 `story.start／choose` 的特例；回放時以「先存後顯示」與重開自愈（重進後重新彈出未作答的打斷）對映本章的冪等與 `E705`。
- 舊存檔無劇情旗標與已看紀錄時以空值補；已完成的開場與舊事件視為已看，避免重播。
