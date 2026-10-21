/**
 * WushuangE2E.test.ts — 無雙亂舞在真實戰場的效果（PROG-2-0900，暫定）
 *
 * Unity 對照：像 PlayMode 測試——真的從戰法入口放出無雙亂舞，看周身敵軍有沒有受傷與被推開。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleSkillTargetMode, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction, int: number): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function enemy(id: string, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, Faction.Enemy, { hp: 1000, attack: 1, defense: 10, moveRange: 1, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

/** 玩家主將站在 (2,2) */
function battle(): { ctrl: BattleController } {
    services().initialize();
    services().session.setRandomSource(() => 0);
    const ctrl = new BattleController();
    const player = general('caster', Faction.Player, 90);
    const foe = general('foe', Faction.Enemy, 90);
    ctrl.initBattle(player, foe);
    player.currentSp = player.maxSp;
    foe.currentSp = 0;
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    assert.equals('ok', ctrl.startGeneralDuel());
    assert.isDefined(ctrl.placeGeneralOnBoard(2, 2));
    return { ctrl };
}

function addEnemy(ctrl: BattleController, unit: TroopUnit): TroopUnit {
    ctrl.state.addUnit(unit);
    ctrl.state.getCell(unit.lane, unit.depth)!.occupantId = unit.id;
    return unit;
}

export function createWushuangE2ESuite(): TestSuite {
    const suite = new TestSuite('WushuangE2E (無雙亂舞 真實戰場 PROG-2-0900)');

    suite.test('無雙亂舞：周身 8 格內的敵軍受傷並後退 1 格，3x3 外不動', () => {
        const { ctrl } = battle();
        const near = addEnemy(ctrl, enemy('near', 2, 3));
        const far = addEnemy(ctrl, enemy('far', 2, 5));
        assert.isTrue(ctrl.triggerPlayerBattleSkill('tally-wushuang', SkillSourceType.TigerTally, { targetMode: BattleSkillTargetMode.AroundSelf }));
        assert.isTrue(near.currentHp < 1000, '周身敵軍受傷');
        assert.equals(4, near.depth, '向外後退 1 格');
        assert.equals(null, ctrl.state.getCell(2, 3)!.occupantId);
        assert.equals('near', ctrl.state.getCell(2, 4)!.occupantId);
        assert.equals(1000, far.currentHp, '3x3 外不受傷');
        assert.equals(5, far.depth, '3x3 外不後退');
    });

    return suite;
}
