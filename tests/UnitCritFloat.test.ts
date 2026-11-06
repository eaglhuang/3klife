/**
 * UnitCritFloat.test.ts — 小兵被暴擊時飄字用暴擊樣式（主戰場UI規格書 §3.2，PROG-2-1875）
 *
 * 1. unitValueFloatType：治療綠、暴擊 dmg_crit、一般依陣營。
 * 2. applyUnitDamage 帶 isCrit 時 UnitDamaged 事件會帶出 isCrit；連鎖分攤傷害不算暴擊。
 *
 * Unity 對照：EditMode 測試 DamagePopup 樣式選擇與 OnUnitDamaged 事件參數。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { unitValueFloatType } from '../assets/scripts/battle/shared/DamageFloatType';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 100, int: 90, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

export function createUnitCritFloatSuite(): TestSuite {
    const suite = new TestSuite('UnitCritFloat (小兵暴擊飄字 PROG-2-1875)');

    suite.test('飄字樣式：治療綠、暴擊優先、一般依陣營', () => {
        assert.equals('heal', unitValueFloatType('heal', true, true));
        assert.equals('dmg_crit', unitValueFloatType('damage', true, true));
        assert.equals('dmg_crit', unitValueFloatType('damage', false, true));
        assert.equals('dmg_player', unitValueFloatType('damage', true));
        assert.equals('dmg_enemy', unitValueFloatType('damage', false, false));
    });

    suite.test('applyUnitDamage 帶 isCrit → UnitDamaged 事件帶出；未帶時為 false', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('me', Faction.Player), general('foe', Faction.Enemy));
        const unit = new TroopUnit('p1', TroopType.Infantry, Faction.Player, { hp: 100, attack: 1, defense: 1, moveRange: 1, attackRange: 1 });
        unit.moveTo(2, 2);
        ctrl.state.addUnit(unit);
        const seen: Array<boolean | undefined> = [];
        const off = services().event.on(EVENT_NAMES.UnitDamaged, (data?: { unitId?: string; isCrit?: boolean }) => {
            if (data?.unitId === 'p1') seen.push(data.isCrit);
        });
        const resolver = (ctrl as unknown as { combatResolver: { applyUnitDamage: (...args: unknown[]) => void } }).combatResolver;
        const base = { attackerId: null, attackerLane: null, attackerDepth: null, allowDamageLink: false };
        resolver.applyUnitDamage(unit, 10, Faction.Enemy, { ...base, isCrit: true });
        resolver.applyUnitDamage(unit, 10, Faction.Enemy, base);
        if (typeof off === 'function') off();
        assert.equals(2, seen.length);
        assert.equals(true, seen[0]);
        assert.equals(false, seen[1]);
    });

    return suite;
}
