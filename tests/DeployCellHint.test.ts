/**
 * DeployCellHint.test.ts — 部署列格子提示（主戰場UI規格書 §3.3，PROG-2-1876）
 *
 * 與 tryDeployTroop 同一套判斷：空格 open；被占或地格擋住 blocked。
 *
 * Unity 對照：EditMode 測試 DeployGridHighlighter.CanDeploy。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { deployCellHint } from '../assets/scripts/battle/shared/DeployCellHint';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 100, int: 90, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

export function createDeployCellHintSuite(): TestSuite {
    const suite = new TestSuite('DeployCellHint (部署列紅格 PROG-2-1876)');

    suite.test('空格 open；被占 blocked 且與 tryDeployTroop 的 occupied 一致', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('me', Faction.Player), general('foe', Faction.Enemy));
        assert.equals('open', deployCellHint(ctrl.state, 1));
        const unit = new TroopUnit('p1', TroopType.Infantry, Faction.Player, { hp: 100, attack: 1, defense: 1, moveRange: 1, attackRange: 1 });
        unit.moveTo(1, 0);
        ctrl.state.addUnit(unit);
        ctrl.state.getCell(1, 0)!.occupantId = unit.id;
        assert.equals('blocked', deployCellHint(ctrl.state, 1));
        assert.equals('occupied', ctrl.tryDeployTroop(TroopType.Infantry, 1).reason);
    });

    suite.test('地格效果擋住進入 → blocked；只有傷害的地格仍可部署；格子不存在回 null', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('me', Faction.Player), general('foe', Faction.Enemy));
        ctrl.state.setTileEffect({ id: 'wall', lane: 2, depth: 0, state: 'scene-camp', blocksMovement: true } as never);
        ctrl.state.setTileEffect({ id: 'fire', lane: 3, depth: 0, state: 'scene-camp', damagePerTurn: 5 } as never);
        assert.equals('blocked', deployCellHint(ctrl.state, 2));
        assert.equals('open', deployCellHint(ctrl.state, 3));
        assert.equals(null, deployCellHint(ctrl.state, 99));
    });

    return suite;
}
