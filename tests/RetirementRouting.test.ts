import { assert, TestSuite } from './TestRunner';
import { routeRetirement } from '../assets/scripts/core/systems/RetirementRouting';

export function createRetirementRoutingSuite(): TestSuite {
    const suite = new TestSuite('RetirementRouting');
    suite.test('武職與文職回傳教官，不產虎符', () => {
        assert.equals('tactic_mentor', routeRetirement({ primaryClass: 'Warrior' }).destination);
        assert.equals('wisdom_mentor', routeRetirement({ primaryClass: 'Scholar', subClass: null }).destination);
    });
    suite.test('兩種相反主副職均為全能教官', () => {
        for (const [primaryClass, subClass] of [['Warrior', 'Scholar'], ['Scholar', 'Warrior']]) {
            const result = routeRetirement({ primaryClass, subClass });
            assert.equals('all_round_mentor', result.destination);
            assert.equals('DUAL_CLASS', result.reason);
        }
    });
    suite.test('相同主副職不算雙職', () => {
        assert.equals('tactic_mentor', routeRetirement({ primaryClass: 'Warrior', subClass: 'Warrior' }).destination);
    });
    suite.test('缺職能與未知主副職回安全預設', () => {
        for (const general of [{}, { primaryClass: 'unknown' }, { primaryClass: 'Scholar', subClass: 'unknown' }, { subClass: 'Warrior' }]) {
            const result = routeRetirement(general);
            assert.equals('wisdom_mentor', result.destination);
            assert.equals('UNKNOWN_CLASS', result.reason);
        }
    });
    suite.test('不改輸入且結果可重現', () => {
        const general = Object.freeze({ primaryClass: 'Warrior', subClass: 'Scholar' });
        const before = JSON.stringify(general);
        assert.equals(JSON.stringify(routeRetirement(general)), JSON.stringify(routeRetirement(general)));
        assert.equals(before, JSON.stringify(general));
    });
    return suite;
}
