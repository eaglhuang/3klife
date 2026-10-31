/**
 * TeamRecoverBattleWiring.test.ts — 團隊回復接進戰場（SYS-SKILL-ULT-0003 第 2 片）
 *
 * 用真實 BattleSkillDispatcher：團隊回復奧義施放成功後補血、淨化、回士氣、加護盾。
 */
import { Faction, StatusEffect, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

type Dispatcher = {
    dispatchDirectBattleSkill(skillId: string, sourceType: SkillSourceType, faction: Faction, options?: { ultimateId?: string }): { applied: boolean };
};

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 90, int: 60, lea: 90,
        skillId: 'zhao-yun-pierce', battlePrimarySkillId: 'zhao-yun-pierce', tacticSlots: [], ultimateSlots: [], rebirthCount: 1,
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100000, attack: 10, defense: 1, moveRange: 0, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

function setup() {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    const mine = troop('p-1', Faction.Player, 0, 1);
    ctrl.state.addUnit(mine);
    for (let lane = 0; lane < 5; lane++) ctrl.state.addUnit(troop(`e-${lane}`, Faction.Enemy, lane, 6));
    const dispatcher = (ctrl as unknown as { skillDispatcher: Dispatcher }).skillDispatcher;
    return { ctrl, mine, dispatcher };
}

export function createTeamRecoverBattleWiringSuite(): TestSuite {
    const suite = new TestSuite('TeamRecoverBattleWiring (團隊回復接戰場 SYS-SKILL-ULT-0003)');
    const cast = (dispatcher: Dispatcher, ultimateId: string) =>
        dispatcher.dispatchDirectBattleSkill('zhao-yun-pierce', SkillSourceType.Ultimate, Faction.Player, { ultimateId });

    suite.test('劉備昭烈仁政：我方存活單位回 20% 最大 HP，不越上限；敵方不受影響', () => {
        const { ctrl, mine, dispatcher } = setup();
        mine.takeDamage(50000);
        const enemy = ctrl.state.units.get('e-0')!;
        enemy.takeDamage(50000);
        assert.isTrue(cast(dispatcher, 'ult-liu-bei-3').applied);
        assert.equals(70000, mine.currentHp);
        assert.isTrue(enemy.currentHp <= 50000, '敵方未被補血');
    });

    suite.test('劉備仁德號召：解除 1 個控制狀態、保留正面狀態，士氣 +25', () => {
        const { mine, dispatcher } = setup();
        services().buff.applyBuff(mine.id, StatusEffect.Stun, 2);
        services().buff.applyBuff(mine.id, StatusEffect.Fortified, 2);
        cast(dispatcher, 'ult-liu-bei-1');
        assert.isFalse(services().buff.hasBuff(mine.id, StatusEffect.Stun));
        assert.isTrue(services().buff.hasBuff(mine.id, StatusEffect.Fortified));
        assert.equals(25, mine.morale);
    });

    suite.test('孫權碧眼統軍：護盾 15% 最大 HP，受傷先扣護盾再扣 HP，重複施放不疊加', () => {
        const { mine, dispatcher } = setup();
        cast(dispatcher, 'ult-sun-quan-4');
        assert.equals(15000, mine.shield);
        cast(dispatcher, 'ult-sun-quan-4');
        assert.equals(15000, mine.shield);
        mine.takeDamage(20000);
        assert.equals(0, mine.shield);
        assert.equals(95000, mine.currentHp);
    });

    suite.test('昭烈仁政附帶 2 回合減傷：與全隊增益共用同一份 aura', () => {
        const { ctrl, dispatcher } = setup();
        cast(dispatcher, 'ult-liu-bei-3');
        const aura = ctrl.state.getTeamAura(Faction.Player);
        assert.equals(0.2, aura?.damageReduction);
        assert.equals(2, aura?.remainingTurns);
        cast(dispatcher, 'ult-sun-quan-4');
        assert.equals(0.2, ctrl.state.getTeamAura(Faction.Player)?.damageReduction);
    });

    suite.test('曹植建安風骨施放後掛抗性 aura：擲骰低於 30% 時擋下敵方暈眩', () => {
        const { mine, dispatcher } = setup();
        cast(dispatcher, 'ult-cao-zhi-3');
        services().session.setRandomSource(() => 0.1);
        dispatcher.dispatchDirectBattleSkill('zhang-fei-roar', SkillSourceType.Ultimate, Faction.Enemy);
        assert.isFalse(services().buff.hasBuff(mine.id, StatusEffect.Stun));
    });

    return suite;
}
