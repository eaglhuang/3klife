import { arenaScoreOfTeam } from '../assets/scripts/core/systems/ArenaScore';
import { filterMonthlyScenarioTeam, monthlyScenarioOf, monthlyScenarioScore, monthlyScenarioViolationOf, recordMonthlyScenario } from '../assets/scripts/core/systems/MonthlyScenarioCup';
import { TestSuite, assert } from './TestRunner';

const member = { str: 80, int: 70, lea: 60, luk: 50, tacticPoints: 10, terrain: 'A', hp: 100, maxHp: 100 };

export function createMonthlyScenarioCupSuite(): TestSuite {
    const suite = new TestSuite('MonthlyScenarioCup (月度場景賽 PROG-2-1609)');

    suite.test('1~4 月依規格表開賽，未定月份回 null', () => {
        assert.equals('冰天雪地', monthlyScenarioOf(1)?.name ?? '');
        assert.equals('山地奇兵', monthlyScenarioOf(4)?.name ?? '');
        assert.equals(null, monthlyScenarioOf(7));
    });

    suite.test('積分與競技場公式相同；場景克制係數放大戰法點數', () => {
        assert.equals(arenaScoreOfTeam([member]), monthlyScenarioScore([member]));
        assert.isTrue(monthlyScenarioScore([member], 1.5) > monthlyScenarioScore([member]));
    });

    suite.test('歷史紀錄：同月只留最高分', () => {
        let history = recordMonthlyScenario([], { monthKey: '2026-01', scenarioName: '冰天雪地', score: 300 });
        history = recordMonthlyScenario(history, { monthKey: '2026-01', scenarioName: '冰天雪地', score: 200 });
        assert.equals(300, history[0].score);
        history = recordMonthlyScenario(history, { monthKey: '2026-01', scenarioName: '冰天雪地', score: 400 });
        history = recordMonthlyScenario(history, { monthKey: '2026-02', scenarioName: '赤壁水戰', score: 100 });
        assert.equals(2, history.length);
        assert.equals(400, history.find((h) => h.monthKey === '2026-01')!.score);
    });

    suite.test('參賽資格：冰天雪地擋騎兵戰法、赤壁水戰要水軍或弓兵 A 以上（PROG-2-1610）', () => {
        const jan = monthlyScenarioOf(1)!;
        const feb = monthlyScenarioOf(2)!;
        assert.equals('banned-tactic', monthlyScenarioViolationOf(jan, { tacticTags: ['cavalry'] }));
        assert.equals(null, monthlyScenarioViolationOf(jan, { tacticTags: ['fire'] }));
        assert.equals(null, monthlyScenarioViolationOf(feb, { troopAptitude: { ARCHER: 'A' } }));
        assert.equals('missing-aptitude', monthlyScenarioViolationOf(feb, { troopAptitude: { ARCHER: 'B', CAVALRY: 'S' } }));
        assert.equals(null, monthlyScenarioViolationOf(monthlyScenarioOf(3)!, {}));
        const team = filterMonthlyScenarioTeam(feb, [{ troopAptitude: { NAVY: 'S' } }, { troopAptitude: {} }]);
        assert.equals(1, team.accepted.length);
        assert.equals('missing-aptitude', team.rejected[0].reason);
    });

    return suite;
}
