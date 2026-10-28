/**
 * AiEnemyDeployFlow.test.ts — 敵方每回合部署數接進真實回合流程（AIS-05 第一段 / PROG-2-1324）
 *
 * 用 BattleController 真實的「玩家階段 → 敵方階段 → 收尾」跑多回合，確認敵方每回合實際新增的兵數
 * 照 F-2 公式：min(3, 1 + floor(回合 / 5) + 難度加成)。
 *
 * 為了只看部署數，本測試不放玩家兵（沒有戰鬥傷亡），並在每個敵方回合前把敵方糧草補滿。
 * 原因：糧草上限 50、每回合只回 10、每支 15，正式數值下糧草會先把部署壓到 1 支，蓋過 F-2 的部署數。
 * 糧草本身的規則不在本測試範圍。
 *
 * Unity 對照：像 PlayMode 測試跑完幾個 Wave，數每一波 Spawner 實際生成了幾隻，而不是只單元測試 Spawn 曲線函式。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { EnemyAI } from '../assets/scripts/battle/controllers/EnemyAI';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

const TEST_BATTLE_SKILL_ID = 'cao-cao-tactics';
const ENEMY_FOOD_FOR_TEST = 100000;

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: TEST_BATTLE_SKILL_ID, battlePrimarySkillId: TEST_BATTLE_SKILL_ID, tacticSlots: [],
    });
}

function battle(difficultyBonus: number | undefined): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    if (difficultyBonus === undefined) {
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    } else {
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy), undefined, undefined, undefined, 'normal', difficultyBonus);
    }
    ctrl.placeGeneralOnBoard(2, 2);
    return ctrl;
}

function setEnemyFood(ctrl: BattleController, food: number): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = food;
}

function enemyTroopCount(ctrl: BattleController): number {
    let count = 0;
    ctrl.state.units.forEach((unit) => {
        if (unit.faction === Faction.Enemy) count++;
    });
    return count;
}

/** 跑 turns 個完整回合，回傳每回合「敵方階段」新增的敵兵數（依回合順序） */
function enemySpawnsPerTurn(ctrl: BattleController, turns: number): number[] {
    const spawns: number[] = [];
    for (let i = 0; i < turns; i++) {
        const before = enemyTroopCount(ctrl);
        ctrl.resolvePlayerTurn();
        setEnemyFood(ctrl, ENEMY_FOOD_FOR_TEST);
        ctrl.resolveEnemyTurn();
        spawns.push(enemyTroopCount(ctrl) - before);
        ctrl.finalizeEnemyTurn();
    }
    return spawns;
}

export function createAiEnemyDeployFlowSuite(): TestSuite {
    const suite = new TestSuite('AiEnemyDeployFlow (敵方每回合部署數接進回合流程 AIS-05 / PROG-2-1324)');

    suite.test('普通難度（加成 0）：第 1–4 回合每回合 1 支，第 5 回合起每回合 2 支', () => {
        const spawns = enemySpawnsPerTurn(battle(0), 6);
        assert.equals('1,1,1,1,2,2', spawns.join(','));
    });

    suite.test('困難難度（加成 1）：第 1 回合就 2 支，第 5 回合起 3 支（達上限）', () => {
        const spawns = enemySpawnsPerTurn(battle(1), 6);
        assert.equals('2,2,2,2,3,3', spawns.join(','));
    });

    suite.test('地獄難度（加成 2）：每回合都是上限 3 支', () => {
        const spawns = enemySpawnsPerTurn(battle(2), 3);
        assert.equals('3,3,3', spawns.join(','));
    });

    suite.test('未傳入難度加成時預設為 0，與普通難度相同', () => {
        const spawns = enemySpawnsPerTurn(battle(undefined), 5);
        assert.equals('1,1,1,1,2', spawns.join(','));
    });

    suite.test('同回合多支不擠同一條線：決定階段就排除已選的線（亂數固定也不重複）', () => {
        const lanes = new EnemyAI(() => 0.99).decideDeploy(new BattleState(), 1000, 3).map((d) => d.lane);
        assert.equals(3, new Set(lanes).size);
    });

    suite.test('回合數取自戰鬥服務：每回合敵方階段讀到的回合號會遞增（第 1 回合起算）', () => {
        const ctrl = battle(0);
        const turnsSeen: number[] = [];
        for (let i = 0; i < 3; i++) {
            turnsSeen.push(services().battle.getSnapshot().turn);
            ctrl.resolvePlayerTurn();
            ctrl.resolveEnemyTurn();
            ctrl.finalizeEnemyTurn();
        }
        assert.equals('1,2,3', turnsSeen.join(','));
    });

    return suite;
}
