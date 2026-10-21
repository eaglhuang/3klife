// @spec-source → 戰場部署系統.md (doc_spec_0040) §F-0 兵源鏈、§F 出征前編制槽 / 精銳部署上限 / 部署失敗；數值系統.md E-15 錨點；兵種（虎符）系統.md TALLY_GRAIN_COST；同名武將系統.md 名號限定制
/**
 * SortieDeploy — 出征編制、出征軍勢與糧草部署帳本（純邏輯，不依賴 cc）
 *
 * 資源鏈：城市兵源 → 出征軍勢 → 場上分隊。
 *   1. 戰前：validateSortieLoadout() 檢查主將 / 參謀官 / 後勤官角色鎖與同名武將；
 *      createSortieState() 依 min(帶兵上限, 城市兵源, 關卡上限) 開出本場出征軍勢，
 *      並把後勤官加成算進本場軍糧。
 *   2. 戰中：checkDeploy() 回報三種不可部署原因（軍勢不足 / 糧草不足 / 場上部隊已滿），
 *      applyDeploy() 扣軍勢與糧草；updateUnitTroops() / retireUnit() 追蹤每隊剩餘兵力。
 *   3. 戰後：finishSortie() 算出返還兵力、戰損與城市兵源變化（給結算面板與存檔寫回）。
 *
 * 全部是純函式，不改傳入物件。
 *
 * Unity 對照：像 RTS 的 SupplyManager（ScriptableObject 存表、純 C# class 管帳），
 * 戰場 MonoBehaviour 只呼叫 TryDeploy()/OnUnitDied()，不自己算資源。
 */

// ── 常數（規格有的標出處；沒有的標「暫定」）────────────────────────────────

/** 帶兵上限：統率每點 +50（戰場部署 §F-0） */
export const COMMAND_CAPACITY_PER_LEA = 50;
/** 將階基礎帶兵（暫定，規格只寫 Base_By_General_Rank）：0 無名 ~ 5 名將 */
export const COMMAND_CAPACITY_RANK_BASE: readonly number[] = [4000, 6000, 8000, 11000, 15000, 20000];
/** 初期保底：Sortie_Troop_Pool_Max 不可低於 8,000（覆寫裁定 #7）→ 帶兵上限保底 8,000 */
export const COMMAND_CAPACITY_FLOOR = 8000;
/** 關卡沒給上限時的預設（暫定，等 LVL 關卡表） */
export const DEFAULT_STAGE_SORTIE_CAP = 8000;
/** 新玩家城市兵源（數值系統 E-15 初期 8,000~10,000，取上緣；暫定） */
export const DEFAULT_CITY_TROOPS = 10000;
/** 玩家沒有糧草存檔前的本場糧草儲備（暫定：約可部署 20~25 隊普通兵） */
export const DEFAULT_SORTIE_FOOD = 300;
/** 每回合（每季）補兵（E-15 初期 600~900，取中間；暫定） */
export const DEFAULT_RECRUIT_REGEN = 750;

/** 精銳部署上限（戰場部署 §F ELITE_DEPLOY_LIMIT） */
export const ELITE_DEPLOY_LIMIT = { baseActiveCap: 4, siegeSceneBonus: 1, officerTierBonusCap: 1 } as const;

/** 普通小兵：攻防為基礎 40%、部署 5 糧（戰場部署 §F） */
export const MILITIA_STAT_RATIO = 0.4;
export const MILITIA_FOOD_COST = 5;
/** 普通小兵投入兵力（E-15 初期普通兵 400~700 的下緣；暫定） */
export const MILITIA_TROOP_COST = 300;

/** 一般兵種基礎糧耗（戰場部署 §F BASE_DEPLOY_FOOD_COST）；MEDIC 規格沒寫，比照弓兵（暫定） */
export const BASE_DEPLOY_FOOD_COST: Readonly<Record<string, number>> = {
    INFANTRY: 10,
    ARCHER: 12,
    PIKE: 12,
    SHIELD: 14,
    CAVALRY: 18,
    NAVY: 20,
    SIEGE: 30,
    MEDIC: 12,
};

/** 每隊投入兵力（E-15 初期：普通 400~700、精銳 1,200~1,500；暫定） */
export const UNIT_TROOP_COST: Readonly<Record<string, number>> = {
    INFANTRY: 500,
    ARCHER: 500,
    PIKE: 550,
    SHIELD: 600,
    MEDIC: 400,
    CAVALRY: 1200,
    NAVY: 1200,
    SIEGE: 1500,
};

/** 預設算精銳（佔精銳上限）的兵種：CAVALRY / NAVY / SIEGE，另加所有虎符特殊兵（戰場部署 §F） */
export const ELITE_BASE_TYPES: ReadonlySet<string> = new Set(['CAVALRY', 'NAVY', 'SIEGE']);

/** 虎符糧耗（兵種（虎符）系統 TALLY_GRAIN_COST，Q62=A） */
export const TALLY_GRAIN_COST: Readonly<Record<string, Readonly<Record<number, number>>>> = {
    R: { 1: 20, 2: 22, 3: 25 },
    SR: { 1: 40, 2: 45, 3: 52, 4: 60 },
    SSR: { 1: 70, 2: 80, 3: 92, 4: 106, 5: 122 },
    UR: { 1: 110, 2: 125, 3: 142, 4: 162, 5: 185 },
};
/** 查不到品質 / 星級時的虎符糧耗（規格 getTallyGrainCost 的 fallback） */
export const TALLY_GRAIN_COST_FALLBACK = 20;

/** 糧草不足折扣（兵種（虎符）系統）：季結算前剩餘糧草少於此值，下一場出征的虎符糧耗打 8 折（不累算） */
export const TALLY_SHORTAGE_FOOD_THRESHOLD = 50;
/** 8 折；無條件捨去（PM 暫定 2026-10-14） */
export const TALLY_SHORTAGE_FOOD_RATE = 0.8;
/** 虎符部隊投入兵力：品質越高越重（E-15 精銳 1,200~1,500 起；暫定） */
export const TALLY_TROOP_COST: Readonly<Record<string, number>> = { R: 1200, SR: 1300, SSR: 1400, UR: 1500 };

/** 參謀官 / 後勤官上限（戰場部署 §F） */
export const STRATEGIST_TACTIC_CAP_MAX = 30;
export const STRATEGIST_TACTIC_START_MAX = 15;
/** 計謀點基礎上限（暫定：戰場部署 §I 範例 Max_Tactic_Points 48 − Strategist_Max_Tactic_Bonus 18 反推） */
export const BASE_TACTIC_CAP = 30;
/** 計謀點基礎開局值（暫定：§I 範例 Current 21 − Strategist_Start_Tactic_Bonus 9 反推） */
export const BASE_TACTIC_START = 12;
/** 計謀點每回合回復（暫定：規格未定回復速率，先給 +2） */
export const TACTIC_REGEN_PER_TURN = 2;
export const DEPUTY_FOOD_CAP_RATE_MAX = 0.18;

// ── 兵種代碼 ───────────────────────────────────────────────────────────────

/** 戰場 TroopType（小寫）→ 規格糧耗表代碼；未知兵種回傳 null */
const TROOP_TYPE_CODE: Readonly<Record<string, string>> = {
    infantry: 'INFANTRY',
    archer: 'ARCHER',
    pikeman: 'PIKE',
    shield: 'SHIELD',
    cavalry: 'CAVALRY',
    navy: 'NAVY',
    engineer: 'SIEGE',
    medic: 'MEDIC',
};

export function troopCodeOf(troopType: string): string | null {
    const key = troopType.toLowerCase();
    if (TROOP_TYPE_CODE[key]) return TROOP_TYPE_CODE[key];
    const upper = troopType.toUpperCase();
    return BASE_DEPLOY_FOOD_COST[upper] !== undefined ? upper : null;
}

// ── 型別 ───────────────────────────────────────────────────────────────────

export interface DeployTally {
    quality: string;
    star: number;
}

/** 要部署的一隊：戰場兵種 + 選配虎符；militia 為普通小兵 */
export interface DeployRequest {
    troopType: string;
    tally?: DeployTally | null;
    militia?: boolean;
}

export interface DeployCost {
    troopCost: number;
    foodCost: number;
    isElite: boolean;
}

export type SortieDeployBlockReason = 'TROOPS_SHORT' | 'FOOD_SHORT' | 'FIELD_UNIT_LIMIT';

export interface SortieDeployCheck {
    ok: boolean;
    reasons: SortieDeployBlockReason[];
    cost: DeployCost;
}

export interface SortieUnitRecord {
    unitId: string;
    troopCost: number;
    currentTroops: number;
    isElite: boolean;
    retired: boolean;
}

export interface SortieState {
    /** 本場虎符糧耗是否打 8 折（季末糧不足的下一場）；舊呼叫端不傳即為 false */
    tallyFoodDiscount?: boolean;
    poolMax: number;
    poolCurrent: number;
    food: number;
    maxFood: number;
    foodSpent: number;
    eliteCap: number;
    /** 所有場上部隊上限；規格只要求精銳上限，預設不限（Infinity） */
    fieldUnitLimit: number;
    units: Readonly<Record<string, SortieUnitRecord>>;
    militiaDeployed: number;
    eliteDeployed: number;
    /** 計謀點上限（基礎 + 參謀官加成） */
    tacticMax: number;
    /** 目前計謀點 */
    tacticCurrent: number;
    /** 每回合回復的計謀點 */
    tacticRegenPerTurn: number;
}

export interface CommandCapacityInput {
    lea: number;
    /** 將階 0~5；超出範圍夾住 */
    generalRank?: number;
    fameBonus?: number;
    equipmentBonus?: number;
    eventBonus?: number;
}

export interface CreateSortieInput {
    /** 季末糧不足，本場虎符糧耗打 8 折（由呼叫端在戰場開局時決定，見 GameSession.consumeTallyFoodDiscount） */
    tallyFoodDiscount?: boolean;
    commandCapacity: number;
    cityTroops: number;
    stageSortieCap?: number;
    /** 本場可用糧草（玩家糧草儲備） */
    food: number;
    /** 後勤官提供的開局補給 / 軍糧上限加成 */
    foodBonus?: number;
    /** 參謀官提供的計謀點上限 / 開局補點加成（getStrategistBonus 的結果） */
    strategistBonus?: StrategistBonus;
    scenePresetId?: string | null;
    officerTierDeployBonus?: number;
    fieldUnitLimit?: number;
    /** 出征整隊各武將的 Bloodline_ID（主將、參謀、後勤）；重複時拒絕建立帳本（SAME-02） */
    formationBloodlineIds?: readonly (string | undefined)[];
}

export interface SortieSummary {
    poolMax: number;
    poolRemaining: number;
    returnedTroops: number;
    lostTroops: number;
    foodSpent: number;
    foodRemaining: number;
    cityTroopsBefore: number;
    cityTroopsAfter: number;
    recruitRegen: number;
    turnsToRecover: number;
    militiaDeployed: number;
    eliteDeployed: number;
}

// ── 公式 ───────────────────────────────────────────────────────────────────

function nonNegInt(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Command_Capacity = Base_By_General_Rank + LEA × 50 + 名聲 + 裝備 + 事件；初期保底 8,000 */
export function computeCommandCapacity(input: CommandCapacityInput): number {
    const rankIndex = Math.max(0, Math.min(COMMAND_CAPACITY_RANK_BASE.length - 1, Math.floor(input.generalRank ?? 0)));
    const raw = COMMAND_CAPACITY_RANK_BASE[rankIndex]
        + nonNegInt(input.lea) * COMMAND_CAPACITY_PER_LEA
        + nonNegInt(input.fameBonus)
        + nonNegInt(input.equipmentBonus)
        + nonNegInt(input.eventBonus);
    return Math.max(COMMAND_CAPACITY_FLOOR, raw);
}

/** Sortie_Troop_Pool_Max = min(帶兵上限, 城市兵源, 關卡上限) */
export function computeSortiePoolMax(commandCapacity: number, cityTroops: number, stageSortieCap = DEFAULT_STAGE_SORTIE_CAP): number {
    return Math.min(nonNegInt(commandCapacity), nonNegInt(cityTroops), nonNegInt(stageSortieCap));
}

export function getTallyGrainCost(quality: string, star: number): number {
    return TALLY_GRAIN_COST[quality]?.[star] ?? TALLY_GRAIN_COST_FALLBACK;
}

/** 攻城戰場景預設 ID（戰場部署系統：SCENE_SIEGE = 攻城戰） */
export const SCENE_PRESET_SIEGE = 'SCENE_SIEGE';

/** 由遭遇戰種類推場景預設：攻城戰 → SCENE_SIEGE，野戰或未設定 → null（PROG-2-0926） */
export function scenePresetIdOf(battleKind?: string | null): string | null {
    return battleKind === 'siege' ? SCENE_PRESET_SIEGE : null;
}

/** 精銳部署上限：基礎 4，攻城 +1，官職 / 任務最多 +1 */
export function getEliteDeployCap(scenePresetId?: string | null, officerTierDeployBonus = 0): number {
    const siege = scenePresetId === SCENE_PRESET_SIEGE ? ELITE_DEPLOY_LIMIT.siegeSceneBonus : 0;
    const officer = Math.min(nonNegInt(officerTierDeployBonus), ELITE_DEPLOY_LIMIT.officerTierBonusCap);
    return ELITE_DEPLOY_LIMIT.baseActiveCap + siege + officer;
}

/** 普通小兵戰力：基礎兵種攻防的 40%，無特殊能力（戰場部署 §精銳 vs 普通小兵）；小數無條件捨去（暫定，規格未寫取捨） */
export function getMilitiaCombatStats(base: { attack: number; defense: number }): { attack: number; defense: number } {
    return {
        attack: Math.floor(nonNegInt(base.attack) * MILITIA_STAT_RATIO),
        defense: Math.floor(nonNegInt(base.defense) * MILITIA_STAT_RATIO),
    };
}

/** 一隊的投入兵力、糧耗與是否算精銳；未知兵種比照步兵 */
export function getDeployCost(request: DeployRequest): DeployCost {
    if (request.militia) {
        return { troopCost: MILITIA_TROOP_COST, foodCost: MILITIA_FOOD_COST, isElite: false };
    }
    if (request.tally) {
        return {
            troopCost: TALLY_TROOP_COST[request.tally.quality] ?? TALLY_TROOP_COST.R,
            foodCost: getTallyGrainCost(request.tally.quality, request.tally.star),
            isElite: true,
        };
    }
    const code = troopCodeOf(request.troopType) ?? 'INFANTRY';
    return {
        troopCost: UNIT_TROOP_COST[code] ?? UNIT_TROOP_COST.INFANTRY,
        foodCost: BASE_DEPLOY_FOOD_COST[code] ?? BASE_DEPLOY_FOOD_COST.INFANTRY,
        isElite: ELITE_BASE_TYPES.has(code),
    };
}

// ── 出征編制 ───────────────────────────────────────────────────────────────

export interface SortieLoadout {
    commanderUid: string;
    strategistUid: string | null;
    deputyUid: string | null;
}

/** 編制驗證用的最小武將資料 */
export interface SortieMember {
    id: string;
    int?: number;
    pol?: number;
    lea?: number;
    /** 同名武將系統：同一血統 ID 不可同場 */
    bloodlineId?: string;
}

export type SortieLoadoutIssue = 'MISSING_COMMANDER' | 'ROLE_LOCK' | 'SAME_BLOODLINE' | 'UNKNOWN_GENERAL';

export interface SortieLoadoutCheck {
    ok: boolean;
    issues: SortieLoadoutIssue[];
}

/**
 * 整隊血統檢查（SAME-02）：出征整隊（主將 + 參謀 + 後勤）的 Bloodline_ID 不可重複。
 * 沒有 bloodlineId 的武將不參與比對。與 validateSortieLoadout 的 SAME_BLOODLINE 規則相同，
 * 但只看血統清單，給戰場開戰時再檢查一次用。
 */
export function checkFormationBloodlines(bloodlineIds: readonly (string | undefined)[]): SortieLoadoutCheck {
    const present = bloodlineIds.filter((b): b is string => typeof b === 'string' && b.length > 0);
    const unique = new Set(present).size === present.length;
    return { ok: unique, issues: unique ? [] : ['SAME_BLOODLINE'] };
}

function loadoutIds(loadout: SortieLoadout): string[] {
    return [loadout.commanderUid, loadout.strategistUid, loadout.deputyUid].filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/**
 * 角色鎖：同一武將不可兼任兩個出征角色；名號限定制：同一 bloodlineId 不可同場。
 * members 可省略（只驗角色鎖）；給了就同時檢查武將存在與血統。
 */
export function validateSortieLoadout(loadout: SortieLoadout, members?: readonly SortieMember[]): SortieLoadoutCheck {
    const issues: SortieLoadoutIssue[] = [];
    if (!loadout.commanderUid) issues.push('MISSING_COMMANDER');
    const ids = loadoutIds(loadout);
    if (new Set(ids).size !== ids.length) issues.push('ROLE_LOCK');
    if (members) {
        const byId = new Map(members.map((m) => [m.id, m]));
        if (ids.some((id) => !byId.has(id))) issues.push('UNKNOWN_GENERAL');
        const bloodlines = [...new Set(ids)].map((id) => byId.get(id)?.bloodlineId).filter((b): b is string => Boolean(b));
        if (new Set(bloodlines).size !== bloodlines.length) issues.push('SAME_BLOODLINE');
    }
    return { ok: issues.length === 0, issues };
}

export interface StrategistBonus {
    maxTacticBonus: number;
    startTacticBonus: number;
}

/** 參謀官：INT×0.7 + POL×0.5 → 計謀點上限加成（上限 30），開局補一半（上限 15） */
export function getStrategistBonus(strategist: SortieMember | null | undefined): StrategistBonus {
    if (!strategist) return { maxTacticBonus: 0, startTacticBonus: 0 };
    const score = (strategist.int ?? 0) * 0.7 + (strategist.pol ?? 0) * 0.5;
    const maxTacticBonus = Math.min(STRATEGIST_TACTIC_CAP_MAX, Math.floor(score / 10));
    const startTacticBonus = Math.min(STRATEGIST_TACTIC_START_MAX, Math.floor(maxTacticBonus * 0.5));
    return { maxTacticBonus, startTacticBonus };
}

export interface DeputyFoodBonus {
    foodCapBonus: number;
    startingFoodBonus: number;
}

/** 後勤官：rate = min(0.18, 0.03 + LEA×0.001 + POL×0.0006)，軍糧上限與開局補給同值 */
export function getDeputyFoodBonus(deputy: SortieMember | null | undefined, baseFoodCap: number): DeputyFoodBonus {
    if (!deputy) return { foodCapBonus: 0, startingFoodBonus: 0 };
    const rate = Math.min(DEPUTY_FOOD_CAP_RATE_MAX, 0.03 + (deputy.lea ?? 0) * 0.001 + (deputy.pol ?? 0) * 0.0006);
    const foodCapBonus = Math.floor(nonNegInt(baseFoodCap) * rate);
    return { foodCapBonus, startingFoodBonus: foodCapBonus };
}

// ── 帳本 ───────────────────────────────────────────────────────────────────

export function createSortieState(input: CreateSortieInput): SortieState {
    if (!checkFormationBloodlines(input.formationBloodlineIds ?? []).ok) {
        throw new Error('[SortieDeploy] 同名武將（Bloodline_ID 重複）不可同場出征');
    }
    const poolMax = computeSortiePoolMax(input.commandCapacity, input.cityTroops, input.stageSortieCap);
    const food = nonNegInt(input.food) + nonNegInt(input.foodBonus);
    const tacticMax = BASE_TACTIC_CAP + nonNegInt(input.strategistBonus?.maxTacticBonus);
    const tacticStart = Math.min(tacticMax, BASE_TACTIC_START + nonNegInt(input.strategistBonus?.startTacticBonus));
    return {
        tallyFoodDiscount: input.tallyFoodDiscount === true,
        poolMax,
        poolCurrent: poolMax,
        food,
        maxFood: food,
        foodSpent: 0,
        eliteCap: getEliteDeployCap(input.scenePresetId, input.officerTierDeployBonus),
        fieldUnitLimit: typeof input.fieldUnitLimit === 'number' && input.fieldUnitLimit > 0 ? Math.floor(input.fieldUnitLimit) : Infinity,
        units: {},
        militiaDeployed: 0,
        eliteDeployed: 0,
        tacticMax,
        tacticCurrent: tacticStart,
        tacticRegenPerTurn: TACTIC_REGEN_PER_TURN,
    };
}

// ── 計謀點 ─────────────────────────────────────────────────────────────────

export type TacticSpendResult =
    | { ok: true; state: SortieState; spent: number }
    | { ok: false; state: SortieState; reason: 'TACTIC_SHORT' };

/** 花費計謀點；不足時不扣、回報 TACTIC_SHORT。cost 為 0 或負數視為免費。 */
export function spendTactic(state: SortieState, cost: number): TacticSpendResult {
    const need = nonNegInt(cost);
    if (state.tacticCurrent < need) return { ok: false, state, reason: 'TACTIC_SHORT' };
    return { ok: true, state: { ...state, tacticCurrent: state.tacticCurrent - need }, spent: need };
}

/** 戰法計謀點成本預設（暫定：戰法系統範例 20~55 TP，尚未逐招定案，先取中間值 30） */
export const DEFAULT_TACTIC_TP_COST = 30;
/** 逐招成本覆寫表（tacticId → 成本）；數值來源為數值系統.md E-9 戰法 TP 消耗表（28 招） */
export const TACTIC_TP_COST_OVERRIDE: Readonly<Record<string, number>> = {
    TAC_CAVALRY_CHARGE: 30,
    TAC_LONE_RIDER: 50,
    TAC_LANCE_THRUST: 20,
    TAC_IRON_WALL_CHARGE: 40,
    TAC_BACKSTAB: 25,
    TAC_AMBUSH: 40,
    TAC_NIGHT_RAID: 35,
    TAC_SEVEN_IN_OUT: 60,
    TAC_DISCORD: 45,
    TAC_TAUNT: 15,
    TAC_SLOW: 20,
    // 空城計（戰法系統：55 TP，PROG-2-0778）
    TAC_EMPTY_FORT: 55,
    TAC_CHAIN_LINK: 70,
    TAC_WATER_ATTACK: 65,
    TAC_COMBO_ATTACK: 20,
    TAC_SWORN_FURY: 45,
    TAC_HEAL: 25,
    TAC_INSPIRE: 30,
    TAC_HASTE: 15,
    TAC_SHIELD: 35,
    TAC_EIGHT_ARRAY: 80,
    TAC_WEI_MIGHT: 70,
    TAC_DRAGON_GALL: 60,
    TAC_FIRE_ATTACK: 35,
    TAC_RED_CLIFF: 90,
    TAC_FIRE_ARROW: 25,
    TAC_ARROW_RAIN: 50,
    TAC_FOREST_AMBUSH: 30,
};

/**
 * 戰場戰法庫（tactic-library.json）id → 規格表 TAC_* id 的暫定對照（PM 2026-10-21 裁定：規格 id 保持正式）。
 * 明顯對得上的直接對；其餘依分類與描述選最接近的一招，皆為暫定，記於待辦檔。
 */
export const TACTIC_LIBRARY_TO_SPEC_ID: Readonly<Record<string, string>> = {
    'tactic-cavalry-shock': 'TAC_CAVALRY_CHARGE',
    'tactic-fire-scheme': 'TAC_FIRE_ATTACK',
    'tactic-archer-volley': 'TAC_ARROW_RAIN',
    'tactic-morale-rally': 'TAC_INSPIRE',
    'tactic-battle-roar': 'TAC_TAUNT',
    'tactic-river-ambush': 'TAC_AMBUSH',
    'tactic-spear-phalanx': 'TAC_LANCE_THRUST',
    'tactic-dragon-pierce': 'TAC_LONE_RIDER',
};

/** 戰場 id 先經對照轉成規格 id；本來就是規格 id 或查無對照時原樣回傳 */
export function toSpecTacticId(tacticId: string): string {
    return TACTIC_LIBRARY_TO_SPEC_ID[tacticId] ?? tacticId;
}

/** 施放戰法所需計謀點；沒有 tacticId（只有普通攻擊或 demo 技能）時用預設值 */
export function getTacticTpCost(tacticId: string | null | undefined): number {
    if (!tacticId) return DEFAULT_TACTIC_TP_COST;
    return TACTIC_TP_COST_OVERRIDE[toSpecTacticId(tacticId)] ?? DEFAULT_TACTIC_TP_COST;
}

/** 回合開始回復計謀點，不超過上限 */
export function regenTactic(state: SortieState): SortieState {
    const next = Math.min(state.tacticMax, state.tacticCurrent + nonNegInt(state.tacticRegenPerTurn));
    return next === state.tacticCurrent ? state : { ...state, tacticCurrent: next };
}

function activeUnits(state: SortieState): SortieUnitRecord[] {
    return Object.values(state.units).filter((unit) => !unit.retired);
}

/** 三種原因全部列出（UI 可各自顯示）；順序：場上已滿 → 軍勢不足 → 糧草不足（同規格 deployUnit 的判定順序） */
/** 糧不足折扣只套在虎符部隊的糧耗上，無條件捨去 */
export function discountedDeployCost(cost: DeployCost, request: DeployRequest, state: Pick<SortieState, 'tallyFoodDiscount'>): DeployCost {
    if (!request.tally || !state.tallyFoodDiscount) return cost;
    return { ...cost, foodCost: Math.floor(cost.foodCost * TALLY_SHORTAGE_FOOD_RATE) };
}

export function checkDeploy(state: SortieState, request: DeployRequest): SortieDeployCheck {
    const cost = discountedDeployCost(getDeployCost(request), request, state);
    const active = activeUnits(state);
    const reasons: SortieDeployBlockReason[] = [];
    const eliteFull = cost.isElite && active.filter((u) => u.isElite).length >= state.eliteCap;
    if (eliteFull || active.length >= state.fieldUnitLimit) reasons.push('FIELD_UNIT_LIMIT');
    if (state.poolCurrent < cost.troopCost) reasons.push('TROOPS_SHORT');
    if (state.food < cost.foodCost) reasons.push('FOOD_SHORT');
    return { ok: reasons.length === 0, reasons, cost };
}

/** 改派建議可推薦的兵種（與 UI 兵種名稱對照表一致；水軍等無名稱的不列入） */
export const DEPLOY_SUGGESTION_CANDIDATES: readonly string[] = ['cavalry', 'infantry', 'shield', 'archer', 'pikeman'];

/** 改派二次確認記憶（DEP-10 A 案）：記下上一次被擋的目標與建議兵種 */
export interface RedirectPrompt {
    deniedType: string;
    lane: number;
    suggestedType: string;
}

export interface RedirectStep {
    prompt: RedirectPrompt | null;
    action: 'none' | 'arm' | 'confirm';
    troopType: string | null;
}

/**
 * 改派二次確認（規格：玩家必須再次確認，不自動改派）。
 * 第一次點不可部署的目標 → arm（只提示）；同一目標、同一格、同一建議的第二次點 → confirm（才改派）；沒有建議 → none。
 */
export function nextRedirectStep(
    prompt: RedirectPrompt | null,
    attempt: { troopType: string; lane: number },
    suggestion: string | null,
): RedirectStep {
    if (!suggestion) return { prompt: null, action: 'none', troopType: null };
    const confirmed = prompt !== null
        && prompt.deniedType === attempt.troopType
        && prompt.lane === attempt.lane
        && prompt.suggestedType === suggestion;
    if (confirmed) return { prompt: null, action: 'confirm', troopType: suggestion };
    return {
        prompt: { deniedType: attempt.troopType, lane: attempt.lane, suggestedType: suggestion },
        action: 'arm',
        troopType: suggestion,
    };
}

/** 改派建議文案（規格 戰場部署系統 §G「可改派低耗部隊：{TroopName}。」） */
export function deploySuggestionCopy(troopName: string): string {
    return `可改派低耗部隊：${troopName}。`;
}

/**
 * 改派建議 Deploy_Suggestion（DEP-10）：目標不可部署時，從候選兵種中推薦一隊可派出的低耗部隊。
 * 只回傳建議，玩家必須再次確認，不自動改派（規格）。排序暫定：糧耗低者優先，再比兵力耗，同分取候選順序較前者。
 */
export function suggestLowCostDeploy(
    state: SortieState,
    deniedType: string,
    candidateTypes: readonly string[],
): string | null {
    let best: { troopType: string; cost: DeployCost } | null = null;
    for (const troopType of candidateTypes) {
        if (troopCodeOf(troopType) === troopCodeOf(deniedType)) continue;
        const check = checkDeploy(state, { troopType });
        if (!check.ok) continue;
        const cost = check.cost;
        if (
            !best
            || cost.foodCost < best.cost.foodCost
            || (cost.foodCost === best.cost.foodCost && cost.troopCost < best.cost.troopCost)
        ) {
            best = { troopType, cost };
        }
    }
    return best?.troopType ?? null;
}

export interface ApplyDeployResult {
    ok: boolean;
    state: SortieState;
    check: SortieDeployCheck;
}

/** 部署成功扣軍勢與糧草並登記該隊；不成功原樣回傳（不自動改派） */
export function applyDeploy(state: SortieState, unitId: string, request: DeployRequest): ApplyDeployResult {
    const check = checkDeploy(state, request);
    if (!check.ok || state.units[unitId]) {
        return { ok: false, state, check: state.units[unitId] ? { ...check, ok: false } : check };
    }
    const { troopCost, foodCost, isElite } = check.cost;
    return {
        ok: true,
        check,
        state: {
            ...state,
            poolCurrent: state.poolCurrent - troopCost,
            food: state.food - foodCost,
            foodSpent: state.foodSpent + foodCost,
            units: { ...state.units, [unitId]: { unitId, troopCost, currentTroops: troopCost, isElite, retired: false } },
            militiaDeployed: state.militiaDeployed + (request.militia ? 1 : 0),
            eliteDeployed: state.eliteDeployed + (isElite ? 1 : 0),
        },
    };
}

/** 依血量比例換算該隊剩餘兵力（Current_Troops 即分隊生命） */
export function troopsFromHp(troopCost: number, currentHp: number, maxHp: number): number {
    if (!(maxHp > 0)) return 0;
    const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
    return Math.round(troopCost * ratio);
}

export function updateUnitTroops(state: SortieState, unitId: string, currentTroops: number): SortieState {
    const unit = state.units[unitId];
    if (!unit || unit.retired) return state;
    const next = Math.max(0, Math.min(unit.troopCost, Math.round(currentTroops)));
    return { ...state, units: { ...state.units, [unitId]: { ...unit, currentTroops: next } } };
}

/** 退場（撤回或陣亡）：剩餘兵力返還出征軍勢；陣亡時 currentTroops 給 0 */
export function retireUnit(state: SortieState, unitId: string, currentTroops?: number): SortieState {
    const unit = state.units[unitId];
    if (!unit || unit.retired) return state;
    const updated = currentTroops === undefined ? unit : { ...unit, currentTroops: Math.max(0, Math.min(unit.troopCost, Math.round(currentTroops))) };
    return {
        ...state,
        poolCurrent: state.poolCurrent + updated.currentTroops,
        units: { ...state.units, [unitId]: { ...updated, retired: true } },
    };
}

/** 戰鬥結束：場上剩餘部隊全數返還，計算戰損與城市兵源變化 */
export function finishSortie(state: SortieState, cityTroopsBefore: number, recruitRegen = DEFAULT_RECRUIT_REGEN): SortieSummary {
    let finalState = state;
    for (const unit of activeUnits(state)) {
        finalState = retireUnit(finalState, unit.unitId);
    }
    const all = Object.values(finalState.units);
    const returnedTroops = all.reduce((sum, u) => sum + u.currentTroops, 0);
    const lostTroops = all.reduce((sum, u) => sum + (u.troopCost - u.currentTroops), 0);
    const before = nonNegInt(cityTroopsBefore);
    const regen = nonNegInt(recruitRegen);
    return {
        poolMax: finalState.poolMax,
        poolRemaining: finalState.poolCurrent,
        returnedTroops,
        lostTroops,
        foodSpent: finalState.foodSpent,
        foodRemaining: finalState.food,
        cityTroopsBefore: before,
        cityTroopsAfter: Math.max(0, before - lostTroops),
        recruitRegen: regen,
        turnsToRecover: lostTroops <= 0 ? 0 : regen > 0 ? Math.ceil(lostTroops / regen) : Infinity,
        militiaDeployed: finalState.militiaDeployed,
        eliteDeployed: finalState.eliteDeployed,
    };
}

// ── 劇本字串（戰場部署 §G / §H） ────────────────────────────────────────────

export const SORTIE_DEPLOY_BLOCK_TEXT: Readonly<Record<SortieDeployBlockReason, string>> = {
    TROOPS_SHORT: '軍勢不足',
    FOOD_SHORT: '糧草不足',
    FIELD_UNIT_LIMIT: '場上部隊已滿',
};

export const SORTIE_LOADOUT_ISSUE_TEXT: Readonly<Record<SortieLoadoutIssue, string>> = {
    MISSING_COMMANDER: '尚未選定主將',
    ROLE_LOCK: '同一武將不可同時擔任兩個出征角色',
    SAME_BLOODLINE: '同名武將不可同場出征',
    UNKNOWN_GENERAL: '編制中有不在名冊的武將',
};

/** 戰後結算面板六項：出征軍勢 / 返還兵力 / 本戰損耗 / 城市兵源變化 / 補兵速度 / 預估恢復回合（另附糧草消耗） */
export function formatSortieSummary(summary: SortieSummary): string[] {
    const recover = Number.isFinite(summary.turnsToRecover) ? `${summary.turnsToRecover} 季` : '無法補回';
    return [
        `出征軍勢 ${summary.poolMax}｜返還 ${summary.returnedTroops}｜戰損 ${summary.lostTroops}｜糧草 -${summary.foodSpent}`,
        `城市兵源 ${summary.cityTroopsBefore}→${summary.cityTroopsAfter}｜補兵 ${summary.recruitRegen}/季｜約 ${recover}恢復`,
    ];
}

/** 部署失敗提示：「軍勢不足，無法派出 {TroopName}。」；場上已滿另有固定句 */
export function deployBlockMessage(reason: SortieDeployBlockReason, troopName: string): string {
    if (reason === 'FIELD_UNIT_LIMIT') return '場上部隊已滿，請先等待退場或撤回部隊。';
    return `${SORTIE_DEPLOY_BLOCK_TEXT[reason]}，無法派出 ${troopName}。`;
}
