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

import { attachDeathTrigger, takeDeathTriggers } from '../assets/scripts/battle/skills/special/SpecialDeathTriggerRule';

export function createSpecialDeathTriggerRuleSuite(): TestSuite {
    const suite = new TestSuite('SpecialDeathTriggerRule（ULT-10 死亡觸發 PROG-2-1976）');
    suite.test('掛上後陣亡移出才取得，取一次即清', () => {
        const s = new BattleState(); const a = troop('a'); s.addUnit(a);
        assert.equals('a', attachDeathTrigger(s, ['a'], 'boom').join());
        assert.equals(0, takeDeathTriggers(s, 'a').length);
        a.currentHp = 0; s.removeUnit('a');
        assert.equals('boom', takeDeathTriggers(s, 'a').join());
        assert.equals(0, takeDeathTriggers(s, 'a').length);
    });
    suite.test('同效果不重複掛；陣亡者與空 id 略過', () => {
        const s = new BattleState(); s.addUnit(troop('a')); const d = troop('d', Faction.Player, 1); d.currentHp = 0; s.addUnit(d);
        attachDeathTrigger(s, ['a'], 'boom');
        assert.equals(0, attachDeathTrigger(s, ['a', 'd'], 'boom').length);
        assert.equals(0, attachDeathTrigger(s, ['a'], '').length);
        assert.equals(1, s.deathTriggers.get('a')!.length);
    });
    return suite;
}
