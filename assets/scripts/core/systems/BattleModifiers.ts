// @spec-source → 數值系統.md §F-4（getTerrainMod、getWeatherMod 用法）、兵種（虎符）系統.md §綜合虎符適性乘數、§F-5 TALLY_TERRAIN_AFFINITY_MOD（PROG-2-0210）
/**
 * BattleModifiers — 總戰力的地形、天氣攻防查表與虎符適性修正（純邏輯，不依賴 cc）
 *
 * 地形與天氣攻防沿用戰鬥既有的適性表（APTITUDE_MODIFIERS，經 terrainGradeOf、weatherGradeOf 查等級），
 * 與 resolveAptitude 的戰鬥判定一致，不另外抄一份數字。
 * 規格偽代碼用到的 getTerrainMod、getWeatherMod 沒有定義查表，這裡的做法是暫定。
 *
 * Unity 對照：像 ScriptableObject 的查表，地形與天氣直接引用戰鬥那張表，只是把它換成總戰力要的輸入。
 */
import { APTITUDE_MODIFIERS, AptitudeGrade, AptitudeProfile, terrainGradeOf, weatherGradeOf } from './BattleAptitude';
import type { RatingEnv } from './BattlePowerRating';

export interface AtkDefMod {
    atk: number;
    def: number;
}

/** 地形攻防修正：主將在該地形的適性等級 → 攻防加成（沿用戰鬥適性表） */
export function getTerrainMod(profile: AptitudeProfile | null | undefined, terrain: string | null | undefined): AtkDefMod {
    const m = APTITUDE_MODIFIERS[terrainGradeOf(profile, terrain)];
    return { atk: m.atk, def: m.def };
}

/** 天氣攻防修正：主將在該天氣的適性等級 → 攻防加成（沿用戰鬥適性表） */
export function getWeatherMod(profile: AptitudeProfile | null | undefined, weather: string | null | undefined): AtkDefMod {
    const m = APTITUDE_MODIFIERS[weatherGradeOf(profile, weather)];
    return { atk: m.atk, def: m.def };
}

/** 把地形、天氣查表結果整理成總戰力的 RatingEnv（atk + def 加總，由 F-4 再乘 0.5） */
export function buildRatingEnv(
    profile: AptitudeProfile | null | undefined,
    terrain: string | null | undefined,
    weather: string | null | undefined,
): RatingEnv {
    const t = getTerrainMod(profile, terrain);
    const w = getWeatherMod(profile, weather);
    return {
        terrainAtkDefSum: t.atk + t.def,
        weatherAtkDefSum: w.atk + w.def,
    };
}

/** F-5 TALLY_TERRAIN_AFFINITY_MOD：虎符在該地形的適性等級 → 乘數 */
export const TALLY_TERRAIN_AFFINITY_MOD: Readonly<Record<AptitudeGrade, number>> = {
    S: 1.2,
    A: 1.1,
    B: 1.0,
    C: 0.9,
    D: 0.8,
};

/** F-5：家族共鳴、史實羈絆、性別匹配的乘數 */
export const TALLY_CLAN_RESONANCE_MOD = 1.08;
export const TALLY_CLAN_BOND_MOD = 1.05;
export const TALLY_GENDER_MATCH_MOD = 1.06;

export type TallyGenderPref = 'NONE' | 'MALE' | 'FEMALE';
export type GeneralGender = 'MALE' | 'FEMALE';

export interface TallyAffinityInput {
    /** 虎符在當前地形的適性等級（呼叫端從虎符的 terrainAffinity 取得） */
    terrainGrade: AptitudeGrade;
    /** 主將與虎符同家族 */
    sameClan: boolean;
    /** 主將與虎符有史實羈絆（資料來源未定，呼叫端暫時傳入） */
    hasClanBond: boolean;
    genderPref: TallyGenderPref;
    generalGender: GeneralGender;
}

/**
 * 綜合虎符適性乘數 = 地形 × 家族 × 性別。
 * 家族同時符合家族與史實羈絆時兩者相乘（規格：可疊加）；性別不匹配不懲罰（只有正向加成）。
 */
export function calculateTallyAffinityMod(input: TallyAffinityInput): number {
    const terrainMod = TALLY_TERRAIN_AFFINITY_MOD[input.terrainGrade];
    let clanMod = 1;
    if (input.sameClan) clanMod = TALLY_CLAN_RESONANCE_MOD;
    if (input.hasClanBond) clanMod *= TALLY_CLAN_BOND_MOD;
    const genderMod = input.genderPref !== 'NONE' && input.genderPref === input.generalGender
        ? TALLY_GENDER_MATCH_MOD
        : 1;
    return terrainMod * clanMod * genderMod;
}
