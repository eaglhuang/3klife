/**
 * DuelButtonLock.test.ts — 單挑鈕條件不足時鎖定（主戰場UI規格補充_v3 小按鈕 3，PROG-2-1873）
 *
 * generalDuelBlockReason 與 startGeneralDuel 同一套判斷，但不改狀態：
 * 可出陣（含正在等選格）回 null；主將已上場、前排有我方小兵、戰鬥結束等回原因。
 *
 * Unity 對照：PlayMode 測試讀 Button.interactable 的判斷來源，不按按鈕。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 100, int: 90, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function battle(): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('me', Faction.Player), general('foe', Faction.Enemy));
    return ctrl;
}

export function createDuelButtonLockSuite(): TestSuite {
    const suite = new TestSuite('DuelButtonLock (單挑鈕鎖定 PROG-2-1873)');

    suite.test('開局可出陣；查詢不改狀態，之後 startGeneralDuel 仍是 ok', () => {
        const ctrl = battle();
        assert.equals(null, ctrl.generalDuelBlockReason());
        assert.equals(null, ctrl.generalDuelBlockReason());
        assert.equals('ok', ctrl.startGeneralDuel());
        // 等選格時不鎖，讓玩家還能再按
        assert.equals(null, ctrl.generalDuelBlockReason());
    });

    suite.test('主將已上場：鎖定', () => {
        const ctrl = battle();
        ctrl.startGeneralDuel();
        assert.isDefined(ctrl.placeGeneralOnBoard(2, 2));
        assert.equals('already-deployed', ctrl.generalDuelBlockReason());
    });

    suite.test('前排有我方小兵：鎖定，原因與 startGeneralDuel 相同', () => {
        const ctrl = battle();
        const unit = new TroopUnit('p1', TroopType.Infantry, Faction.Player, { hp: 100, attack: 1, defense: 1, moveRange: 1, attackRange: 1 });
        unit.moveTo(1, 0);
        ctrl.state.addUnit(unit);
        ctrl.state.getCell(1, 0)!.occupantId = unit.id;
        assert.equals('front-blocked', ctrl.generalDuelBlockReason());
        assert.equals('front-blocked', ctrl.startGeneralDuel());
    });

    suite.test('主將陣亡：鎖定', () => {
        const ctrl = battle();
        ctrl.state.playerGeneral!.currentHp = 0;
        assert.equals('general-dead', ctrl.generalDuelBlockReason());
    });

    return suite;
}
