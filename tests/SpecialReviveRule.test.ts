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

import { applySpecialRevive } from '../assets/scripts/battle/skills/special/SpecialReviveRule';

export function createSpecialReviveRuleSuite(): TestSuite {
    const suite = new TestSuite('SpecialReviveRule（ULT-10 復活 PROG-2-1973）');
    const setup = () => {
        const s = new BattleState();
        ['a', 'b', 'c'].forEach((id, i) => { const u = troop(id, Faction.Player, i); s.addUnit(u); u.currentHp = 0; s.removeUnit(id); });
        return s;
    };
    suite.test('依比例復活 1 名（預設），放回戰場', () => {
        const s = setup();
        const r = applySpecialRevive(s, Faction.Player, { reviveHpRatio: 0.5 });
        assert.equals(1, r.length);
        assert.equals(50, r[0].currentHp);
        assert.isTrue(s.units.has(r[0].id));
        assert.equals(2, s.fallenUnits.length);
    });
    suite.test('maxCount 可復活多名，不足時有幾名復活幾名', () => {
        const s = setup();
        assert.equals(3, applySpecialRevive(s, Faction.Player, { reviveHpRatio: 1, maxCount: 5 }).length);
        assert.equals(0, s.fallenUnits.length);
    });
    suite.test('比例缺值或 ≤0 不生效；他方陣營無陣亡則空', () => {
        const s = setup();
        assert.equals(0, applySpecialRevive(s, Faction.Player, {}).length);
        assert.equals(0, applySpecialRevive(s, Faction.Enemy, { reviveHpRatio: 1 }).length);
        assert.equals(3, s.fallenUnits.length);
    });
    return suite;
}
