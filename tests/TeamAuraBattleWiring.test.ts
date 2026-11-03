/**
 * TeamAuraBattleWiring.test.ts — 全隊增益 aura 接進戰場（SYS-SKILL-ULT-0002 第 2 片）
 *
 * 用真實 BattleSkillDispatcher：全隊增益奧義施放成功才開 aura；施放陣營回合倒數到期。
 */
import { Faction, StatusEffect, TroopType } from '../assets/scripts/core/config/Constants';
import { startTeamAura, tickTeamAura } from '../assets/scripts/battle/shared/TeamAura';
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

export function createTeamAuraBattleWiringSuite(): TestSuite {
    const suite = new TestSuite('TeamAuraBattleWiring (全隊增益接戰場 SYS-SKILL-ULT-0002)');

    suite.test('曹操魏武揮鞭施放成功後我方開 aura；非全隊增益奧義不開', () => {
        const { ctrl, dispatcher } = setup();
        dispatcher.dispatchDirectBattleSkill('zhao-yun-pierce', SkillSourceType.Ultimate, Faction.Player, { ultimateId: 'ult-diao-chan-1' });
        assert.equals(null, ctrl.state.getTeamAura(Faction.Player));
        const cast = dispatcher.dispatchDirectBattleSkill('zhao-yun-pierce', SkillSourceType.Ultimate, Faction.Player, { ultimateId: 'ult-cao-cao-1' });
        assert.isTrue(cast.applied);
        assert.equals('ult-cao-cao-1', ctrl.state.getTeamAura(Faction.Player)?.ultimateId);
        assert.equals(null, ctrl.state.getTeamAura(Faction.Enemy));
    });

    suite.test('aura 期間我方普攻傷害提高；到期後回到原值', () => {
        const { ctrl, mine } = setup();
        const near = troop('e-near', Faction.Enemy, 0, 2);
        ctrl.state.addUnit(near);
        const resolver = (ctrl as unknown as { combatResolver: { resolveCombat(a: TroopUnit, d: TroopUnit, svc: ReturnType<typeof services>): void } }).combatResolver;
        const hit = () => { const hp = near.currentHp; resolver.resolveCombat(mine, near, services()); return hp - near.currentHp; };
        const base = hit();
        ctrl.state.setTeamAura(Faction.Player, startTeamAura(null, 'ult-cao-cao-1'));
        const boosted = hit();
        assert.isTrue(boosted > base, `${boosted} > ${base}`);
        let a = ctrl.state.getTeamAura(Faction.Player);
        for (let i = 0; i < 3; i++) a = tickTeamAura(a).aura;
        ctrl.state.setTeamAura(Faction.Player, a);
        assert.equals(base, hit());
    });

    suite.test('郭嘉十勝定論：我軍普攻對被削弱的目標傷害較高', () => {
        const { ctrl, mine } = setup();
        const near = troop('e-near', Faction.Enemy, 0, 2);
        ctrl.state.addUnit(near);
        const resolver = (ctrl as unknown as { combatResolver: { resolveCombat(a: TroopUnit, d: TroopUnit, svc: ReturnType<typeof services>): void } }).combatResolver;
        const hit = () => { const hp = near.currentHp; resolver.resolveCombat(mine, near, services()); return hp - near.currentHp; };
        ctrl.state.setTeamAura(Faction.Player, startTeamAura(null, 'ult-guo-jia-2'));
        const plain = hit();
        services().buff.applyBuff(near.id, StatusEffect.Slow, 2);
        const debuffed = hit();
        assert.isTrue(debuffed > plain, `${debuffed} > ${plain}`);
    });

    return suite;
}
