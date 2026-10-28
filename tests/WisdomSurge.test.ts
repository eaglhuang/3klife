/**
 * 智謀能量滿格全局增幅：我方存活部隊士氣 +20（PROG-2-1574，暫定）。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applyWisdomSurge, WISDOM_SURGE_MORALE } from '../assets/scripts/battle/shared/WisdomMeter';
import { MORALE_DURATION_TURNS } from '../assets/scripts/battle/shared/Morale';
import { TestSuite, assert } from './TestRunner';

function unit(id: string, faction: Faction, hp = 100): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 20, moveRange: 1, attackRange: 1 });
    u.currentHp = hp;
    return u;
}

export function createWisdomSurgeSuite(): TestSuite {
    const suite = new TestSuite('WisdomSurge (智謀全局增幅 PROG-2-1574)');

    suite.test('我方存活部隊士氣 +20 並開始計時；敵軍與陣亡者不受影響', () => {
        const a = unit('a', Faction.Player);
        const dead = unit('d', Faction.Player, 0);
        const e = unit('e', Faction.Enemy);
        assert.equals(1, applyWisdomSurge([a, dead, e], Faction.Player));
        assert.equals(WISDOM_SURGE_MORALE, a.morale);
        assert.equals(MORALE_DURATION_TURNS, a.moraleTurns);
        assert.equals(0, dead.morale);
        assert.equals(0, e.morale);
    });

    return suite;
}
