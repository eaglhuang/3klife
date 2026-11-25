<!-- doc_id: doc_spec_1300 -->
# 戰場部署系統（分片索引） — F 公式相關

> 這是 `戰場部署系統.md` 的「F 公式相關」分片。完整索引見 `docs/遊戲規格文件/系統規格書/戰場部署系統.md`。

## F. 公式相關

### F-0. 兵源鏈與部署合法性

```typescript
// 城市兵源由治理產出；不是總人口，也不在戰中直接扣人口。
City_Troops_Cap =
  floor(Population * Mobilization_Rate * Morale_Mod * Policy_Mod)
  + Barracks_Cap_Bonus;

Recruit_Regen_Per_Turn =
  Base_Recruit_Regen
  + floor(Population * Recruit_Rate * Morale_Mod * Policy_Mod)
  + Military_Task_Output;

Command_Capacity =
  Base_By_General_Rank
  + General.LEA * 50
  + Fame_Bonus
  + Equipment_Command_Bonus
  + Event_Bonus;

Sortie_Troop_Pool_Max = min(
  Command_Capacity,
  City_Troops_Current,
  Stage_Sortie_Cap
);

CanDeploy =
  Sortie_Troop_Pool_Current >= Unit_Troop_Cost
  && Current_Food >= Food_Cost
  && Field_Unit_Count < Field_Unit_Limit;

// 部署時：
Sortie_Troop_Pool_Current -= Unit_Troop_Cost;
Current_Food -= Food_Cost;
SpawnedUnit.Current_Troops = Unit_Troop_Cost;

// 退場 / 結束時：
Returned_Troops = max(0, SpawnedUnit.Current_Troops);
Lost_Troops = Unit_Troop_Cost - Returned_Troops;
Sortie_Troop_Pool_Current += Returned_Troops;

// 戰後：
City_Troops_Current -= Total_Lost_Troops;
Turns_To_Recover = ceil(Total_Lost_Troops / Recruit_Regen_Per_Turn);
```

#### 玩家可見範例

| 狀態 | 數值 |
|---|---|
| 城市人口 | 200,000 |
| 城市兵源 | 10,000 / 10,000 |
| 主將帶兵上限 | 8,000 |
| 本場出征軍勢 | 8,000 |
| 刀盾隊 | 投入 1,000 兵 + 消耗 8 糧 |
| 虎豹騎 | 投入 1,500 兵 + 消耗 18 糧 |

戰中叫出刀盾隊後，HUD 從 `軍勢 8000 / 8000` 變為 `軍勢 7000 / 8000`。若該隊剩 `300 / 1000` 退場，返還 300 兵，本次戰損 700 兵。戰後彙總時，城市兵源從 `10000 / 10000` 變為 `9300 / 10000`，再依治理補兵速度恢復。

### 糧草即時扣除

```typescript
// === 糧草消耗（取代 DP）===
// 一般兵種直接讀基礎表；虎符部隊的正式糧耗仍以兵種（虎符）系統的 TALLY_GRAIN_COST 為準
const BASE_DEPLOY_FOOD_COST: Record<string, number> = {
    INFANTRY:  10,    // 步兵：最便宜
    ARCHER:    12,
    PIKE:      12,
    SHIELD:    14,
    CAVALRY:   18,    // 騎兵：較貴
    NAVY:      20,    // 水軍：需舟船
    SIEGE:     30,    // 機械：最貴
};

function getDeployFoodCost(troopDef: TroopDef, tally: TigerTally | null): number {
    if (troopDef.Is_Special && tally) {
        return TALLY_GRAIN_COST[tally.Quality][tally.Star];
    }
    return BASE_DEPLOY_FOOD_COST[troopDef.Base_Type];
}

// 戰場總糧草預算 = 玩家當前糧草儲備 + 後勤官提供的開局補給
// 戰鬥結束後消耗結算，從玩家資源扣除
```

### 出征前編制槽

```typescript
interface SortieLoadout {
    commander_uid: string;
    strategist_uid: string | null;
    deputy_uid: string | null;
}

const STRATEGIST_TACTIC_CAP_MAX = 30;
const STRATEGIST_TACTIC_START_MAX = 15;
const DEPUTY_FOOD_CAP_RATE_MAX = 0.18;

function getStrategistBonus(strategist: General | null) {
    if (!strategist) return { maxTacticBonus: 0, startTacticBonus: 0 };
    const score = strategist.INT * 0.7 + strategist.POL * 0.5;
    const maxTacticBonus = Math.min(STRATEGIST_TACTIC_CAP_MAX, Math.floor(score / 10));
    const startTacticBonus = Math.min(STRATEGIST_TACTIC_START_MAX, Math.floor(maxTacticBonus * 0.5));
    return { maxTacticBonus, startTacticBonus };
}

function getDeputyFoodBonus(deputy: General | null, baseFoodCap: number) {
    if (!deputy) return { foodCapBonus: 0, startingFoodBonus: 0 };
    const rate = Math.min(DEPUTY_FOOD_CAP_RATE_MAX, 0.03 + deputy.LEA * 0.001 + deputy.POL * 0.0006);
    const foodCapBonus = Math.floor(baseFoodCap * rate);
    return { foodCapBonus, startingFoodBonus: foodCapBonus };
}

function validateSortieLoadout(loadout: SortieLoadout): boolean {
    const ids = [loadout.commander_uid, loadout.strategist_uid, loadout.deputy_uid].filter(Boolean);
    return new Set(ids).size === ids.length;
}
```

### 精銳部署上限與保留槽

```typescript
// === 精銳部署上限 ===
// 只計入「場上存活中的精銳 / 特殊兵 / 攻城器械」；普通小兵不佔上限
const ELITE_DEPLOY_LIMIT = {
    base_active_cap: 4,
    siege_scene_bonus: 1,        // 攻城戰預留 1 個器械槽
    officer_tier_bonus_cap: 1,   // 官職 / 任務加成最多再 +1
};

function getEliteDeployCap(state: BattleState): number {
    const siegeBonus = state.scenePresetId === 'SCENE_SIEGE' ? ELITE_DEPLOY_LIMIT.siege_scene_bonus : 0;
    const officerBonus = Math.min(state.officerTierDeployBonus ?? 0, ELITE_DEPLOY_LIMIT.officer_tier_bonus_cap);
    return ELITE_DEPLOY_LIMIT.base_active_cap + siegeBonus + officerBonus;
}

function canDeployElite(state: BattleState): boolean {
    return state.activeEliteCount < getEliteDeployCap(state);
}
```

- 精銳部署上限的目的，是避免高品質虎符與高糧草存量把戰場直接推成「滿版精銳」。
- `SPECIAL / CAVALRY / NAVY / SIEGE` 預設都算精銳出場名額；`MILITIA` 與基礎步弓盾槍不計入。
- 若超出上限，該卡進入 `場上部隊已滿` 禁用態；系統可提示可派出的低耗部隊，但不得自動把玩家點擊改成其他部隊。

### 部署失敗與改派建議

```typescript
// === 部署檢查 ===
// 兵力、糧草、場上部隊數任何一項不足，目標卡不可部署。
// UI 可以推薦「可派出的低耗部隊」，但玩家必須再次確認，不自動改派。
function deployUnit(player: Player, targetTroop: TroopDef, tally: TigerTally | null, state: BattleState): DeployResult {
    const foodCost = getDeployFoodCost(targetTroop, tally);
    const troopCost = getDeployTroopCost(targetTroop, tally);
    const eliteAllowed = !targetTroop.Is_Special || canDeployElite(state);
    const foodEnough = player.food >= foodCost;
    const troopsEnough = state.sortieTroopsCurrent >= troopCost;

    if (!eliteAllowed) return { unit: null, reason: 'FIELD_UNIT_LIMIT' };
    if (!troopsEnough) return { unit: null, reason: 'TROOPS_SHORT' };
    if (!foodEnough) return { unit: null, reason: 'FOOD_SHORT' };

    player.food -= foodCost;
    state.sortieTroopsCurrent -= troopCost;
    if (targetTroop.Is_Special) state.activeEliteCount += 1;
    return {
        unit: targetTroop.Id,
        quality: targetTroop.Is_Special ? 'ELITE' : 'NORMAL',
        unitTroopCost: troopCost,
        currentTroops: troopCost
    };
    }

const MILITIA_FOOD_COST = 5;   // 普通小兵消耗

// === 普通小兵 vs 精銳 ===
// 普通小兵攻防 = 基礎兵種的 40%
// 沒有特殊能力、沒有兵種剋制加成
// 存在意義：低兵力 / 低糧草時仍有可選低耗部隊，但必須由玩家主動選擇
const MILITIA_STAT_RATIO = 0.4;
```

### 英靈卡 / 虎符 / 支援角色邊界

```typescript
interface BattleLegacyContext {
    spirit_card_id: string | null;
    tally_id: string | null;
    strategist_uid: string | null;
    deputy_uid: string | null;
}

// 1. 英靈卡只提供被動 / 共鳴 / 祖靈語意，不額外召喚第二支部隊
// 2. 虎符才負責特殊兵種調度；同一武將仍只可裝 1 枚虎符
// 3. 參謀官 / 後勤官只提供資源支援，不把自己的虎符或英靈卡效果直接投射到主將身上
```

### 委任 AI

```typescript
// === 委任 AI 邏輯 ===
// 根據武將 INT（智力）決定 AI 部署品質
// 高智力 → 會保留高價值虎符到關鍵時刻，並正確使用參謀官 / 後勤官支援
// 低智力 → 隨機部署、不考慮兵種剋制

type AIDeployQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';

function getAIDeployQuality(generalINT: number): AIDeployQuality {
    if (generalINT >= 90) return 'EXPERT';   // 諸葛亮級
    if (generalINT >= 70) return 'HIGH';      // 周瑜級
    if (generalINT >= 50) return 'MEDIUM';    // 一般武將
    return 'LOW';                              // 張飛級（勇猛但不擅策略）
}

// AI 部署特性
const AI_DEPLOY_BEHAVIOR: Record<AIDeployQuality, string> = {
    LOW:    '隨機部署，不考慮剋制，精銳立即使用',
    MEDIUM: '基本剋制意識，會保留少量糧草',
    HIGH:   '根據敵方兵種剋制部署，保留高價值虎符到關鍵時刻',
    EXPERT: '完美剋制 + 正確保留虎符與補給窗口，糧草與計謀管理最優',
};

const AI_RESERVE_POLICY = {
    LOW:    { keepFoodFloorRate: 0.00, reserveSpecialForBoss: false, reserveSiegeSlots: 0 },
    MEDIUM: { keepFoodFloorRate: 0.10, reserveSpecialForBoss: false, reserveSiegeSlots: 0 },
    HIGH:   { keepFoodFloorRate: 0.18, reserveSpecialForBoss: true,  reserveSiegeSlots: 1 },
    EXPERT: { keepFoodFloorRate: 0.25, reserveSpecialForBoss: true,  reserveSiegeSlots: 1 },
};
```

| AI 品質 | 保留策略 | 正式定義 |
|---|---|---|
| LOW | 幾乎不保留資源 | 看到可用精銳就直接下，不區分主將戰或場景目標 |
| MEDIUM | 保留少量糧草 | 會避免在前兩回合把糧草耗空，但仍可能提早交掉虎符兵 |
| HIGH | 保留 1 個特殊兵 / 器械槽 | 會等到敵方主將、營帳、城門等關鍵目標出現再下高價值單位，並盡量保住參謀官 / 後勤官提供的節奏優勢 |
| EXPERT | 嚴格保留特殊兵與器械節奏 | 會依 `scenePresetId` 與敵方陣容，把高 `TigerTallyScore` 單位留給決勝窗口，並正確利用計謀點 / 補給上限 |

---
