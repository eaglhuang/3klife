import { TestSuite, assert } from './TestRunner';
import { executeBattleEnemyDeployPhase, unguardedEnemyLanes, tutorialUnguardedLaneHintLine } from '../assets/scripts/battle/runtime/phases/BattleEnemyDeployPhase';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function phase(turn: number, tutorialBattle?: boolean, difficultyBonus = 0, boss = false) {
    let requested = -1, guards = 0, budget = -1;
    const state = { bossGuardSummoned: false,
        getGeneral: () => boss ? { id: 'lu-bu', name: '呂布', currentHp: 50, maxHp: 100, isDead: () => false } : null,
        getCell: () => null };
    executeBattleEnemyDeployPhase({ state, turn, tutorialBattle, difficultyBonus,
        enemyAi: { decideDeploy: (_s: unknown, f: number, count: number) => { requested = count; budget = f; return []; } },
        turnManager: { enemyFood: 30 }, spawnEnemyUnit: () => { guards++; }, isCellMovementBlocked: () => false } as any);
    return { requested, guards, budget, summoned: state.bossGuardSummoned };
}
export function createTutorialBattleWavesSuite(): TestSuite {
    const suite = new TestSuite('TutorialBattleWaves');
    suite.test('教學照波次表出兵：第1回合不出，第2到7回合各1隊，共6隊，之後不再增援（PROG-2-9324、PROG-2-9325、PROG-2-9330、PROG-2-9344、PROG-2-9951）', () => {
        assert.equals('0,1,1,1,1,1,1,0,0,0,0,0',Array.from({ length: 12 }, (_, i) => phase(i + 1, true).requested).join(','));
        assert.equals(0, phase(50, true).requested);
    });
    suite.test('教學戰出兵不被敵軍糧草卡住，一般戰照糧草（PROG-2-9346）', () => {
        assert.equals(Number.POSITIVE_INFINITY, phase(3, true).budget);
        assert.equals(30, phase(3, false).budget);
    });
    suite.test('空路引導：敵軍所在的路我方沒人就提醒一次，補防後再空才會再提醒（PROG-2-9349）', () => {
        const u = (faction: Faction, lane: number, dead = false) => ({ faction, lane, isDead: () => dead });
        assert.equals('1,3', unguardedEnemyLanes([u(Faction.Enemy, 1), u(Faction.Enemy, 3), u(Faction.Enemy, 2), u(Faction.Player, 2), u(Faction.Player, 3, true)]).join(','));
        assert.equals('第 2 路、第 4 路沒人守，敵軍正逼近主將！派兵到這一路攔截', tutorialUnguardedLaneHintLine([3, 1]));
        const units = new Map<string, any>([['e', u(Faction.Enemy, 1)]]); const hinted = new Set<number>(); const lines: string[] = [];
        const run = (tutorialBattle: boolean) => executeBattleEnemyDeployPhase({ state: { units, getGeneral: () => null, getCell: () => null }, turn: 9, tutorialBattle,
            difficultyBonus: 0, enemyAi: { decideDeploy: () => [] }, turnManager: { enemyFood: 0 }, spawnEnemyUnit: () => {}, isCellMovementBlocked: () => false,
            guide: (line: string) => lines.push(line), leakHintedLanes: hinted } as any);
        run(false); assert.equals(0, lines.length);
        run(true); run(true); assert.equals(1, lines.length);
        units.set('p', u(Faction.Player, 1)); run(true); assert.equals(1, lines.length);
        units.delete('p'); run(true); assert.equals(2, lines.length);
    });
    suite.test('教學戰實際生出的隊數照波次表：糧草是 0 也出得滿 6 隊（PROG-2-9346 補驗、PROG-2-9951）', () => {
        let spawned = 0; const tm = { enemyFood: 0 };
        for (let turn = 1; turn <= 12; turn++) executeBattleEnemyDeployPhase({ state: { getGeneral: () => null, getCell: () => null }, turn, tutorialBattle: true,
            difficultyBonus: 0, turnManager: tm, spawnEnemyUnit: () => { spawned++; }, isCellMovementBlocked: () => false,
            enemyAi: { decideDeploy: (_s: unknown, budget: number, count: number) => Array.from({ length: budget >= 15 * count ? count : 0 }, (_, i) => ({ type: 'cavalry', lane: i })) } } as any);
        assert.equals(6, spawned);
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
