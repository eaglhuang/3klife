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

import { applySpecialActionReset } from '../assets/scripts/battle/skills/special/SpecialActionResetRule';

export function createSpecialActionResetRuleSuite(): TestSuite {
    const suite = new TestSuite('SpecialActionResetRule（ULT-10 行動條重置 PROG-2-1975）');
    suite.test('預設再行動 1 次，寫入 actionResets', () => {
        const s = new BattleState(); s.addUnit(troop('a'));
        assert.equals('a', applySpecialActionReset(s, ['a'], { sourceSkillId: 'ult-x' }).join());
        const r = s.getActionReset('a')!;
        assert.equals(1, r.remainingExtraActions); assert.equals('ult-x', r.battleSkillId); assert.equals(1, r.firstHitMultiplier);
    });
    suite.test('已有較多次數不覆寫；較少則提升並保留原首擊設定', () => {
        const s = new BattleState(); s.addUnit(troop('a')); s.addUnit(troop('b', Faction.Player, 1));
        s.setActionReset({ unitUid: 'a', battleSkillId: 'old', firstHitMultiplier: 1.5, firstHitPending: true, remainingExtraActions: 2 });
        s.setActionReset({ unitUid: 'b', battleSkillId: 'old', firstHitMultiplier: 1.5, firstHitPending: true, remainingExtraActions: 1 });
        assert.equals('b', applySpecialActionReset(s, ['a', 'b'], { sourceSkillId: 'ult-x', extraActions: 2 }).join());
        const b = s.getActionReset('b')!;
        assert.equals(2, b.remainingExtraActions); assert.equals(1.5, b.firstHitMultiplier); assert.equals('old', b.battleSkillId);
    });
    suite.test('陣亡、不存在或次數 0 不生效', () => {
        const s = new BattleState(); const d = troop('d'); d.currentHp = 0; s.addUnit(d);
        assert.equals(0, applySpecialActionReset(s, ['d', 'x'], { sourceSkillId: 'u' }).length);
        s.addUnit(troop('a', Faction.Player, 1));
        assert.equals(0, applySpecialActionReset(s, ['a'], { sourceSkillId: 'u', extraActions: 0 }).length);
    });
    return suite;
}
