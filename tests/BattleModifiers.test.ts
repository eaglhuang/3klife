// @spec-source → 數值系統.md §F-4、兵種（虎符）系統.md §綜合虎符適性乘數、§F-5（PROG-2-0210）
/**
 * BattleModifiers — 總戰力的地形、天氣查表與虎符適性修正的 headless 測試（PROG-2-0210）
 *
 * 地形與天氣沿用戰鬥的適性表（APTITUDE_MODIFIERS），測試直接引用該表，數值改動時不必同步改測試。
 */
import { TestSuite, assert } from './TestRunner';
import { APTITUDE_MODIFIERS, AptitudeProfile } from '../assets/scripts/core/systems/BattleAptitude';
import {
    buildRatingEnv,
    calculateTallyAffinityMod,
    getTerrainMod,
    getWeatherMod,
    TALLY_CLAN_BOND_MOD,
    TALLY_CLAN_RESONANCE_MOD,
    TALLY_GENDER_MATCH_MOD,
    TALLY_TERRAIN_AFFINITY_MOD,
} from '../assets/scripts/core/systems/BattleModifiers';
import { calculateBattlePowerRating, RatingGeneral, RatingSupport, RatingTroop } from '../assets/scripts/core/systems/BattlePowerRating';

const PROFILE: AptitudeProfile = {
    terrainAptitude: { PLAIN: 'S', MOUNTAIN: 'D' },
    weatherAptitude: { SUNNY: 'A' },
};

function near(expected: number, actual: number, msg?: string): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `${msg ?? ''} 期望 ${expected}，實際 ${actual}`);
}

export function createBattleModifiersSuite(): TestSuite {
    const suite = new TestSuite('BattleModifiers');

    suite.test('地形攻防：S 地形取戰鬥適性表的 S 值；D 地形取 D 值；沒有資料視為 B（0）', () => {
        near(APTITUDE_MODIFIERS.S.atk, getTerrainMod(PROFILE, 'plain').atk, '平原 atk');
        near(APTITUDE_MODIFIERS.S.def, getTerrainMod(PROFILE, 'plain').def, '平原 def');
        near(APTITUDE_MODIFIERS.D.atk, getTerrainMod(PROFILE, 'mountain').atk, '山地 atk');
        near(0, getTerrainMod(PROFILE, 'forest').atk, '沒填的地形視為 B');
        near(0, getTerrainMod(null, 'plain').atk, '沒有 profile 視為 B');
    });

    suite.test('天氣攻防：晴天（clear）對應 SUNNY 的 A 值；沒填的天氣視為 B（0）', () => {
        near(APTITUDE_MODIFIERS.A.atk, getWeatherMod(PROFILE, 'SUNNY').atk, '晴天 atk');
        near(0, getWeatherMod(PROFILE, 'rain').atk, '雨天沒填視為 B');
    });

    suite.test('RatingEnv：atk + def 加總，平原 S（0.4）、晴天 A（0.2）', () => {
        const env = buildRatingEnv(PROFILE, 'plain', 'SUNNY');
        near(APTITUDE_MODIFIERS.S.atk + APTITUDE_MODIFIERS.S.def, env.terrainAtkDefSum, '地形加總');
        near(APTITUDE_MODIFIERS.A.atk + APTITUDE_MODIFIERS.A.def, env.weatherAtkDefSum, '天氣加總');
    });

    suite.test('虎符地形乘數：S 1.2、A 1.1、B 1.0、C 0.9、D 0.8（F-5 原值）', () => {
        assert.equals(1.2, TALLY_TERRAIN_AFFINITY_MOD.S);
        assert.equals(1.1, TALLY_TERRAIN_AFFINITY_MOD.A);
        assert.equals(1.0, TALLY_TERRAIN_AFFINITY_MOD.B);
        assert.equals(0.9, TALLY_TERRAIN_AFFINITY_MOD.C);
        assert.equals(0.8, TALLY_TERRAIN_AFFINITY_MOD.D);
    });

    suite.test('虎符適性：同家族 ×1.08；史實羈絆 ×1.05；性別匹配 ×1.06；三者可疊加', () => {
        const base = { terrainGrade: 'B' as const, sameClan: false, hasClanBond: false, genderPref: 'NONE' as const, generalGender: 'MALE' as const };
        near(1, calculateTallyAffinityMod(base), '無任何加成');
        near(TALLY_CLAN_RESONANCE_MOD, calculateTallyAffinityMod({ ...base, sameClan: true }), '同家族');
        near(TALLY_CLAN_BOND_MOD, calculateTallyAffinityMod({ ...base, hasClanBond: true }), '史實羈絆');
        near(TALLY_GENDER_MATCH_MOD, calculateTallyAffinityMod({ ...base, genderPref: 'MALE' }), '性別匹配');
        near(1.2 * 1.08 * 1.05 * 1.06, calculateTallyAffinityMod({ ...base, terrainGrade: 'S', sameClan: true, hasClanBond: true, genderPref: 'MALE' }), '三者疊加加地形 S');
    });

    suite.test('虎符性別：偏好與主將性別不符不懲罰（×1.0）；地形 D 單獨生效 ×0.8', () => {
        near(1, calculateTallyAffinityMod({ terrainGrade: 'B', sameClan: false, hasClanBond: false, genderPref: 'FEMALE', generalGender: 'MALE' }), '不匹配不懲罰');
        near(0.8, calculateTallyAffinityMod({ terrainGrade: 'D', sameClan: false, hasClanBond: false, genderPref: 'NONE', generalGender: 'MALE' }), 'D 地形');
    });

    suite.test('接進總戰力：基準 265 × 平原 S 地形 1.2 × 晴天 A 天氣 1.1 → floor(349.8) = 349', () => {
        const general: RatingGeneral = {
            str: 80, int: 60, lea: 50, luk: 0, cha: 0, pol: 0,
            agePhase: 'Prime', troopAptitude: 'B', reincarnation: 0,
        };
        const troop: RatingTroop = { baseType: 'INFANTRY', attack: 40, defense: 20, move: 3, range: 1, isSpecial: false };
        const support: RatingSupport = { spiritCardPower: null, strategist: null, deputy: null, baseFoodCap: 0 };
        const env = buildRatingEnv(PROFILE, 'plain', 'SUNNY');
        // 地形、天氣的加總各乘 0.5，所以 S 地形 0.4×0.5 = 0.2 → ×1.2；A 天氣 0.2×0.5 = 0.1 → ×1.1
        const expectedFactor = 1 + env.terrainAtkDefSum * 0.5;
        const expectedWeather = 1 + env.weatherAtkDefSum * 0.5;
        assert.equals(349, calculateBattlePowerRating(general, troop, null, support, env));
        near(1.2, expectedFactor, '地形因子');
        near(1.1, expectedWeather, '天氣因子');
    });

    return suite;
}
