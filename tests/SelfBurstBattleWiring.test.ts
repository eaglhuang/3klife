/**
 * SelfBurstBattleWiring.test.ts — 自身爆發窗口接進戰場（SYS-SKILL-ULT-0001 第 2 片）
 *
 * 用真實 BattleSkillDispatcher：奧義施放成功才開窗；開窗期間擋下敵方暈眩；施放陣營自己的回合倒數到期。
 */
import { Faction, StatusEffect, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { tickSelfBurst } from '../assets/scripts/battle/shared/SelfBurstWindow';
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

export function createSelfBurstBattleWiringSuite(): TestSuite {
    const suite = new TestSuite('SelfBurstBattleWiring (自身爆發接戰場 SYS-SKILL-ULT-0001)');

    suite.test('趙雲奧義施放成功後我方開窗；窗口期間敵方張飛怒吼的暈眩被擋下', () => {
        const { ctrl, mine, dispatcher } = setup();
        const cast = dispatcher.dispatchDirectBattleSkill('zhao-yun-pierce', SkillSourceType.Ultimate, Faction.Player, { ultimateId: 'ult-zhao-yun-1' });
        assert.isTrue(cast.applied);
        assert.equals('ult-zhao-yun-1', ctrl.state.getSelfBurst(Faction.Player)?.ultimateId);
        dispatcher.dispatchDirectBattleSkill('zhang-fei-roar', SkillSourceType.Ultimate, Faction.Enemy);
        assert.isFalse(services().buff.hasBuff(mine.id, StatusEffect.Stun));
    });

    suite.test('非爆發奧義或戰法不開窗；窗口到期後暈眩照常生效', () => {
        const { ctrl, mine, dispatcher } = setup();
        dispatcher.dispatchDirectBattleSkill('zhao-yun-pierce', SkillSourceType.Ultimate, Faction.Player, { ultimateId: 'ult-diao-chan-1' });
        dispatcher.dispatchDirectBattleSkill('zhao-yun-pierce', SkillSourceType.SeedTactic, Faction.Player);
        assert.equals(null, ctrl.state.getSelfBurst(Faction.Player));
        dispatcher.dispatchDirectBattleSkill('zhao-yun-pierce', SkillSourceType.Ultimate, Faction.Player, { ultimateId: 'ult-zhao-yun-1' });
        let w = ctrl.state.getSelfBurst(Faction.Player);
        w = tickSelfBurst(tickSelfBurst(w).window).window;
        ctrl.state.setSelfBurst(Faction.Player, w);
        dispatcher.dispatchDirectBattleSkill('zhang-fei-roar', SkillSourceType.Ultimate, Faction.Enemy);
        assert.isTrue(services().buff.hasBuff(mine.id, StatusEffect.Stun));
    });

    return suite;
}
