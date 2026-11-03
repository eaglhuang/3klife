/** 月度威力積分交互回歸（PROG-2-9014），沿用 1611/1616 暫定規則。 */
import {
    monthlyScenarioMemberScore, monthlyScenarioOf, monthlyScenarioTeamScore,
    type MonthlyScenarioMember,
} from '../assets/scripts/core/systems/MonthlyScenarioCup';
import { TestSuite, assert } from './TestRunner';

function makeMember(overrides: Partial<MonthlyScenarioMember> = {}): MonthlyScenarioMember {
    return { str: 80, int: 60, lea: 40, luk: 20, tacticPoints: 40,
        terrain: 'S', counter: 1, hp: 50, maxHp: 100, ...overrides };
}

export function createMonthlyScenarioCupScoringSuite(): TestSuite {
    const suite = new TestSuite('MonthlyScenarioCupScoring (PROG-2-9014)');
    // 固定手算：屬性總和 200，S 地形 1.5，場景 counter 1.5，存活 0.5。
    // 基礎 (300+60)*0.5=180；戰法加成 (300+90)*0.5=195。
    const tacticMonths = [[3, 'int', 'str'], [7, 'str', 'lea'], [12, 'lea', 'int']] as const;
    for (const [month, matching, other] of tacticMonths) {
        for (const [stat, expected] of [[matching, 195], [other, 180], [undefined, 180]] as const) {
            suite.test(`${month} 月主屬性 ${stat ?? '未指定'} × 場景克制 × 半血`, () => {
                assert.equals(expected, monthlyScenarioMemberScore(
                    monthlyScenarioOf(month), makeMember({ tacticScalingStat: stat }), 1.5));
            });
        }
    }

    const aptitudeMonths = [[4, 'INFANTRY', 'CAVALRY'], [6, 'CAVALRY', 'ARCHER'], [8, 'ARCHER', 'INFANTRY']] as const;
    for (const [month, troop, otherTroop] of aptitudeMonths) {
        const cases = [
            // 只翻倍地形加成：S 1+(1.5-1)*2=2，(400+60)*0.5=230。
            { name: '命中 S', terrain: 'S', aptitude: { [troop]: 'S' }, expected: 230 },
            // A 地形加成同樣只放大加成部分：1.4，(280+60)*0.5=170。
            { name: '命中 S 配 A 地形', terrain: 'A', aptitude: { [troop]: 'S' }, expected: 170 },
            { name: '不同兵種 S', terrain: 'S', aptitude: { [otherTroop]: 'S' }, expected: 180 },
            { name: '同兵種 A', terrain: 'S', aptitude: { [troop]: 'A' }, expected: 180 },
        ];
        for (const { name, terrain, aptitude, expected } of cases) {
            suite.test(`${month} 月${name} × 場景克制 × 半血`, () => {
                assert.equals(expected, monthlyScenarioMemberScore(monthlyScenarioOf(month),
                    makeMember({ terrain, troopAptitude: aptitude }), 1.5));
            });
        }
    }

    for (const month of [null, 1, 2, 5, 9, 10, 11]) {
        suite.test(`${month ?? 'null'} 場景不套用威力加成`, () => {
            const scenario = month === null ? null : monthlyScenarioOf(month);
            if (month !== null) assert.isTrue(scenario !== null);
            assert.equals(180, monthlyScenarioMemberScore(scenario,
                makeMember({ tacticScalingStat: 'int', troopAptitude: { INFANTRY: 'S' } }), 1.5));
        });
    }

    // 兩人存活係數分別 0.5、0.25；固定期望不呼叫單人函式產生。
    for (const [month, expected] of [[null, 270], [3, 292.5], [4, 345]] as const) {
        suite.test(`${month ?? 'null'} 場景逐人套用不同血量再加總`, () => {
            const members = [makeMember({ tacticScalingStat: 'int', troopAptitude: { INFANTRY: 'S' } }),
                makeMember({ hp: 25, tacticScalingStat: 'int', troopAptitude: { INFANTRY: 'S' } })];
            assert.equals(expected, monthlyScenarioTeamScore(month === null ? null : monthlyScenarioOf(month), members, 1.5));
        });
    }

    suite.test('空隊在 null 與十二月份皆為零', () => {
        assert.equals(0, monthlyScenarioTeamScore(null, [], 1.5));
        for (let month = 1; month <= 12; month++) {
            assert.equals(0, monthlyScenarioTeamScore(monthlyScenarioOf(month), [], 1.5));
        }
    });

    suite.test('計分不改隊伍、成員、巢狀適性或場景規則', () => {
        const members = Object.freeze([Object.freeze(makeMember({
            tacticScalingStat: 'int', troopAptitude: Object.freeze({ INFANTRY: 'S' }),
        })), Object.freeze(makeMember({ hp: 25 }))]);
        const scenes = [null, monthlyScenarioOf(3), monthlyScenarioOf(4)];
        const before = JSON.stringify({ members, scenes });
        for (const scene of scenes) {
            monthlyScenarioMemberScore(scene, members[0], 1.5);
            monthlyScenarioTeamScore(scene, members, 1.5);
        }
        assert.equals(before, JSON.stringify({ members, scenes }));
    });

    return suite;
}
