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

import { applySpecialFieldShift } from '../assets/scripts/battle/skills/special/SpecialFieldShiftRule';

export function createSpecialFieldShiftRuleSuite(): TestSuite {
    const suite = new TestSuite('SpecialFieldShiftRule（ULT-10 場勢切換 PROG-2-1977）');
    suite.test('切換場勢並回傳前一個', () => {
        const s = new BattleState();
        const r = applySpecialFieldShift(s, BattleTactic.FireAttack);
        assert.equals('APPLIED', r.outcome); assert.equals(BattleTactic.Normal, r.previous);
        assert.equals(BattleTactic.FireAttack, s.battleTactic);
    });
    suite.test('同場勢 NO_EFFECT；白名單外 REJECTED 且不改', () => {
        const s = new BattleState(); s.battleTactic = BattleTactic.NightRaid;
        assert.equals('NO_EFFECT', applySpecialFieldShift(s, BattleTactic.NightRaid).outcome);
        assert.equals('REJECTED', applySpecialFieldShift(s, 'meteor').outcome);
        assert.equals(BattleTactic.NightRaid, s.battleTactic);
    });
    return suite;
}
