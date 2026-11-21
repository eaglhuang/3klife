# 劇情演出系統Base框架規格書（分片索引） — 1–3 目的、核心概念、共用資料結構

> 這是 `劇情演出系統Base框架規格書.md` 的「1–3 目的、核心概念、共用資料結構」分片。完整索引見 `docs/遊戲規格文件/系統規格書/劇情演出系統Base框架規格書.md`。

<!-- doc_id: doc_spec_1258 -->
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
