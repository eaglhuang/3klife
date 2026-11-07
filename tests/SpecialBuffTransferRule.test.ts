import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { BattleTactic, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TestSuite, assert } from './TestRunner';

function troop(id: string, faction = Faction.Player, lane = 0, depth = 0): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 10 });
    u.moveTo(lane, depth);
    return u;
}
void BattleTactic;

import { applySpecialBuffTransfer } from '../assets/scripts/battle/skills/special/SpecialBuffTransferRule';

export function createSpecialBuffTransferRuleSuite(): TestSuite {
    const suite = new TestSuite('SpecialBuffTransferRule（ULT-10 增益轉移 PROG-2-1974）');
    const setup = () => {
        const s = new BattleState();
        const c = troop('c', Faction.Player, 0); c.shield = 40; c.morale = 10; c.moraleTurns = 3;
        s.addUnit(c); s.addUnit(troop('a', Faction.Player, 1)); s.addUnit(troop('e', Faction.Enemy, 2, 5));
        return s;
    };
    suite.test('護盾與士氣整份轉給友軍，施放者清零', () => {
        const s = setup();
        const r = applySpecialBuffTransfer(s, 'c', ['a'], {});
        assert.equals(2, r.moved.length);
        const a = s.units.get('a')!, c = s.units.get('c')!;
        assert.equals(40, a.shield); assert.equals(10, a.morale); assert.equals(3, a.moraleTurns);
        assert.equals(0, c.shield); assert.equals(0, c.morale);
    });
    suite.test('maxBuffs 限制種類數，只轉護盾', () => {
        const s = setup();
        assert.equals('shield', applySpecialBuffTransfer(s, 'c', ['a'], { maxBuffs: 1 }).moved.join());
        assert.equals(10, s.units.get('c')!.morale);
    });
    suite.test('敵軍或自己不能當接收者，無效時施放者不變', () => {
        const s = setup();
        assert.equals(0, applySpecialBuffTransfer(s, 'c', ['e', 'c'], {}).moved.length);
        assert.equals(40, s.units.get('c')!.shield);
    });
    return suite;
}
