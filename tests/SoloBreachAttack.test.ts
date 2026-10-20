/**
 * 單騎破陣（趙雲教官靈感，TBUFF+TCOND）headless 測試（PROG-2-0794）
 * 規格：回合開始判斷相鄰 1 格無友軍則 ATK +30%，效果到施放者下一回合開始為止。
 */
import { TestSuite, assert } from './TestRunner';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applySoloBreachAtTurnStart } from '../assets/scripts/battle/runtime/BattleSoloBreach';

function makeUnit(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 10, defense: 5, moveRange: 1, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

export function createSoloBreachAttackSuite(): TestSuite {
    const suite = new TestSuite('SoloBreachAttack (單騎破陣 TAC-0002)');

    suite.test('預設 soloBreachMultiplier 為 1，ATK 不變', () => {
        const unit = makeUnit('p-solo', Faction.Player, 0, 0);
        assert.equals(10, unit.getEffectiveAttack());
    });

    suite.test('趙雲帶者無相鄰友軍：回合開始後 ATK ×1.3', () => {
        const carrier = makeUnit('p-carrier', Faction.Player, 1, 1);
        applySoloBreachAtTurnStart([carrier], 'zhao-yun', carrier.id);
        assert.equals(13, carrier.getEffectiveAttack());
    });

    suite.test('正交相鄰有存活友軍：不套用，ATK 維持 ×1', () => {
        const carrier = makeUnit('p-carrier', Faction.Player, 1, 1);
        const ally = makeUnit('p-ally', Faction.Player, 1, 2);
        applySoloBreachAtTurnStart([carrier, ally], 'zhao-yun', carrier.id);
        assert.equals(10, carrier.getEffectiveAttack());
    });

    suite.test('相鄰的是敵軍不算友軍，仍 ×1.3', () => {
        const carrier = makeUnit('p-carrier', Faction.Player, 1, 1);
        const enemy = makeUnit('e-near', Faction.Enemy, 1, 2);
        applySoloBreachAtTurnStart([carrier, enemy], 'zhao-yun', carrier.id);
        assert.equals(13, carrier.getEffectiveAttack());
    });

    suite.test('相鄰友軍已陣亡不算，仍 ×1.3', () => {
        const carrier = makeUnit('p-carrier', Faction.Player, 1, 1);
        const ally = makeUnit('p-ally', Faction.Player, 1, 2);
        ally.currentHp = 0;
        applySoloBreachAtTurnStart([carrier, ally], 'zhao-yun', carrier.id);
        assert.equals(13, carrier.getEffectiveAttack());
    });

    suite.test('非趙雲的武將不套用單騎破陣', () => {
        const carrier = makeUnit('p-carrier', Faction.Player, 1, 1);
        applySoloBreachAtTurnStart([carrier], 'guan-yu', carrier.id);
        assert.equals(10, carrier.getEffectiveAttack());
    });

    suite.test('下一回合開始重算：友軍走到相鄰後效果結束', () => {
        const carrier = makeUnit('p-carrier', Faction.Player, 1, 1);
        applySoloBreachAtTurnStart([carrier], 'zhao-yun', carrier.id);
        assert.equals(13, carrier.getEffectiveAttack());

        const ally = makeUnit('p-ally', Faction.Player, 1, 2);
        applySoloBreachAtTurnStart([carrier, ally], 'zhao-yun', carrier.id);
        assert.equals(10, carrier.getEffectiveAttack());
    });

    suite.test('帶者陣亡時不套用', () => {
        const carrier = makeUnit('p-carrier', Faction.Player, 1, 1);
        carrier.currentHp = 0;
        applySoloBreachAtTurnStart([carrier], 'zhao-yun', carrier.id);
        assert.equals(10, carrier.getEffectiveAttack());
    });

    return suite;
}
