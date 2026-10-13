// @spec-source → 數值系統.md §F-4 主將帶隊總戰力公式、§F-5 數值常數大全（PROG-2-0209，WBS NUM-14 總戰力部分）
/**
 * BattlePowerRating — 主將帶隊總戰力 calculateBattlePowerRating（純邏輯，不依賴 cc）
 *
 * 規格 F-5 已給齊的常數全部直接採用，集中在 BATTLE_POWER_CONSTANTS，不另外猜值。
 * 輸入採純資料（數字與字串），不吃 GeneralUnit 等模型，方便 headless 測試。
 *
 * 呼叫端負責的部分（暫定，記入待辦）：
 *   - 地形、天氣的攻防加總（terrainAtkDefSum、weatherAtkDefSum）。
 *   - 虎符適性修正 affinityMod（地形、家族、性別）。F-5 有數值，但查表函式規格未定義。
 *
 * Unity 對照：像 RPG 的 Combat Power 計算器，吃一組角色資料與加成，吐一個整數，不碰場景物件。
 */

export type AgePhase = 'Child' | 'Youth' | 'Prime' | 'Peak' | 'Elder' | 'Over';
export type AptitudeGrade = 'S' | 'A' | 'B' | 'C' | 'D';
export type TallyQuality = 'UR' | 'SSR' | 'SR' | 'R';

/** F-5 原值，集中於此，方便之後整批調整 */
export const BATTLE_POWER_CONSTANTS = {
    AGE_MODIFIER: { Child: 0, Youth: 0.6, Prime: 1.0, Peak: 1.1, Elder: 0.8, Over: 0.5 } as Record<AgePhase, number>,
    APTITUDE_EFFICIENCY: { S: 1.2, A: 1.1, B: 1.0, C: 0.9, D: 0.8 } as Record<AptitudeGrade, number>,
    TALLY_QUALITY_MOD: { UR: 1.5, SSR: 1.3, SR: 1.15, R: 1.0 } as Record<TallyQuality, number>,
    TALLY_STAR_MOD_PER_STAR: 0.08,
    TALLY_RESONANCE_MOD: 1.1,
    SPIRIT_CARD_POWER_CAP: 500,
    STRATEGIST_POWER_RATE: 0.45,
    STRATEGIST_POWER_CAP: 220,
    DEPUTY_FOOD_CAP_RATE_MAX: 0.18,
    DEPUTY_FOOD_POWER_WEIGHT: 0.05,
    DEPUTY_POWER_CAP: 180,
    REINCARNATION_MOD_PER_TIME: 0.15,
} as const;

/** 規格 F-4：屬於體能系的兵種，主將用武力計算；其餘用智力 */
export const PHYSICAL_TROOP_TYPES: ReadonlySet<string> = new Set(['CAVALRY', 'INFANTRY', 'SHIELD', 'PIKE']);

export interface RatingGeneral {
    str: number;
    int: number;
    lea: number;
    luk: number;
    cha: number;
    pol: number;
    agePhase: AgePhase;
    /** 對指揮兵種的適性等級 */
    troopAptitude: AptitudeGrade;
    /** 轉生次數，每轉 +15% */
    reincarnation: number;
}

export interface RatingTroop {
    baseType: string;
    attack: number;
    defense: number;
    move: number;
    range: number;
    /** 特殊兵種才吃虎符加成（F-4 的 Is_Special） */
    isSpecial: boolean;
}

export interface RatingTally {
    quality: TallyQuality;
    /** 1~5 星 */
    star: number;
    /** 虎符的 Resonance_Template 是否等於主將 Template_ID */
    resonance: boolean;
    /** 呼叫端算好的適性修正（地形、家族、性別），1 表示無加成 */
    affinityMod: number;
}

export interface RatingSupport {
    /** 英靈卡戰力，無卡傳 null（只取一張，封頂見常數） */
    spiritCardPower: number | null;
    strategist: { int: number; pol: number } | null;
    deputy: { lea: number; pol: number } | null;
    /** 關卡或主將提供的原始糧草上限 */
    baseFoodCap: number;
}

export interface RatingEnv {
    /** 地形 atk + def 加總（呼叫端查表） */
    terrainAtkDefSum: number;
    /** 天氣 atk + def 加總（呼叫端查表） */
    weatherAtkDefSum: number;
}

/** 虎符加成：品質 × 星級 × 共鳴 × 適性（F-4 §4）。非特殊兵種或無虎符時為 1 */
export function calculateTallyPowerMod(tally: RatingTally | null, isSpecialTroop: boolean): number {
    if (!tally || !isSpecialTroop) return 1;
    const qualityMod = BATTLE_POWER_CONSTANTS.TALLY_QUALITY_MOD[tally.quality];
    const starMod = 1 + tally.star * BATTLE_POWER_CONSTANTS.TALLY_STAR_MOD_PER_STAR;
    const resonanceMod = tally.resonance ? BATTLE_POWER_CONSTANTS.TALLY_RESONANCE_MOD : 1;
    return qualityMod * starMod * resonanceMod * tally.affinityMod;
}

/**
 * 主將帶隊總戰力（F-4）。運算順序照規格偽代碼：
 * 加總 → × 適性 → × 虎符 → × 地形 → × 天氣 → × 轉生，最後 floor。
 */
export function calculateBattlePowerRating(
    general: RatingGeneral,
    troop: RatingTroop,
    tally: RatingTally | null,
    support: RatingSupport,
    env: RatingEnv,
): number {
    const C = BATTLE_POWER_CONSTANTS;

    // 1. 主將基礎戰力
    const isPhysical = PHYSICAL_TROOP_TYPES.has(troop.baseType);
    const primaryStat = isPhysical
        ? general.str * 0.5 + general.lea * 0.3 + general.luk * 0.05
        : general.int * 0.5 + general.lea * 0.3 + general.luk * 0.05;
    const secondaryStat = general.cha * 0.1 + general.pol * 0.05;
    const generalPower = (primaryStat + secondaryStat) * C.AGE_MODIFIER[general.agePhase];

    // 2. 兵種基礎戰力
    const troopBasePower = (troop.attack + troop.defense) * 0.5 + troop.move * 50 + troop.range * 30;

    // 3. 適性效率
    const aptitude = C.APTITUDE_EFFICIENCY[general.troopAptitude];

    // 4. 虎符加成
    const tallyPowerMod = calculateTallyPowerMod(tally, troop.isSpecial);

    // 5. 英靈卡（只取一張，封頂）
    const spiritBonus = support.spiritCardPower === null
        ? 0
        : Math.min(C.SPIRIT_CARD_POWER_CAP, support.spiritCardPower);

    // 6. 出征支援折算（只做戰力估算，不進資源池）
    const strategistSupport = support.strategist
        ? Math.min(
            C.STRATEGIST_POWER_CAP,
            Math.floor((support.strategist.int * 0.7 + support.strategist.pol * 0.5) * C.STRATEGIST_POWER_RATE),
        )
        : 0;
    const deputyRate = support.deputy
        ? Math.min(C.DEPUTY_FOOD_CAP_RATE_MAX, 0.03 + support.deputy.lea * 0.001 + support.deputy.pol * 0.0006)
        : 0;
    const deputyFoodBonus = Math.floor(support.baseFoodCap * deputyRate);
    const deputySupport = support.deputy
        ? Math.min(C.DEPUTY_POWER_CAP, Math.floor(deputyFoodBonus * C.DEPUTY_FOOD_POWER_WEIGHT))
        : 0;

    // 7. 地形、8. 天氣：atk + def 加總的半數加成
    const terrainFactor = 1 + env.terrainAtkDefSum * 0.5;
    const weatherFactor = 1 + env.weatherAtkDefSum * 0.5;

    // 9. 轉生倍率
    const reincarnationMod = 1 + general.reincarnation * C.REINCARNATION_MOD_PER_TIME;

    return Math.floor(
        (generalPower + troopBasePower + spiritBonus + strategistSupport + deputySupport)
        * aptitude
        * tallyPowerMod
        * terrainFactor
        * weatherFactor
        * reincarnationMod,
    );
}
