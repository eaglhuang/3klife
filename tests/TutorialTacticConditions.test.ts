/**
 * 教學戰免除戰法發動條件（PROG-2-9329）
 *
 * 初始名將第一格戰法多半是「火攻」，要起風才能發動；教學戰整場不起風，計謀鈕等於壞掉。
 * Unity 對照：像新手關把技能的 CanCast 前置條件整組關掉，正式關卡照常檢查。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const FIRE = { id: 'tactic-fire-scheme', battleSkillId: 'zhou-yu-inferno', tcond: [{ kind: 'weather', allowed: ['WINDY'] }] };

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 60,
        tacticSlots: [{ slotId: 'slot-1', tacticId: FIRE.id, source: 'inborn' }],
    } as unknown as GeneralConfig);
}

/** 建一場戰鬥並直接施放第一格戰法，回傳被擋下的原因（沒被擋就是 undefined） */
function castFire(tutorial: boolean): string | null | undefined {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    (ctrl as unknown as { tacticDefinitionMap: Map<string, unknown> }).tacticDefinitionMap = new Map([[FIRE.id, FIRE]]);
    ctrl.tutorialBattle = tutorial;
    return ctrl.castBattleSkill(Faction.Player, { tacticId: FIRE.id, battleSkillId: FIRE.battleSkillId }).blockedReason;
}

export function createTutorialTacticConditionsSuite(): TestSuite {
    const suite = new TestSuite('TutorialTacticConditions (教學戰免除戰法條件 PROG-2-9329)');

    suite.test('一般戰鬥沒起風：火攻被戰法條件擋下', () => {
        assert.equals('condition-restricted', castFire(false));
    });

    suite.test('教學戰沒起風：火攻不再被戰法條件擋下', () => {
        assert.isTrue(castFire(true) !== 'condition-restricted');
    });

    return suite;
}
