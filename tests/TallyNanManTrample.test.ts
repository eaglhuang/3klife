/**
 * 南蠻巨型踐踏：只越過敵方步兵（PROG-2-1578）。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { canTrampleOver } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

function unit(type: TroopType, faction: Faction, template?: string): TroopUnit {
    const u = new TroopUnit(`${type}-${faction}`, type, faction, { hp: 100, attack: 30, defense: 20, moveRange: 2, attackRange: 1 });
    if (template) u.tallyTemplateId = template;
    return u;
}

export function createTallyNanManTrampleSuite(): TestSuite {
    const suite = new TestSuite('TallyNanManTrample (南蠻巨型踐踏 PROG-2-1578)');

    suite.test('南蠻可越過敵方步兵；友軍、其他兵種不行', () => {
        const nm = unit(TroopType.Cavalry, Faction.Player, 'tiger-tally-nan-man');
        assert.equals(true, canTrampleOver(nm, unit(TroopType.Infantry, Faction.Enemy)));
        assert.equals(false, canTrampleOver(nm, unit(TroopType.Infantry, Faction.Player)));
        assert.equals(false, canTrampleOver(nm, unit(TroopType.Shield, Faction.Enemy)));
    });

    suite.test('沒有南蠻符的部隊不能越過', () => {
        assert.equals(false, canTrampleOver(unit(TroopType.Cavalry, Faction.Player), unit(TroopType.Infantry, Faction.Enemy)));
    });

    return suite;
}
