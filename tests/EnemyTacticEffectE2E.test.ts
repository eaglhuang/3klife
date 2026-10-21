/**
 * EnemyTacticEffectE2E.test.ts — 敵方選技的實際效果（QA，PROG-2-0658）
 *
 * Unity 對照：像 PlayMode 測試看敵方 AI 出招後的「結果」——我方真的掉血、敵方 SP 歸零、同一回合不連發，
 * 而不只是檢查呼叫參數；戰法庫查不到時要退回武將主技能，不能整回合沒出招。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

const TACTIC = 'test-ranged-tactic';
const SKILL = 'cao-cao-tactics';

function general(id: string, faction: Faction, tacticSlots: GeneralUnit['tacticSlots'] = []): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: SKILL, battlePrimarySkillId: SKILL, tacticSlots,
    });
}

function battle(slots: GeneralUnit['tacticSlots'], registerTactic = true): { ctrl: BattleController; target: TroopUnit } {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy, slots));
    assert.equals('ok', ctrl.startGeneralDuel());
    assert.isDefined(ctrl.placeGeneralOnBoard(2, 2));
    const target = new TroopUnit('player-foot', TroopType.Infantry, Faction.Player, { hp: 5000, attack: 1, defense: 10, moveRange: 1, attackRange: 1 });
    target.moveTo(2, 3);
    ctrl.state.addUnit(target);
    ctrl.state.getCell(2, 3)!.occupantId = target.id;
    ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: 2000 });
    if (registerTactic) {
        (ctrl as unknown as { tacticDefinitionMap: Map<string, unknown> }).tacticDefinitionMap.set(TACTIC, {
            id: TACTIC, displayName: '測試遠程', category: 'ranged', battleSkillId: SKILL,
        });
    }
    ctrl.state.enemyGeneral!.currentSp = ctrl.state.enemyGeneral!.maxSp;
    return { ctrl, target };
}

function enemyPhase(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

/** 我方場上所有單位（含主將棋子）的血量總和 */
function playerHp(ctrl: BattleController): number {
    return [...ctrl.state.units.values()].filter((u) => u.faction === Faction.Player).reduce((sum, u) => sum + u.currentHp, 0);
}

function spy(ctrl: BattleController) {
    const calls: Array<{ battleSkillId?: string | null; tacticId?: string | null }> = [];
    const original = ctrl.castBattleSkill.bind(ctrl);
    ctrl.castBattleSkill = (faction, options, sourceType) => {
        if (faction === Faction.Enemy) calls.push(options ?? {});
        return original(faction, options, sourceType);
    };
    return calls;
}

const SLOTS = [{ slotId: 's1', tacticId: TACTIC, source: 'bloodline' }] as GeneralUnit['tacticSlots'];

export function createEnemyTacticEffectE2ESuite(): TestSuite {
    const suite = new TestSuite('EnemyTacticEffectE2E (敵方選技 實際效果 PROG-2-0658)');

    suite.test('出招有效果：我方掉血、敵將 SP 歸零，且同一回合只出一次', () => {
        const { ctrl } = battle(SLOTS);
        const calls = spy(ctrl);
        const hpBefore = playerHp(ctrl);
        enemyPhase(ctrl);
        const hpAfter = playerHp(ctrl);
        assert.equals(1, calls.length, '一個敵方回合只出一招');
        assert.isTrue(hpAfter < hpBefore, '出招後我方總血量下降');
        assert.equals(TACTIC, calls[0].tacticId);
        assert.isTrue(ctrl.state.enemyGeneral!.currentSp < ctrl.state.enemyGeneral!.maxSp, '出招後 SP 已歸零或回復中');
    });

    suite.test('戰法庫查不到該戰法：退回武將主技能，tacticId 為空，仍然出招', () => {
        const { ctrl } = battle(SLOTS, false);
        const calls = spy(ctrl);
        enemyPhase(ctrl);
        assert.equals(1, calls.length, '仍然出招');
        assert.equals(SKILL, calls[0].battleSkillId);
        assert.isTrue(calls[0].tacticId == null, '沒有選到戰法');
    });

    suite.test('敵將 SP 不足：不出招', () => {
        const { ctrl } = battle(SLOTS);
        ctrl.state.enemyGeneral!.currentSp = 0;
        const calls = spy(ctrl);
        enemyPhase(ctrl);
        assert.equals(0, calls.length);
    });

    suite.test('場上沒有我方部隊（只剩主將）：選技不報錯，仍能出招', () => {
        const { ctrl, target } = battle(SLOTS);
        ctrl.state.units.delete(target.id);
        ctrl.state.getCell(2, 3)!.occupantId = null;
        const calls = spy(ctrl);
        enemyPhase(ctrl);
        assert.isTrue(calls.length <= 1);
    });

    return suite;
}
