import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { applySpecialDiscord } from '../assets/scripts/battle/skills/special/SpecialDiscordRule';
import { tileSkillCategoryOf } from '../assets/scripts/battle/skills/special/TileSkillCategory';
import { TestSuite, assert } from './TestRunner';

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 10 });
    u.moveTo(lane, depth);
    return u;
}

export function createSpecialDiscordRuleSuite(): TestSuite {
    const suite = new TestSuite('SpecialDiscordRule（SCN-09 離間 PROG-2-1983）');
    suite.test('2 格內有同伴：目標倒戈 1 回合，期滿換回', () => {
        const s = new BattleState();
        s.addUnit(troop('e1', Faction.Enemy, 0, 5)); s.addUnit(troop('e2', Faction.Enemy, 1, 6)); s.addUnit(troop('e3', Faction.Enemy, 0, 6));
        const r = applySpecialDiscord(s, Faction.Player, 'e1');
        assert.isTrue(r.applied);
        assert.equals('e3', r.partnerId);
        assert.equals(Faction.Player, s.units.get('e1')!.faction);
        s.tickControlledUnits();
        assert.equals(Faction.Enemy, s.units.get('e1')!.faction);
    });
    suite.test('2 格外無同伴、目標是己方或已被控制則不生效', () => {
        const s = new BattleState();
        s.addUnit(troop('e1', Faction.Enemy, 0, 5)); s.addUnit(troop('e2', Faction.Enemy, 2, 7)); s.addUnit(troop('p', Faction.Player, 0, 4));
        assert.isFalse(applySpecialDiscord(s, Faction.Player, 'e1').applied);
        assert.isFalse(applySpecialDiscord(s, Faction.Player, 'p').applied);
        assert.equals(Faction.Enemy, s.units.get('e1')!.faction);
    });
    suite.test('三大類對照：控制／環境／未列算突擊', () => {
        assert.equals('control', tileSkillCategoryOf('離間'));
        assert.equals('environment', tileSkillCategoryOf('火攻'));
        assert.equals('assault', tileSkillCategoryOf('不明'));
    });
    return suite;
}
