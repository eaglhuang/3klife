/**
 * WisdomMeterFlow.test.ts — 軍師智謀能量接進回合推進（SCN-10，PROG-2-1553）
 *
 * 用 BattleController 真實的「玩家階段 → 敵方階段 → 收尾」跑回合，鎖住：
 * - 主將智力 100：每回合累積 50，第 2 回合滿 100 觸發一次並歸零，第 3 回合重新累積。
 * - 戰場重置後能量與觸發次數歸零。
 *
 * Unity 對照：像一個每回合 Update 累加的 Timer，填滿就發一次事件並歸零。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { aiDifficultyEntryOf, parseAiDifficultyTable, type AiDifficultyEntry } from '../assets/scripts/core/systems/AiDifficultyTable';
import { TestSuite, assert } from './TestRunner';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');

function normalEntry(): AiDifficultyEntry {
    const { table } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
    return aiDifficultyEntryOf(table!, 'normal');
}

function battle(strategistInt: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(new GeneralUnit({
        id: 'p', name: 'p', faction: Faction.Player, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: strategistInt, lea: 60,
        tacticSlots: [], ultimateSlots: [], rebirthCount: 1,
    }), new GeneralUnit({
        id: 'e', name: 'e', faction: Faction.Enemy, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        tacticSlots: [], ultimateSlots: [], rebirthCount: 1,
    }));
    ctrl.configureAiDifficulty(normalEntry());
    ctrl.placeGeneralOnBoard(2, 2);
    const unit = new TroopUnit('p-troop', TroopType.Infantry, Faction.Player, { hp: 100000, attack: 1, defense: 1, moveRange: 0, attackRange: 0 });
    unit.moveTo(0, 1);
    ctrl.state.addUnit(unit);
    return ctrl;
}

function runCycle(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createWisdomMeterFlowSuite(): TestSuite {
    const suite = new TestSuite('WisdomMeterFlow (軍師智謀能量接進回合推進 SCN-10 PROG-2-1553)');

    suite.test('智力 100：第 1 回合 50、第 2 回合滿 100 觸發並歸零、第 3 回合重新累積', () => {
        const ctrl = battle(100);
        runCycle(ctrl);
        assert.equals(50, ctrl.state.wisdomMeter);
        assert.equals(0, ctrl.state.wisdomTriggerCount);

        runCycle(ctrl);
        assert.equals(0, ctrl.state.wisdomMeter);
        assert.equals(1, ctrl.state.wisdomTriggerCount);

        runCycle(ctrl);
        assert.equals(50, ctrl.state.wisdomMeter);
        assert.equals(1, ctrl.state.wisdomTriggerCount);
    });

    suite.test('智力 0：能量不累積，不觸發', () => {
        const ctrl = battle(0);
        runCycle(ctrl);
        runCycle(ctrl);
        assert.equals(0, ctrl.state.wisdomMeter);
        assert.equals(0, ctrl.state.wisdomTriggerCount);
    });

    return suite;
}
