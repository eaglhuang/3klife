/**
 * GhostMoveE2E — 七進七出在真實戰場回合流程的效果（QA，PROG-2-0634，暫定規則）
 *
 * Unity 對照：像 PlayMode 測試——真的用 BattleController 跑一個玩家回合，看龍膽符部隊有沒有穿過敵軍、
 * 敵軍有沒有各吃一次傷害，而不是只測移動階段的單一函式。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 100, int: 60, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number, extra: { hp?: number; attack?: number; moveRange?: number } = {}): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp: extra.hp ?? 5000, attack: extra.attack ?? 40, defense: 5, moveRange: extra.moveRange ?? 3, attackRange: 1,
    });
    unit.moveTo(lane, depth);
    return unit;
}

function battle(): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    return ctrl;
}

function put(ctrl: BattleController, unit: TroopUnit): TroopUnit {
    ctrl.state.addUnit(unit);
    ctrl.state.getCell(unit.lane, unit.depth)!.occupantId = unit.id;
    return unit;
}

function ghost(id: string, lane: number, depth: number, moveRange = 3): TroopUnit {
    const unit = troop(id, Faction.Player, lane, depth, { moveRange });
    unit.tallyTemplateId = 'tiger-tally-long-dan';
    return unit;
}

export function createGhostMoveE2ESuite(): TestSuite {
    const suite = new TestSuite('GhostMoveE2E (七進七出 真實戰場回合 PROG-2-0634)');

    suite.test('玩家回合：龍膽符部隊穿過前方兩名敵軍，落在空格，兩名敵軍各吃一次傷害', () => {
        const ctrl = battle();
        const mover = put(ctrl, ghost('mover', 1, 0, 3));
        const a = put(ctrl, troop('a', Faction.Enemy, 1, 1));
        const b = put(ctrl, troop('b', Faction.Enemy, 1, 2));
        ctrl.resolvePlayerTurn();
        assert.equals(3, mover.depth, '穿過兩人落在 depth 3');
        assert.equals('mover', ctrl.state.getCell(1, 3)!.occupantId);
        assert.equals(null, ctrl.state.getCell(1, 0)!.occupantId, '原格清空');
        assert.isTrue(a.currentHp < a.maxHp, 'a 受傷');
        assert.isTrue(b.currentHp < b.maxHp, 'b 受傷');
        assert.equals(a.maxHp - a.currentHp, b.maxHp - b.currentHp, '各吃一次、傷害相同');
    });

    suite.test('同樣的陣型，一般部隊被敵軍擋下：不穿透、前兩格的敵軍位置不變', () => {
        const ctrl = battle();
        const mover = put(ctrl, troop('plain', Faction.Player, 1, 0));
        const a = put(ctrl, troop('a', Faction.Enemy, 1, 1));
        put(ctrl, troop('b', Faction.Enemy, 1, 2));
        ctrl.resolvePlayerTurn();
        assert.equals(0, mover.depth, '被擋在原地');
        assert.equals(1, a.depth);
    });

    suite.test('穿透傷害致死：敵軍被清掉，格子釋放，移動者仍落在終點', () => {
        const ctrl = battle();
        const mover = put(ctrl, ghost('mover', 2, 0, 2));
        const weak = put(ctrl, troop('weak', Faction.Enemy, 2, 1, { hp: 1 }));
        const died: string[] = [];
        const off = services().event.on(EVENT_NAMES.UnitDied, (payload: { unitId: string }) => { died.push(payload.unitId); });
        ctrl.resolvePlayerTurn();
        off();
        assert.equals(2, mover.depth);
        assert.isTrue(weak.isDead());
        assert.equals(null, ctrl.state.getCell(2, 1)!.occupantId, '陣亡敵軍不佔格');
        assert.isFalse(ctrl.state.units.has('weak'), '陣亡敵軍移出戰場');
        assert.equals(1, died.filter((e) => e === 'weak').length, '發出一次 UnitDied');
    });

    suite.test('終點被敵軍佔住：縮短到最遠的有效空格（只穿過一人時）', () => {
        const ctrl = battle();
        const mover = put(ctrl, ghost('mover', 3, 0, 3));
        const a = put(ctrl, troop('a', Faction.Enemy, 3, 1));
        put(ctrl, troop('b', Faction.Enemy, 3, 3));
        ctrl.resolvePlayerTurn();
        assert.equals(2, mover.depth, '終點 depth 3 被佔 → 退到 depth 2');
        assert.isTrue(a.currentHp < a.maxHp, '仍穿過 a');
    });

    return suite;
}
