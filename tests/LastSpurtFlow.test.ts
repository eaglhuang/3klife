/**
 * LastSpurtFlow.test.ts — 殘局判斷接進 BattleController 回合切換的多回合流程（FORM-10）
 *
 * 用 BattleController 真實的「玩家階段 → 敵方階段 → 收尾」跑回合，鎖住：
 * - 兵力不折損：第 4 回合結束仍未進入殘局，第 5 回合開始時以 turn 原因進入，事件只發一次。
 * - 殘局一旦進入不退出：之後的回合旗標維持 true，事件不重發。
 * - 兵力折損：峰值 4 支，剩 2 支（恰好 50%）不進入；再少 1 支（低於 50%）於下一回合以 attrition 進入。
 *
 * Unity 對照：像 PlayMode 真的跑完好幾個回合，數 Phase 切換事件的次數，而不是只測切換函式。
 */
import * as fs from 'fs';
import * as path from 'path';
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { aiDifficultyEntryOf, parseAiDifficultyTable, type AiDifficultyEntry } from '../assets/scripts/core/systems/AiDifficultyTable';
import { TestSuite, assert } from './TestRunner';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');
const PLAYER_TROOP_LANES = [0, 1, 3, 4];

interface LastSpurtPayload { turn: number; reason: string }

function normalEntry(): AiDifficultyEntry {
    const { table } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
    return aiDifficultyEntryOf(table!, 'normal');
}

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        tacticSlots: [], rebirthCount: 1,
    });
}

function playerTroop(lane: number): TroopUnit {
    const unit = new TroopUnit(`p-troop-${lane}`, TroopType.Infantry, Faction.Player, {
        hp: 100000, attack: 1, defense: 1, moveRange: 0, attackRange: 0,
    });
    unit.moveTo(lane, 1);
    return unit;
}

/** 建立戰場：玩家兵取前 playerTroopCount 格，敵方無兵只有武將 */
function battle(playerTroopCount: number): { ctrl: BattleController; playerTroops: TroopUnit[] } {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    ctrl.configureAiDifficulty(normalEntry());
    ctrl.placeGeneralOnBoard(2, 2);
    const playerTroops = PLAYER_TROOP_LANES.slice(0, playerTroopCount).map(playerTroop);
    playerTroops.forEach(unit => ctrl.state.addUnit(unit));
    return { ctrl, playerTroops };
}

/** 跑一個完整回合（玩家階段 → 敵方階段 → 收尾），會推進戰場回合數；food=0 時敵方無糧不部署，兵力只會減少 */
function runCycle(ctrl: BattleController, enemyFood = 100000): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = enemyFood;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

/** 監聽 LastSpurtEntered，回傳收到的 payload 陣列與取消監聽函式 */
function watchLastSpurt(): { fired: LastSpurtPayload[]; off: () => void } {
    const fired: LastSpurtPayload[] = [];
    const off = services().event.on(EVENT_NAMES.LastSpurtEntered, (data?: LastSpurtPayload) => {
        if (data) fired.push(data);
    });
    return { fired, off };
}

export function createLastSpurtFlowSuite(): TestSuite {
    const suite = new TestSuite('LastSpurtFlow (殘局判斷接進回合切換 FORM-10)');

    suite.test('兵力不折損：第 4 回合結束未進入，第 5 回合開始以 turn 進入，事件只發一次且不退出', () => {
        const { ctrl } = battle(2);
        const { fired, off } = watchLastSpurt();
        for (let cycle = 1; cycle <= 3; cycle++) runCycle(ctrl);
        assert.equals(4, services().battle.getSnapshot().turn);
        assert.isFalse(ctrl.state.lastSpurtMode);
        assert.equals(0, fired.length);

        runCycle(ctrl);
        assert.equals(5, services().battle.getSnapshot().turn);
        assert.isTrue(ctrl.state.lastSpurtMode);
        assert.equals(1, fired.length);
        assert.equals('turn', fired[0].reason);
        assert.equals(5, fired[0].turn);

        runCycle(ctrl);
        runCycle(ctrl);
        assert.isTrue(ctrl.state.lastSpurtMode);
        assert.equals(1, fired.length);
        off();
    });

    suite.test('存活恰好 50% 不進入；低於 50% 於下一回合以 attrition 進入', () => {
        const { ctrl, playerTroops } = battle(4);
        const { fired, off } = watchLastSpurt();
        runCycle(ctrl, 0);
        assert.equals(4, ctrl.state.peakTroopCount);

        playerTroops[0].currentHp = 0;
        playerTroops[1].currentHp = 0;
        runCycle(ctrl, 0);
        assert.isFalse(ctrl.state.lastSpurtMode);
        assert.equals(0, fired.length);

        playerTroops[2].currentHp = 0;
        runCycle(ctrl, 0);
        assert.isTrue(ctrl.state.lastSpurtMode);
        assert.equals(1, fired.length);
        assert.equals('attrition', fired[0].reason);
        assert.equals(4, services().battle.getSnapshot().turn);
        off();
    });

    suite.test('新一局重置：殘局旗標與峰值歸零', () => {
        const { ctrl } = battle(2);
        for (let cycle = 1; cycle <= 4; cycle++) runCycle(ctrl);
        assert.isTrue(ctrl.state.lastSpurtMode);
        ctrl.state.reset(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.isFalse(ctrl.state.lastSpurtMode);
        assert.equals(0, ctrl.state.peakTroopCount);
    });

    return suite;
}
