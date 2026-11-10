import { TestSuite, assert } from './TestRunner';
import { executeBattleEnemyDeployPhase } from '../assets/scripts/battle/runtime/phases/BattleEnemyDeployPhase';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function phase(turn: number, tutorialBattle?: boolean, difficultyBonus = 0, boss = false) {
    let requested = -1, guards = 0;
    const state = { bossGuardSummoned: false,
        getGeneral: () => boss ? { id: 'lu-bu', name: '呂布', currentHp: 50, maxHp: 100, isDead: () => false } : null,
        getCell: () => null };
    executeBattleEnemyDeployPhase({ state, turn, tutorialBattle, difficultyBonus,
        enemyAi: { decideDeploy: (_s: unknown, _f: number, count: number) => { requested = count; return []; } },
        turnManager: { enemyFood: 1000 }, spawnEnemyUnit: () => { guards++; }, isCellMovementBlocked: () => false } as any);
    return { requested, guards, summoned: state.bossGuardSummoned };
}
export function createTutorialBattleWavesSuite(): TestSuite {
    const suite = new TestSuite('TutorialBattleWaves');
    suite.test('教學只有第2/4/6回合各一隊，之後不再增援', () => {
        assert.equals('0,1,0,1,0,1,0,0,0,0,0,0', Array.from({ length: 12 }, (_, i) => phase(i + 1, true).requested).join(','));
        assert.equals(0, phase(50, true).requested);
    });
    suite.test('教學不受高難度加成增加波次', () => {
        assert.equals(0, phase(1, true, 2).requested);
        assert.equals(1, phase(2, true, 2).requested);
    });
    suite.test('一般戰與未指定旗標完全保留部署公式', () => {
        for (const flag of [false, undefined]) {
            assert.equals('1,2,3', [1,5,10].map(t => phase(t, flag).requested).join(','));
            assert.equals(3, phase(1, flag, 2).requested);
        }
    });
    suite.test('教學不額外召親衛隊；一般Boss仍召喚兩隊且記錄一次旗標', () => {
        const tutorial = phase(2, true, 0, true), normal = phase(2, false, 0, true);
        assert.equals(0, tutorial.guards); assert.isFalse(tutorial.summoned);
        assert.equals(2, normal.guards); assert.isTrue(normal.summoned);
    });
    suite.test('真實控制器把明確教學旗標送進部署階段', () => {
        services().initialize();
        const general = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 100000,
            maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90, skillId: 'cao-cao-tactics',
            battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [] });
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        ctrl.tutorialBattle = true;
        ctrl.placeGeneralOnBoard(2, 2);
        ctrl.resolvePlayerTurn(); ctrl.resolveEnemyTurn();
        assert.equals(0, [...ctrl.state.units.values()].filter(u => u.faction === Faction.Enemy).length);
    });
    return suite;
}
