import { TestSuite, assert } from './TestRunner';
import {
    adjustedAttackChance, averageMilitaryIndex, DEFENSIVE_ATTACK_MULTIPLIER, isWeakNation, militaryIndexOf,
} from '../assets/scripts/core/systems/RivalMilitaryIndex';
import { advanceRivalSeason, createRivalWorld } from '../assets/scripts/core/systems/RivalNations';

export function createRivalMilitaryIndexSuite(): TestSuite {
    const suite = new TestSuite('RivalMilitaryIndex (他國軍力指數 PROG-2-1706)');

    suite.test('平均軍力與弱勢門檻 0.7', () => {
        const avg = averageMilitaryIndex([{ troops: 10000 }, { troops: 6000 }, { troops: 2000 }]);
        assert.equals(6000, avg);
        assert.isTrue(isWeakNation(militaryIndexOf({ troops: 2000 }), avg));
        assert.isFalse(isWeakNation(militaryIndexOf({ troops: 4200 }), avg));
        assert.isFalse(isWeakNation(0, 0));
    });

    suite.test('弱勢國家進攻機率乘上守勢倍率', () => {
        assert.equals(0.4 * DEFENSIVE_ATTACK_MULTIPLIER, adjustedAttackChance(0.4, true));
        assert.equals(0.4, adjustedAttackChance(0.4, false));
    });

    suite.test('季度推進接線冒煙：弱國高擲骰值不進攻', () => {
        const base = createRivalWorld();
        const weakId = base.nations.reduce((a, b) => (a.troops <= b.troops ? a : b)).id;
        const world = { nations: base.nations.map(n => n.id === weakId ? { ...n, atWar: true, troops: 1 } : { ...n, atWar: false, relation: 50 }) };
        const result = advanceRivalSeason(world, () => 0.999, { troops: 0, food: 0, gold: 0 });
        assert.equals(0, result.events.filter(e => e.nationId === weakId).length);
    });

    return suite;
}
