/**
 * 教學戰提早發起單挑邀請（PROG-2-9331）
 *
 * 一般戰鬥要我方主將棋子走到敵陣最後一排才發起邀請；教學戰改成走到第 5 排（GAME_CONFIG.tutorialDuelInviteRow）。
 * Unity 對照：像觸發區 Trigger 的位置，新手關把它往前挪，正式關卡不動。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleGeneralDuelFlow } from '../assets/scripts/battle/runtime/BattleGeneralDuelFlow';
import { Faction, GAME_CONFIG } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 60, lea: 60, tacticSlots: [] } as unknown as GeneralConfig);
}

/** 建一場戰鬥，假裝我方主將棋子站在指定 depth（不走真正的出陣流程，只測到位判定） */
function facingAt(depth: number, tutorial: boolean): boolean {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    ctrl.tutorialBattle = tutorial;
    const flow = (ctrl as unknown as { duelFlow: BattleGeneralDuelFlow }).duelFlow;
    flow.playerGeneralUnitId = 'pg-unit';
    ctrl.state.units.set('pg-unit', { id: 'pg-unit', depth, lane: 2, faction: Faction.Player } as never);
    return ctrl.isGeneralFacingEnemyGeneral(Faction.Player);
}

export function createTutorialDuelInviteSuite(): TestSuite {
    const suite = new TestSuite('TutorialDuelInvite (教學戰第 5 排發起單挑 PROG-2-9331)');
    const row = GAME_CONFIG.tutorialDuelInviteRow;

    suite.test('教學戰：走到設定的那一排（含更前面）就算到位，還沒到不算', () => {
        assert.equals(5, row);
        assert.isFalse(facingAt(row - 2, true), '第 4 排還沒到');
        assert.isTrue(facingAt(row - 1, true), '第 5 排到位');
        assert.isTrue(facingAt(GAME_CONFIG.GRID_DEPTH - 1, true), '最後一排也算');
    });

    suite.test('一般戰鬥不變：只有敵陣最後一排才算到位', () => {
        assert.isFalse(facingAt(row - 1, false));
        assert.isTrue(facingAt(GAME_CONFIG.GRID_DEPTH - 1, false));
    });

    suite.test('主將還沒上場：教學戰也不會發起', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        ctrl.tutorialBattle = true;
        assert.isFalse(ctrl.isGeneralFacingEnemyGeneral(Faction.Player));
    });

    return suite;
}
