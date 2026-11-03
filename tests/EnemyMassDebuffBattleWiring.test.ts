/**
 * EnemyMassDebuffBattleWiring.test.ts — 敵方全體減益接進戰場（SYS-SKILL-ULT-0004 第 2 片）
 *
 * 用真實 BattleSkillDispatcher：群體減益奧義施放後敵方陣營掛持續層、附加狀態、驅散增益。
 */
import { EVENT_NAMES, Faction, StatusEffect, TroopType } from '../assets/scripts/core/config/Constants';
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

function cast(dispatcher: Dispatcher, ultimateId: string) {
    return dispatcher.dispatchDirectBattleSkill('zhao-yun-pierce', SkillSourceType.Ultimate, Faction.Player, { ultimateId });
}

export function createEnemyMassDebuffBattleWiringSuite(): TestSuite {
    const suite = new TestSuite('EnemyMassDebuffBattleWiring (敵方全體減益接戰場 SYS-SKILL-ULT-0004)');

    suite.test('周瑜赤壁炎策：敵方陣營掛 DOT 持續層，我方不受影響；非此家族不掛', () => {
        const { ctrl, dispatcher } = setup();
        cast(dispatcher, 'ult-cao-cao-1');
        assert.equals(null, ctrl.state.getMassDebuff(Faction.Enemy));
        assert.isTrue(cast(dispatcher, 'ult-zhou-yu-1').applied);
        assert.equals(0.04, ctrl.state.getMassDebuff(Faction.Enemy)?.dotPct);
        assert.equals(null, ctrl.state.getMassDebuff(Faction.Player));
    });

    suite.test('張飛燕人威喝：敵方全體減速', () => {
        const { dispatcher } = setup();
        cast(dispatcher, 'ult-zhang-fei-4');
        for (let lane = 0; lane < 5; lane++) assert.isTrue(services().buff.hasBuff(`e-${lane}`, StatusEffect.Slow));
    });

    suite.test('司馬懿高平陵變：驅散敵方堅盾，不掛持續層', () => {
        const { ctrl, mine, dispatcher } = setup();
        services().buff.applyBuff('e-0', StatusEffect.Fortified, 3);
        cast(dispatcher, 'ult-sima-yi-4');
        assert.isTrue(!services().buff.hasBuff('e-0', StatusEffect.Fortified));
        assert.equals(null, ctrl.state.getMassDebuff(Faction.Enemy));
        // 驅散 1 個 → 我方護盾 5% 最大 HP
        assert.equals(Math.floor(mine.getEffectiveMaxHp() * 0.05), mine.shield);
    });

    suite.test('掛上減益時發戰報事件', () => {
        const { dispatcher } = setup();
        const seen: string[] = [];
        services().event.on(EVENT_NAMES.MassDebuffChanged, (d: { faction: string; phase: string }) => seen.push(`${d.faction}:${d.phase}`));
        cast(dispatcher, 'ult-guo-jia-5');
        assert.equals('enemy:started', seen.join(','));
    });

    return suite;
}
