/** E-9 他國興衰固定規格回歸（PROG-2-9013）；不涵蓋 E-10 接線。 */
import {
    NATION_STANDING_EFFECTS, nationPowerScore, nationStandingOf, shouldEvaluateStanding,
    type NationStanding,
} from '../assets/scripts/core/systems/RivalRiseFall';
import { TestSuite, assert } from './TestRunner';

export function createRivalRiseFallBoundarySuite(): TestSuite {
    const suite = new TestSuite('RivalRiseFallBoundary (E-9 PROG-2-9013)');

    // 固定期待值取自 E-9，不從受測門檻或權重常數產生。
    const thresholds: ReadonlyArray<readonly [number, NationStanding, NationStanding]> = [
        [1000, 'COLLAPSING', 'DECLINING'],
        [3000, 'DECLINING', 'STABLE'],
        [6000, 'STABLE', 'STRONG'],
        [10000, 'STRONG', 'HEGEMONY'],
    ];
    for (const [threshold, lower, upper] of thresholds) {
        const cases: ReadonlyArray<readonly [number, NationStanding]> = [
            [threshold - 1, lower], [threshold, lower], [threshold + 1, upper],
        ];
        for (const [power, expected] of cases) {
            suite.test(`E-9 國力 ${power} 應為 ${expected}`, () => {
                assert.equals(expected, nationStandingOf(power));
            });
        }
    }

    const powerCases = [
        { name: '全零', input: { troops: 0, generalCount: 0, territories: 0, fame: 0 }, expected: 0 },
        { name: '兵力一單位', input: { troops: 1, generalCount: 0, territories: 0, fame: 0 }, expected: 1 },
        { name: '武將一位', input: { troops: 0, generalCount: 1, territories: 0, fame: 0 }, expected: 200 },
        { name: '領地一處', input: { troops: 0, generalCount: 0, territories: 1, fame: 0 }, expected: 500 },
        { name: '名聲一點', input: { troops: 0, generalCount: 0, territories: 0, fame: 1 }, expected: 1 },
    ];
    for (const { name, input, expected } of powerCases) {
        suite.test(`E-9 國力隔離輸入：${name}`, () => {
            assert.equals(expected, nationPowerScore(input));
        });
    }

    const effects: ReadonlyArray<readonly [NationStanding, number, number, number]> = [
        ['HEGEMONY', 10, 0, 0],
        ['STRONG', 0, 0, 0],
        ['STABLE', 0, 0, 0],
        ['DECLINING', 0, 0, 0],
        ['COLLAPSING', 0, 0.2, 0.5],
    ];
    for (const [standing, hostility, defection, invasion] of effects) {
        suite.test(`E-9 ${standing} 三項效果符合固定規格`, () => {
            const actual = NATION_STANDING_EFFECTS[standing];
            assert.equals(hostility, actual.hostilityPerSeason, `${standing}: 每季敵對值`);
            assert.equals(defection, actual.defectionRateBonus, `${standing}: 叛逃率加算`);
            assert.equals(invasion, actual.invasionChanceBonus, `${standing}: 入侵率加算`);
        });
    }

    // 原卡 1475 明定第 0 季也評估；不從 SEASONS_PER_YEAR 推導期待值。
    const evaluationBySeason = [true, false, false, false, true, false, false, false, true, false];
    evaluationBySeason.forEach((expected, season) => {
        suite.test(`E-9 第 ${season} 季評估應為 ${expected}`, () => {
            assert.equals(expected, shouldEvaluateStanding(season));
        });
    });

    return suite;
}
