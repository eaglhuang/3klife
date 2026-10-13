// @spec-source → 數值系統.md §F-4 主將帶隊總戰力、§F-5 數值常數（PROG-2-0209）
/**
 * BattlePowerRating — 主將帶隊總戰力的 headless 測試（PROG-2-0209）
 *
 * 基準組：主將 STR 80、INT 60、LEA 50、Prime、適性 B、0 轉；步兵 攻 40 防 20 移 3 射 1，無虎符、無支援、無地形天氣。
 * 基準戰力 = (80×0.5 + 50×0.3) + ((40+20)×0.5 + 3×50 + 1×30) = 55 + 210 = 265。
 */
import { TestSuite, assert } from './TestRunner';
import {
    BATTLE_POWER_CONSTANTS,
    calculateBattlePowerRating,
    calculateTallyPowerMod,
    RatingEnv,
    RatingGeneral,
    RatingSupport,
    RatingTroop,
} from '../assets/scripts/core/systems/BattlePowerRating';

const NO_SUPPORT: RatingSupport = { spiritCardPower: null, strategist: null, deputy: null, baseFoodCap: 0 };
const NO_ENV: RatingEnv = { terrainAtkDefSum: 0, weatherAtkDefSum: 0 };

function general(overrides: Partial<RatingGeneral> = {}): RatingGeneral {
    return {
        str: 80, int: 60, lea: 50, luk: 0, cha: 0, pol: 0,
        agePhase: 'Prime', troopAptitude: 'B', reincarnation: 0,
        ...overrides,
    };
}

function infantry(overrides: Partial<RatingTroop> = {}): RatingTroop {
    return { baseType: 'INFANTRY', attack: 40, defense: 20, move: 3, range: 1, isSpecial: false, ...overrides };
}

function rate(
    g: Partial<RatingGeneral> = {},
    t: Partial<RatingTroop> = {},
    tally: Parameters<typeof calculateBattlePowerRating>[2] = null,
    support: RatingSupport = NO_SUPPORT,
    env: RatingEnv = NO_ENV,
): number {
    return calculateBattlePowerRating(general(g), infantry(t), tally, support, env);
}

export function createBattlePowerRatingSuite(): TestSuite {
    const suite = new TestSuite('BattlePowerRating');

    suite.test('基準組：體能系步兵、Prime、適性 B → 265', () => {
        assert.equals(265, rate());
    });

    suite.test('年齡：Child 能力為 0，只剩兵種基礎 210；Over 為 0.5 倍（237）', () => {
        assert.equals(210, rate({ agePhase: 'Child' }));
        assert.equals(237, rate({ agePhase: 'Over' }));
    });

    suite.test('兵種：非體能系（弓兵）主將用智力計算，55 → 45', () => {
        // 智力 60×0.5 + 統御 50×0.3 = 45；兵種基礎仍是 210
        assert.equals(255, rate({}, { baseType: 'ARCHER' }));
    });

    suite.test('適性：S 效率 1.2 → 265×1.2 = 318', () => {
        assert.equals(318, rate({ troopAptitude: 'S' }));
    });

    suite.test('英靈卡：只取一張，超過 500 封頂；未達上限照加', () => {
        assert.equals(565, rate({}, {}, null, { ...NO_SUPPORT, spiritCardPower: 300 }));
        assert.equals(765, rate({}, {}, null, { ...NO_SUPPORT, spiritCardPower: 800 }));
        assert.equals(BATTLE_POWER_CONSTANTS.SPIRIT_CARD_POWER_CAP, 500);
    });

    suite.test('參謀：floor((內政×0.7 + 政治×0.5)×0.45)，上限 220', () => {
        // 內政 100 → floor(70×0.45) = floor(31.5) = 31
        assert.equals(296, rate({}, {}, null, { ...NO_SUPPORT, strategist: { int: 100, pol: 0 } }));
        // 內政 1000 → 315，封頂 220
        assert.equals(485, rate({}, {}, null, { ...NO_SUPPORT, strategist: { int: 1000, pol: 0 } }));
    });

    suite.test('後勤：糧草上限 × 折算率，再 ×0.05 封頂 180（LEA 50 → 8%，800 → 40）', () => {
        const support: RatingSupport = {
            ...NO_SUPPORT,
            baseFoodCap: 10000,
            deputy: { lea: 50, pol: 0 },
        };
        assert.equals(305, rate({}, {}, null, support));
    });

    suite.test('轉生：每轉 +15%，2 轉 ×1.3 → floor(344.5) = 344', () => {
        assert.equals(344, rate({ reincarnation: 2 }));
    });

    suite.test('虎符：特殊兵種才加成；UR 5★ 共鳴 → 1.5 × 1.4 × 1.1 = 2.31，265 → 612', () => {
        const tally = { quality: 'UR' as const, star: 5, resonance: true, affinityMod: 1 };
        assert.equals(612, rate({}, { isSpecial: true }, tally));
        assert.equals(265, rate({}, { isSpecial: false }, tally), '非特殊兵種不吃虎符');
    });

    suite.test('虎符加成數值：R 1★ 無共鳴、無適性 → 1.08；SR 2★ 無共鳴 → 1.15×1.16', () => {
        assert.isTrue(Math.abs(calculateTallyPowerMod({ quality: 'R', star: 1, resonance: false, affinityMod: 1 }, true) - 1.08) < 1e-9);
        assert.isTrue(Math.abs(calculateTallyPowerMod({ quality: 'SR', star: 2, resonance: false, affinityMod: 1 }, true) - 1.334) < 1e-9);
        assert.equals(1, calculateTallyPowerMod(null, true), '無虎符為 1');
    });

    suite.test('地形與天氣：atk+def 加總 ×0.5 加成（地形 +2 → ×2 = 530；天氣 +1 → ×1.5 = 397）', () => {
        assert.equals(530, rate({}, {}, null, NO_SUPPORT, { terrainAtkDefSum: 2, weatherAtkDefSum: 0 }));
        assert.equals(397, rate({}, {}, null, NO_SUPPORT, { terrainAtkDefSum: 0, weatherAtkDefSum: 1 }));
    });

    return suite;
}
