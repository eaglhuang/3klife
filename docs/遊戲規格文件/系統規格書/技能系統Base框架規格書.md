<!-- doc_id: doc_spec_1187 -->
# 技能系統 Base 框架規格書

> 上層總綱：`共用框架總綱規格書.md (doc_spec_1182)`。本書是六套共用框架之一。
> 伺服器 API 與網路原則見總綱第 5 章（本書第 11 章只列本框架端點與 schema，不重複原則）。
> 相關框架：物品庫存 (doc_spec_1184，技能書、戰法筆記)、獎勵 (doc_spec_1186，習得技能是一種獎勵效果)、任務 (doc_spec_1185)、劇情（演出）(doc_spec_1188，奧義演出)、商店 (doc_spec_1183)。
> 任務卡：PROG-2-9200（文件）。狀態：草案；戰場核心規則不在本書範圍內定案，只抽共通骨架。

## 1. 目的與範圍

使用者定案：人物技能、戰場技能、培育技能、家族技能、個人天賦，都屬於技能系統。

範圍內：技能定義與分類標籤、學習與升級、槽位與配置、觸發（主動、被動、自動、條件）、效果（由註冊的效果 handler 解算）、冷卻與消耗（TP、SP、精力）、技能來源（血脈、教官、虎符、種子、天賦）、持續狀態效果（Buff／Debuff，含以「季」為單位的持續效果）。
範圍外（戰場核心規則）：戰場的五路對撞、站位與移動、傷害公式本體屬戰場專家負責；本書只定「技能怎麼被定義、學、裝、觸發、消耗」的共通骨架，效果解算仍由戰場端註冊的 resolver 執行。改動核心規則需先問使用者。

## 2. 核心概念與名詞

- **技能定義（SkillDef）**：靜態資料；沿用現有 `tactic-library.json`（戰法庫）與 `BattleSkillProfile`（戰場數值設定）。
- **技能類別（domain）**：`battle`（戰場戰法、奧義）／`nurture`（培育技能、學府）／`career`（職業屬性、專長）／`clan`（家族奧義）／`talent`（個人天賦，被動常駐）／`general`（人物通用技能）。
- **標籤（tags）**：火計、水計、突擊、控制、治療…，供天氣強約束、AI 選技、克制查詢使用。
- **技能持有（SkillHolding）**：某人學會哪些技能、等級、熟練度、來源。
- **配置（Loadout）**：帶上戰場／啟用的技能清單，容量依智力等條件決定（現行上限 4）。
- **觸發（Trigger）**：`activeCast` 主動施放／`passive` 被動常駐／`auto` 自動施放（AI 或天賦節奏）／`onEvent` 事件觸發（受擊、擊殺、回合開始）／`inspired` 靈感觸發（教官戰法）。
- **消耗（Cost）**：TP（戰法點）、SP、精力、冷卻回合、次數（每場一次、一生一次）。
- **狀態效果（StatusEffect）**：技能產生的持續效果；持續單位可為「回合／秒」（戰場）或「季」（培育、催長）。

## 3. 共用資料結構（設定 JSON 草案）

### 3.1 技能定義 `skill-def.v1`

```json
{
  "schema": "skill-def.v1",
  "id": "tactic-cavalry-shock",
  "domain": "battle",
  "nameKey": "skill.tactic-cavalry-shock.name",
  "category": "charge",
  "tags": ["charge", "cavalry"],
  "rarity": "epic",
  "source": { "type": "seed-tactic", "geneIds": ["gene_cavalry", "gene_charge"] },
  "learn": { "tpThresholdMul": 2, "needs": [{ "aptitude": { "scope": "troop", "key": "CAVALRY", "minGrade": "A" } }], "guarantee": null },
  "levels": [ { "lv": 1, "effectRef": "profile:zhao-yun-pierce", "cost": { "tp": 30 } } ],
  "trigger": { "mode": "activeCast", "targetMode": "line", "timing": "active-cast", "conditions": [{ "kind": "troopType", "allowed": ["cavalry"] }] },
  "cost": { "tp": 30, "sp": 0, "energy": 0, "cooldownTurns": 0, "uses": null },
  "effect": { "kind": "projectedDamage", "params": { "coefficient": 1.2, "scalingStat": "str" } },
  "presentation": { "castKey": "cast.charge", "ultimate": false }
}
```

### 3.2 技能持有與配置 `skill-holding.v1`

```json
{
  "holder": { "kind": "general", "id": "g_zhaoyun" },
  "skills": [ { "skillId": "tactic-cavalry-shock", "level": 1, "xp": 0, "learnedFrom": "inspired", "learnedAt": 1763650000000 } ],
  "loadouts": { "battle": ["tactic-cavalry-shock", "tactic-x"] },
  "talents": ["talent-brave"]
}
```

### 3.3 持續狀態效果 `status-effect.v1`

```json
{
  "schema": "status-effect.v1", "id": "FOOD_GROWTH_BOOST", "domain": "nurture",
  "durationUnit": "season", "duration": 4,
  "stack": { "mode": "refresh", "max": 1 },
  "frozenWhen": ["academy.active"],
  "modifiers": [ { "target": "childGrowthRate", "op": "mul", "value": 1.2 } ],
  "tags": ["food", "growth"]
}
```

歷練規格 18.3 候選 `SeasonEffect`（持續數季的狀態效果：母乳、乳母、時光藥水、食物催長、學府增益）歸入本框架的 `status-effect`：來源、強度、持續季數、疊加規則、凍結時不遞減都是此結構的欄位，與戰場 buff 同一定義、不同 `durationUnit`。

## 4. 共用 API（介面草案，引擎中立）

```ts
interface ISkillService {
  list(holder: HolderRef, filter?: SkillFilter): SkillHolding;
  canLearn(holder: HolderRef, skillId: string, ctx: LearnCtx): LearnCheck;      // TP 門檻、智力槽位、適性、來源條件、保底
  learn(holder: HolderRef, skillId: string, source: string): LearnResult;        // 扣點、寫持有、可能觸發獎勵事件
  upgrade(holder: HolderRef, skillId: string): UpgradeResult;
  equip(holder: HolderRef, domain: string, skillIds: string[]): EquipResult;     // 配置；容量與衝突檢查
  castCheck(holder: HolderRef, skillId: string, ctx: CastCtx): CastCheck;        // 可用性與灰化原因（天氣、TP、冷卻）
  applyStatus(target: HolderRef, effectId: string, source: string, durationOverride?: number): StatusResult;
  tickStatus(clock: ClockTick): StatusTickResult;                                // 回合／季推進，凍結規則
}
interface ISkillEffectRegistry {                                                   // 沿用 BattleSkillResolverFactory
  register(effectKind: string, resolver: SkillEffectResolver): void;
}
interface ISkillSourceAdapter {                                                    // 沿用 BattleSkillSourceTranslator 與各 TacticAdapter
  sourceType: string; translate(raw: unknown): SkillDef;
}
```

規則：
1. 戰場施放中的即時解算（命中、傷害、移動）留在戰場端 resolver，使用 `shared/skill-runtime.ts` 的 `BattleSkillRequest／SkillExecutionResult` 契約；本框架只負責「學、裝、可否施放、消耗扣除、持續效果」。
2. 新增技能只需 JSON；新增一種效果種類才需註冊 resolver。
3. 技能來源（血脈、教官、虎符、種子、天賦）以 `ISkillSourceAdapter` 轉成 `skill-def`，不在核心寫 if。
4. 條件判斷與商店、任務、劇情共用 `IConditionEvaluator`（總綱第 11 章候選）。

## 5. 各包裝如何只用差異設定接入

1. **戰場戰法（虎符、教官、血脈戰法）**：`domain=battle`，`trigger.mode=activeCast`，數值進 `effect.params`；教官靈感戰法為 `trigger.mode=inspired`，TP 消耗與綠色因子折半寫在 `cost`／`modifiers`。對應 `tactic-library.json`、`TigerTallySpecTactics`、`InspiredTacticMap`。
2. **培育技能（學府）**：`domain=nurture`，學習由學府流程呼叫 `learn`；弱冠戰法三選一是一次 `learn` 的候選清單（學府 doc_spec_1179 打斷彈窗）。
3. **個人天賦**：`domain=talent`，`trigger.mode=passive` 或 `auto`（天賦戰法自動施放節奏 doc_spec_0360），只有 `modifiers`，沒有消耗。
4. **家族奧義**：`domain=clan`，`learn.needs` 為血脈階級與世代條件，`uses=oncePerLife`（一生一次），演出為奧義演出（劇情演出系統）。
5. **職業屬性與專長（歷練 doc_spec_1180 §18.1）**：`domain=career`，`kind=career／specialty`，`value` 0~100 與 `cap`，加成表 `careerEffects` 即 `modifiers`。
6. **季級催長效果（母乳、乳母、時光藥水、食物）**：`status-effect`，`durationUnit=season`，與家業的食物系統（doc_spec_1181）共用。

## 6. 與其他框架的依賴

- 依賴 **物品庫存**（技能書、戰法筆記為 ItemDef，學習消耗經 `apply`）。
- 依賴 **獎勵**（`tacticLearn` 效果類型）；被 **獎勵、任務、劇情** 呼叫習得技能。
- 與 **劇情演出**：奧義與放招演出由演出系統播放，技能只送演出請求。
- 共用條件評估（總綱第 11 章候選）。

## 7. 現有程式盤點與遷移建議

| 現有實作 | 位置 | 可否抽成 base | 說明 |
|---|---|---|---|
| 戰場契約（現況只有此一套） | `assets/scripts/shared/SkillRuntimeContract.ts`（`SkillSourceType` 六來源，偏戰場） | 可擴充：加 `domain` 與 `modifier` 欄位，使專長、職業、家風、天賦可用（家業規格 doc_spec_1181 §3.1、B5 卡） | 人物、培育、家族技能與個人天賦目前沒有同一套 |
| 戰法庫與標準定義 | `assets/resources/data/master/tactic-library.json`（28 筆）；`shared/skill-runtime.ts`（`CanonicalTacticDefinition`、`BattleSkillDefinitionDraft`） | 可，即 `skill-def.v1` 戰場域 | 已有 client／server 共用契約（`server/dist` 內已含），最適合先抽 |
| 戰場技能設定與解算 | `battle/skills/BattleSkillProfiles.ts`（722 行）、`BattleSkillResolverFactory.ts`、`resolvers/*`（Buff、Control、Counter、Discord、Dot、Heal、Link、Morale、Projected、Push、Reset…）、`BattleSkillDispatcher.ts` | **保留為效果 resolver 註冊表**，不動核心 | 屬戰場核心，只對映到 `ISkillEffectRegistry` |
| 技能來源轉換 | `battle/skills/adapters/*`（Bloodline、Mentor、Seed、TigerTally） | 可，即 `ISkillSourceAdapter` | 已是轉接器型態 |
| 學習與配置 | `core/systems/TacticLearning.ts`（門檻＝TP×2、封鎖原因）、`TacticLoadout.ts`（上限 4、依智力）、`TacticRandomization.ts`、`LuckTacticCopy.ts`、`FactorTacticLinkage.ts` | 可，`learn／equip` | 現為純函式，缺持有與存檔介面 |
| TP 與發動率 | `TacticCastTpCost.ts`（TP 上限 100、下限 10、綠色折半）、`TacticTriggerRate.ts`、`TacticCondition.ts` | 可，`cost` 與 `trigger.conditions` | 數值直接進設定 |
| 戰場 AI 選技 | `battle/shared/AiTacticDecision.ts`、`TacticAiRules.ts`、`EnemyTactic*` | 屬戰場，保留 | 讀 `skill-def` 的 tags／cost |
| 戰法展示 | `shared/BattleSkillPresentation.ts`、`QuickViewSkillLines.ts` | 保留為演出資料 | 轉為 `presentation` 欄位 |
| 天賦、職業、專長、家族奧義 | 散在 `GameSession`、`FactorTacticLinkage` 與規格（doc_spec_0360、0558、0614） | 需新建持有結構 | 目前沒有統一持有存檔 |

以上程式位於 `assets/scripts/`（`core/systems`、`battle/skills`、`battle/shared`、`shared`）。

既有規格：戰法系統（doc_spec_0038 主檔 `戰法系統.md` 與分片）、戰法場景（`戰法場景規格書.md`）、四類技能原型 (0614)、場景戰法 JSON (0368)、虎符專屬戰法 (0365)、教官支援卡被動 (0318)、戰法學習 TP 門檻 (0558)、戰法 TP 消耗 (0344)、天賦戰法自動施放 (0360)、戰法 AI 選技 (0367)。

遷移順序：(1) 以 `shared/skill-runtime.ts` 契約為底，建 `skill-def.v1` 與 `ISkillService`；(2) `TacticLearning／TacticLoadout` 改為 `learn／equip` 並加持有存檔；(3) 技能來源 adapter 對映；(4) 天賦、職業、專長補持有；(5) `status-effect` 與季級效果；(6) 戰場端不動，僅讀取。

## 8. 實作卡拆分建議（API 層排第一張，本框架 base 排第二張）

0. **前置 API-BASE**（總綱第 9 章第 1 張）。
1. **SKL-BASE**：`skill-def／skill-holding／status-effect` 型別、`ISkillService`（learn／equip／castCheck／status）純邏輯＋測試，不碰戰場 resolver。
2. 持有存檔與 `skill.*` 命令（本機 adapter）。
3. 學習與配置遷移（TacticLearning／Loadout）。
4. 季級狀態效果（催長、食物、學府增益）。
5. 天賦、職業、專長、家族奧義持有。
6. 戰場讀取介面（戰場專家負責，不在本框架卡內）。

## 9. 驗收重點

- 新增一個戰法或天賦只改 JSON。
- 學習、配置、消耗都經 `ISkillService`；沒有直接寫武將戰法欄位。
- 戰場既有解算結果在遷移前後一致（回歸測試）。

## 10. 待使用者決定的大方向（推薦項為第一個）

- **Q1 持續狀態效果歸屬：** A（推薦）併入技能系統的 `status-effect`，戰場 buff 與季級效果同一定義、不同持續單位；B 獨立成「狀態效果」框架；C 戰場 buff 與季級效果各自維持。
- **Q2 技能等級與熟練度（涉及戰場平衡）：** A（推薦）戰法不分等級、天賦與職業有等級（沿用現況）；B 全部技能都有等級；C 全部沒有。
- **Q3 配置容量規則：** A（推薦）沿用「依智力決定、上限 4」；B 依官職決定；C 固定 4。
- **Q4 家族奧義「一生一次」是否算技能：** A（推薦）算，`uses=oncePerLife`；B 另開「奧義」框架。
- **Q5 技能書是否可交易（商業化）：** A（推薦）可在商店購買、不可轉讓；B 不可買，只能獲得；C 可轉讓。

## 11. 伺服器 API

> 共通封包、冪等、權威、同步、存檔原則見 `共用框架總綱規格書.md (doc_spec_1182)` 第 5 章；本章只列技能端點。

### 11.1 命令與查詢

| 名稱 | 類型 | 說明 |
|---|---|---|
| `skill.list` | 查詢 | 某持有者的技能、配置、狀態效果 |
| `skill.canLearn` | 查詢 | 學習可否（含不可原因與缺口） |
| `skill.learn` | 命令（需 idemKey） | 學習；扣 TP／物品由伺服器處理 |
| `skill.upgrade` | 命令（需 idemKey） | 升級 |
| `skill.equip` | 命令 | 調整配置（可樂觀更新，失敗回滾） |
| `skill.castCheck` | 查詢 | 施放可用性預覽（灰化原因）；**戰場實際施放與解算由戰場結算命令核驗，不經此端點** |
| `skill.useUltimate` | 命令（需 idemKey） | 一生一次類奧義的使用登記（消耗次數） |

### 11.2 Schema

```json
// skill.learn 請求 args
{ "holder": { "kind": "general", "id": "g_zhaoyun" }, "skillId": "tactic-cavalry-shock", "source": "inspired", "choiceOf": ["tactic-a", "tactic-b", "tactic-c"] }
// 回應 result
{ "learned": true, "skill": { "skillId": "tactic-cavalry-shock", "level": 1 }, "spent": { "tp": 60 }, "guaranteeUsed": false }
```

### 11.3 伺服器權威欄位

可學判定（TP 門檻、智力槽位、適性、保底、前置）、TP 與次數扣除、配置容量、技能等級與熟練度、狀態效果的疊加與到期、一生一次類次數、靈感觸發與弱冠候選的隨機結果。客戶端傳入 `level／spent／result` → `E103`。

### 11.4 錯誤碼（E6xx）

| 碼 | reason | 說明 |
|---|---|---|
| E601 | `INVALID_SKILL` | 技能不存在 |
| E602 | `ALREADY_LEARNED` | 已學會 |
| E603 | `TP_SHORT` | TP 不足門檻 |
| E604 | `NO_SLOT` | 智力槽位不足 |
| E605 | `APTITUDE_UNMET` | 適性或前置不符 |
| E606 | `NOT_INSPIRED` | 尚未取得靈感／來源資格 |
| E607 | `LOADOUT_FULL` | 配置已滿或衝突 |
| E608 | `USES_EXHAUSTED` | 次數用盡（一生一次、每場一次） |
| E609 | `CAST_BLOCKED` | 天氣、冷卻等不可施放（預覽用） |

沿用現有 `TacticLearnBlock`（`INVALID_TACTIC／NOT_NURTURING／NOT_GRADUATING／NOT_INSPIRED／ALREADY_LEARNED／TP…`）作為 `reason`。

### 11.5 推送事件

`skill.changed`（學習、升級、配置）、`skill.status.applied／expired`、`skill.inspired`（獲得靈感）。

### 11.6 遷移與相容

- `shared/skill-runtime.ts`（`SkillSourceType`、`BattleSkillTargetMode`、`SkillExecutionResult`）已是 client／server 共用契約，本章不改其簽章，只在外面加 `skill.*` 命令。
- 武將存檔內的戰法欄位維持現狀，新增 `skills` 持有結構時缺值補預設。
