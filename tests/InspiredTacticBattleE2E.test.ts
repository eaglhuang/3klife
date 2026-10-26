/**
 * InspiredTacticBattleE2E.test.ts — 學到的靈感戰法在戰場施放出招名對應的效果（PROG-2-1145）
 *
 * Unity 對照：像 PlayMode 測試——武將帶著學到的招上場，從戰法槽施放，看敵軍身上真的掛了對應狀態，
 * 而不是全部變成同一招（舊版緩速會放出戰吼）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { toLibraryTacticId } from '../assets/scripts/core/systems/InspiredTacticMap';
import { TestSuite, assert } from './TestRunner';

const LIBRARY = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/master/tactic-library.json'), 'utf8')) as { data: Array<{ id: string }> };

function general(id: string, faction: Faction, tacticSlots: GeneralUnit['tacticSlots'] = []): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 90, int: 90, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots,
    });
}

/** 我方武將只帶一招學到的靈感戰法；前方放兩個敵軍步兵 */
function battleWith(specId: string): { ctrl: BattleController; front: TroopUnit; side: TroopUnit; tacticId: string } {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const tacticId = toLibraryTacticId(specId);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player, [{ slotId: 's1', tacticId, source: 'inspired' }] as GeneralUnit['tacticSlots']), general('e', Faction.Enemy));
    const map = (ctrl as unknown as { tacticDefinitionMap: Map<string, unknown> }).tacticDefinitionMap;
    for (const row of LIBRARY.data) map.set(row.id, row);
    const front = new TroopUnit('front', TroopType.Infantry, Faction.Enemy, { hp: 5000, attack: 1, defense: 10, moveRange: 2, attackRange: 1 });
    front.moveTo(2, 4);
    const side = new TroopUnit('side', TroopType.Infantry, Faction.Enemy, { hp: 5000, attack: 1, defense: 10, moveRange: 2, attackRange: 1 });
    side.moveTo(0, 7);
    for (const unit of [front, side]) {
        ctrl.state.addUnit(unit);
        ctrl.state.getCell(unit.lane, unit.depth)!.occupantId = unit.id;
    }
    ctrl.state.playerGeneral!.currentSp = ctrl.state.playerGeneral!.maxSp;
    return { ctrl, front, side, tacticId };
}

export function createInspiredTacticBattleE2ESuite(): TestSuite {
    const suite = new TestSuite('InspiredTacticBattleE2E (靈感戰法戰場效果 PROG-2-1145)');

    suite.test('緩速：從戰法槽施放，單一敵軍掛上緩速，另一隊沒有', () => {
        const { ctrl, front, side, tacticId } = battleWith('TAC_SLOW');
        assert.equals('mentor-slow', ctrl.getPlayerSeedTacticDescriptor()?.skillId ?? '');
        assert.isTrue(ctrl.triggerPlayerSeedTactic({ tacticId, targetUnitUid: front.id }));
        assert.isTrue(services().buff.hasBuff(front.id, 'slow' as never));
        assert.isFalse(services().buff.hasBuff(side.id, 'slow' as never));
    });

    suite.test('挑釁：只暈眩一個敵軍（不是戰吼的全體暈眩）', () => {
        const { ctrl, front, side, tacticId } = battleWith('TAC_TAUNT');
        assert.equals('insp-taunt', ctrl.getPlayerSeedTacticDescriptor()?.skillId ?? '');
        assert.isTrue(ctrl.triggerPlayerSeedTactic({ tacticId, targetUnitUid: front.id }));
        assert.isTrue(services().buff.hasBuff(front.id, 'stun' as never));
        assert.isFalse(services().buff.hasBuff(side.id, 'stun' as never));
    });

    suite.test('連擊：對單一敵軍造成傷害，另一隊不受傷', () => {
        const { ctrl, front, side, tacticId } = battleWith('TAC_COMBO_ATTACK');
        assert.isTrue(ctrl.triggerPlayerSeedTactic({ tacticId, targetUnitUid: front.id }));
        assert.isTrue(front.currentHp < 5000, '前方敵軍受傷');
        assert.equals(5000, side.currentHp);
    });

    return suite;
}
