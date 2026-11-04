import { TestSuite, assert } from './TestRunner';
import { TROOP_COUNTER_MAP, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopCounterAnnouncer, troopCounterLine } from '../assets/scripts/core/systems/TroopCounterScripts';

export function createTroopCounterScriptsSuite(): TestSuite {
    const suite = new TestSuite('TroopCounterScripts');

    suite.test('剋制表的每一組都有句子', () => {
        for (const [attacker, defender] of Object.entries(TROOP_COUNTER_MAP)) {
            assert.isTrue(!!troopCounterLine(attacker as TroopType, defender as TroopType));
        }
    });

    suite.test('槍兵剋騎兵照規格句；沒有剋制就沒有句子', () => {
        assert.equals('步兵嚴陣以待，騎兵衝鋒被長矛陣擋下！', troopCounterLine(TroopType.Pikeman, TroopType.Cavalry));
        assert.isTrue(troopCounterLine(TroopType.Cavalry, TroopType.Pikeman) === null);
        assert.isTrue(troopCounterLine(TroopType.Cavalry, TroopType.Archer) === null);
    });

    suite.test('同一組只播一次，不同組各播一次', () => {
        const announcer = new TroopCounterAnnouncer();
        assert.isTrue(announcer.take(TroopType.Pikeman, TroopType.Cavalry) !== null);
        assert.isTrue(announcer.take(TroopType.Pikeman, TroopType.Cavalry) === null);
        assert.isTrue(announcer.take(TroopType.Cavalry, TroopType.Pikeman) === null);
        assert.isTrue(announcer.take(TroopType.Cavalry, TroopType.Shield) !== null);
    });

    return suite;
}
