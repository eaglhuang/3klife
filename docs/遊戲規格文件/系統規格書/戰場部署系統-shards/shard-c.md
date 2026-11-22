<!-- doc_id: doc_spec_1301 -->
# 戰場部署系統（分片索引） — G–K 劇本、字串、Data Schema、名詞定義、特殊戰場環境與格子補充

> 這是 `戰場部署系統.md` 的「G–K 劇本、字串、Data Schema、名詞定義、特殊戰場環境與格子補充」分片。完整索引見 `docs/遊戲規格文件/系統規格書/戰場部署系統.md`。

## G. 劇本相關

| 情境 | 劇本需求 |
|---|---|
| 兵力不足 | 「軍勢不足，無法派出 {TroopName}。」 |
| 糧草不足 | 「糧草不足，無法派出 {TroopName}。」 |
| 場上部隊已滿 | 「場上部隊已滿，請先等待退場或撤回部隊。」 |
| 改派建議 | 「可改派低耗部隊：{TroopName}。」 |
| 參謀官支援 | 「參謀官 {GeneralName} 籌策完畢，計謀點上限 +{Value}！」 |
| 後勤官支援 | 「後勤官 {GeneralName} 押運補給，軍糧上限 +{Value}！」 |
| 委任 AI | 「{GeneralName} 接管指揮權——委任自動出兵。」 |
| 糧草耗盡 | 「糧草耗盡……無法再出兵！」 |

---

## H. 字串內容相關

| Key | 預設值 | 備註 |
|---|---|---|
| UI_FOOD_COST | 「糧草 -{Cost}」 | 部署消耗提示 |
| UI_TROOP_COST | 「軍勢 -{Cost}」 | 部署兵力提示 |
| UI_TROOPS_SHORT | 「⚠ 軍勢不足」 | 部署禁用提示 |
| UI_FIELD_LIMIT_FULL | 「⚠ 場上部隊已滿」 | 部署禁用提示 |
| UI_DEPLOY_SUGGESTION | 「可改派：{TroopName}」 | 改派建議 |
| UI_STRATEGIST_SUPPORT | 「參謀官 {GeneralName}：計謀上限 +{Value}」 | |
| UI_DEPUTY_SUPPORT | 「後勤官 {GeneralName}：軍糧上限 +{Value}」 | |
| UI_DELEGATE_AI | 「委任 {GeneralName} 自動指揮」 | |
| UI_FOOD_EMPTY | 「⚠ 糧草耗盡！」 | |
| UI_SUPPORT_ROLE_LOCK | 「同一武將不可同時擔任兩個出征角色」 | |

---

## I. Data Schema 需求

### 本機端 (Client)

```json
{
  "Sortie_Loadout": {
    "Commander_UID": "G501",
    "Strategist_UID": "G188",
    "Deputy_UID": "G233",
    "Strategist_Max_Tactic_Bonus": 18,
    "Strategist_Start_Tactic_Bonus": 9,
    "Deputy_Food_Cap_Bonus": 1200
  },
  "Battle_Deploy_State": {
    "Current_Food": 9700,
    "Max_Food": 13200,
    "Current_Tactic_Points": 21,
    "Max_Tactic_Points": 48,
    "Sortie_Troop_Pool_Max": 8000,
    "Sortie_Troop_Pool_Current": 7000,
    "Field_Unit_Limit": 4,
    "Field_Unit_Count": 2,
    "Elite_Deploy_Cap": 4,
    "Active_Elite_Count": 2,
    "Scene_Preset_ID": "SCENE_NIGHT_RAID",
    "Reserved_Tally_Bands": ["SSR", "UR"],
    "Strategist_UID": "G188",
    "Deputy_UID": "G233",
    "Delegate_AI_Active": false,
    "Militia_Deployed": 2,
    "Elite_Deployed": 5
  }
}
```

### Server 端

| 欄位 | 型別 | 說明 |
|---|---|---|
| player_id | VARCHAR(32) FK | 玩家 |
| battle_id | VARCHAR(32) PK | 戰鬥 ID |
| commander_uid | VARCHAR(32) FK | 本場主將 |
| strategist_uid | VARCHAR(32) FK NULL | 本場參謀官 |
| deputy_uid | VARCHAR(32) FK NULL | 本場後勤官 |
| food_spent | INT | 本場消耗糧草 |
| sortie_troops_max | INT | 本場出征軍勢上限 |
| troops_lost | INT | 本場戰損兵力 |
| troops_returned | INT | 本場返還兵力 |
| food_cap_bonus | INT | 後勤官帶來的軍糧上限加成 |
| tactic_cap_bonus | INT | 參謀官帶來的計謀點上限加成 |
| tactic_start_bonus | INT | 參謀官帶來的開局計謀點加成 |
| elite_cap | TINYINT | 本場精銳部署上限 |
| militia_count | INT | 普通小兵部署次數 |
| elite_count | INT | 精銳部署次數 |
| scene_preset_id | VARCHAR(32) | 套用的場景 / Tile preset |
| delegate_used | BOOLEAN | 是否使用委任 AI |

---

## J. 名詞定義

| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 糧草即時扣除 | Food_Deploy_Cost | 每部署一組兵扣除對應糧草，取代傳統 DP 系統 |
| 出征軍勢 | Sortie_Troop_Pool | 本場可分批投入的兵力池 |
| 投入兵力 | Unit_Troop_Cost | 部署一支部隊時扣除的出征軍勢 |
| 返還兵力 | Returned_Troops | 部隊退場或戰鬥結束時回到軍勢池的剩餘兵力 |
| 戰損兵力 | Lost_Troops | 投入兵力扣除返還兵力後的損耗，戰後回扣城市兵源 |
| 出征編制 | Sortie_Loadout | 戰前選定主將 / 參謀官 / 後勤官的正式配置 |
| 參謀官支援 | Strategist_Support | 由參謀官提供的計謀點上限與開局補點加成 |
| 後勤官補給 | Deputy_Supply_Bonus | 由後勤官提供的軍糧上限與開局補給加成 |
| 改派建議 | Deploy_Suggestion | 原目標不可部署時，UI 推薦玩家可主動改派的低耗部隊 |
| 普通小兵 | Militia | 低耗基礎單位，攻防為精銳的 40%，無特殊能力 |
| 委任 AI | Delegate_AI | 根據武將智力品質自動決定部署策略的自動戰鬥系統 |
| 精銳部署上限 | Elite_Deploy_Cap | 戰場同時可維持的精銳 / 特殊兵 / 器械數量上限 |
| 保留槽 | Reserve_Slot | AI 或規則預留給高價值虎符兵、攻城器械的部署容量 |
| 場景預設 | Scene_Preset_ID | 場景戰法注入到戰場時所套用的 Tile-State preset 識別碼 |
| 角色鎖 | Command_Role_Lock | 同一武將不得在同一場 battle 同時擔任主將、參謀官或後勤官兩個以上角色 |

---

## K. 特殊戰場環境與模組化格子補充

> **整併來源**：戰場互動矩陣與養成動力.md (doc_spec_0091)、夜襲戰場視覺規格提案.md (doc_spec_0078)、模組化戰場系統開發策略.md (doc_spec_0089)
> **衝突處理**：本章是在現行 5×8 棋盤、糧草與精銳部署上限體系之上疊加環境變體，不改動主戰場的基本回合框架。
> **完整規格**：場景戰法（Scene Gambit）與格子戰法（Tile Tactic）的完整定義、觸發流程、交互規則，請見 **戰法場景規格書.md (doc_spec_0039)**。

### 戰場環境的正式定位

- 戰場特殊玩法不應靠另做一張完全獨立的棋盤系統，而應透過「格子狀態 + 任務變數 + 視覺主題」在同一個 5×8 基礎上切換。
- **場景戰法**（Scene Gambit）由高 INT 參謀官在戰場外發動成功後，進入戰鬥時載入預繪靜態背景 + 預設 Tile-State 佈局。場景背景是畫死的，不可動態切換。
- **格子戰法**（Tile Tactic）是武將在戰場上消耗 TP 施放的即時技能，僅在指定格子上疊加特效（如火攻幾格、落石幾格、暴風幾格），不改變背景。
- **格子 buff 視覺（使用者 2026-11-22 裁決）**：
  - 格子本身平時只留**靜態淡光圈加小圓章**，不做常駐動態特效。
  - 部隊「吃到」buff 的那一刻，在**部隊腳下**播放大特效，**循環 2.5 秒後消失**。
  - **舊的格子特效全部刪除**（含常駐動畫與舊 buff 特效資源／程式引用），不並存。
  - 此條只管 buff 格（攻／命等增益）；火格、落石等格子戰法特效（上條）不受影響。
- 夜襲、火攻、圍堵等只是場景變體，不可覆蓋主規則中的出征軍勢、糧草、場上部隊上限、改派建議與 sortie support 邏輯。

### 已規劃的 6 種場景戰法

| 場景 ID | 場景名稱 | INT 門檻 | 預繪背景風格 | 核心玩法 |
|---|---|---|---|---|
| SCENE_FOREST_AMBUSH | 森林埋伏戰 | ≥ 75 | 冷色夜戰密林 | 陷阱抓捕、隱身伏擊 |
| SCENE_NIGHT_RAID | 夜襲作戰 | ≥ 70 | 月光營帳群 | 佔領營帳、夜間暴擊 |
| SCENE_CANYON_ROCK | 峽谷落石戰 | ≥ 65 | 險峻峽谷 | 落石傷害、路線封鎖 |
| SCENE_FLOOD | 水淹七軍戰 | ≥ 80 | 深藍水體渡河 | 水流推移、適性削弱 |
| SCENE_FIRE_RAID | 火燒偷襲戰 | ≥ 75 | 暗暖橘色火場 | 火焰蔓延、物資掠奪 |
| SCENE_SIEGE | 攻城戰 | ≥ 60 | 城牆護城河 | 器械攻城、城牆地利 |

### Tile-State 模組分類

| 模組 | 代表功能 | 典型戰場 |
|---|---|---|
| Normal Tile | 一般移動與接戰 | 標準遭遇戰 |
| Hazard Tile | 進入或停留時受傷害 | 火燒 / 落石 |
| Force-Move Tile | 強制推移、退後、滑移 | 水淹 / 潮汐 |
| Stealth Tile | 隱匿、伏擊、陷阱 | 森林埋伏 / 夜襲死角 |

### Tile-State preset 權威表

| Preset_ID | 對應場景 | 組成重點 | 對部署的直接影響 |
|---|---|---|---|
| `SCENE_FOREST_AMBUSH` | 森林埋伏戰 | 高比例 `STEALTH` + 陷阱 `HAZARD` | 優先保留機動與伏擊單位，低視野不鼓勵早交遠程精銳 |
| `SCENE_NIGHT_RAID` | 夜襲作戰 | `STEALTH`、營帳目標、局部火源 `HAZARD` | AI 應保留高爆發虎符兵給營帳與主將擊殺窗口 |
| `SCENE_CANYON_ROCK` | 峽谷落石戰 | 固定落石 `HAZARD` + 路線封鎖 | 精銳部署以耐打前排與擊退單位優先 |
| `SCENE_FLOOD` | 水淹七軍戰 | 大量 `FORCE_MOVE` + 深水 `HAZARD` | 優先水戰 / 位移抗性單位，減少低適性騎兵投入 |
| `SCENE_FIRE_RAID` | 火燒偷襲戰 | 可蔓延 `HAZARD` + 局部 `STEALTH` | 高火抗與高機動單位優先，避免把低韌性精銳一次壓上 |
| `SCENE_SIEGE` | 攻城戰 | 城牆阻隔、護城河 `HAZARD`、器械通道 | 啟用器械保留槽，保證攻城器械不被一般精銳擠掉 |

- 模組化棋盤的正式原則是「**同一張 5×8 棋盤 + 不同 preset**」，而不是為每種場景再做一套新棋盤系統。
- `scenePresetId` 只控制格子狀態、部署權重與目標物件，不改動本系統的出征軍勢、糧草、場上部隊上限、改派建議與 sortie support 主規則。

### 養成與戰場互動矩陣

- 高機動角色更適合切後排、繞背與利用 Force-Move 地圖。
- 高力量角色更適合擊退、破陣與把敵方推入 Hazard Tile。
- **高智力角色**更適合觸發場景戰法（Scene Gambit），放大場外軍事任務的範圍與成功率。
- 高意志 / 韌性角色更適合抵抗地圖型 Debuff 與特殊環境懲罰。
- 高運勢角色更適合承接掠奪、寶物與事件型戰利品掉落。


---