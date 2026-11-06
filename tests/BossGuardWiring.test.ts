/**
 * BossGuardWiring.test.ts — Boss 親衛隊接進敵方部署階段（關卡設計系統 Boss AI，PROG-2-1862）
 *
 * 用 BattleController 真實的回合流程：敵方主將血量降到一半以下時，敵方階段生成親衛隊，本場只一次。
 * 敵方糧草歸零，讓一般部署不出兵，只看親衛隊。
 *
 * Unity 對照：像 PlayMode 測試把 Boss 血量壓到一半，跑一個 Wave，數 Spawner 生出的護衛數。
 */
import { Faction, GAME_CONFIG, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import {
    BOSS_GUARD_COUNT,
    BOSS_GUARD_UNIT_NAME,
    bossGuardLanes,
    bossGuardSummonLine,
    isBossGuardGeneral,
} from '../assets/scripts/core/systems/BossGuardSummon';
import { TestSuite, assert } from './TestRunner';

const TEST_BATTLE_SKILL_ID = 'cao-cao-tactics';

function general(id: string, name: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 60, int: 90, lea: 90,
        skillId: TEST_BATTLE_SKILL_ID, battlePrimarySkillId: TEST_BATTLE_SKILL_ID, tacticSlots: [],
    });
}

function battle(enemyId: string, enemyName: string, enemyHpRatio: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', '我方', Faction.Player), general(enemyId, enemyName, Faction.Enemy));
    ctrl.placeGeneralOnBoard(2, 2);
    const eg = ctrl.state.getGeneral(Faction.Enemy)!;
    eg.currentHp = Math.floor(eg.maxHp * enemyHpRatio);
    return ctrl;
}

function guards(ctrl: BattleController): { lane: number; depth: number; type: string }[] {
    const out: { lane: number; depth: number; type: string }[] = [];
    ctrl.state.units.forEach((unit) => {
        if (unit.faction === Faction.Enemy && unit.name === BOSS_GUARD_UNIT_NAME) out.push({ lane: unit.lane, depth: unit.depth, type: unit.type });
    });
    return out;
}

function runTurn(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createBossGuardWiringSuite(): TestSuite {
    const suite = new TestSuite('BossGuardWiring (Boss 親衛隊接進敵方部署 PROG-2-1862)');

    suite.test('Boss 名單比對 id 或姓名', () => {
        assert.isTrue(isBossGuardGeneral('lu-bu', null));
        assert.isTrue(isBossGuardGeneral('x', '曹操'));
        assert.isFalse(isBossGuardGeneral('zhang-fei', '張飛'));
    });

    suite.test('站位挑最靠中間的空路線', () => {
        assert.equals('2,1', bossGuardLanes([0, 1, 2, 3, 4], 5).join(','));
        assert.equals('1,3', bossGuardLanes([0, 1, 3, 4], 5).join(','));
        assert.equals('0', bossGuardLanes([0], 5).join(','));
    });

    suite.test('呂布血量一半以下：敵方階段在後排生成盾兵親衛隊，本場只一次', () => {
        const ctrl = battle('lu-bu', '呂布', 0.4);
        const notices: string[] = [];
        services().event.on('battle-skill-notice', (line: string) => notices.push(line));
        runTurn(ctrl);
        const first = guards(ctrl);
        assert.equals(BOSS_GUARD_COUNT, first.length);
        assert.isTrue(first.every((g) => g.type === TroopType.Shield));
        assert.isTrue(ctrl.state.bossGuardSummoned);
        runTurn(ctrl);
        const ids = new Set<string>();
        ctrl.state.units.forEach((unit) => { if (unit.name === BOSS_GUARD_UNIT_NAME) ids.add(unit.id); });
        assert.isTrue(ids.size <= BOSS_GUARD_COUNT);
        assert.isTrue(first.every((g) => g.depth <= GAME_CONFIG.GRID_DEPTH - 1));
        assert.equals(1, notices.filter((line) => line === bossGuardSummonLine('呂布')).length);
    });

    suite.test('血量高於一半或不是 Boss：不召喚', () => {
        const healthy = battle('lu-bu', '呂布', 0.8);
        runTurn(healthy);
        assert.equals(0, guards(healthy).length);
        const normal = battle('zhang-fei', '張飛', 0.2);
        runTurn(normal);
        assert.equals(0, guards(normal).length);
        assert.isFalse(normal.state.bossGuardSummoned);
    });

    return suite;
}
