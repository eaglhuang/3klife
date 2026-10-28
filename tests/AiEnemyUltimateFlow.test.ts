/**
 * AiEnemyUltimateFlow.test.ts — 敵方奧義施放接進真實回合流程（AIS-07）
 *
 * 用 BattleController 真實的「玩家階段 → 敵方階段 → 收尾」跑回合，並監聽 GeneralSkillUsed，
 * 確認奧義來源（SkillSourceType.Ultimate）的施放次數：
 * - EASY（canUseUltimate=false）：條件成立也不施放。
 * - NORMAL（MEDIUM）：精力滿、玩家存活 4 支 > 3 時施放一次。
 * - NORMAL：玩家存活 3 支（邊界不成立）不施放。
 * - NORMAL：奧義槽未解鎖時不施放。
 *
 * 注意：敵方精力滿時，既有的戰法選技會照常觸發並把精力歸零，所以精力數值不能當成「有沒有放奧義」的依據。
 *
 * Unity 對照：像 PlayMode 跑完一整個回合，數 AI 的 Ability 實際 Cast 了幾次，而不是只測條件函式。
 */
import * as fs from 'fs';
import * as path from 'path';
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { aiDifficultyEntryOf, parseAiDifficultyTable, type AiDifficultyEntry } from '../assets/scripts/core/systems/AiDifficultyTable';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');
const TEST_BATTLE_SKILL_ID = 'cao-cao-tactics';
const TEST_ULTIMATE_ID = 'test-ultimate';
/** 玩家兵放的格子（避開武將所在的 lane 2） */
const PLAYER_TROOP_LANES = [0, 1, 3, 4];

function tableEntry(difficulty: 'easy' | 'normal'): AiDifficultyEntry {
    const { table, errors } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
    assert.equals(0, errors.length);
    return aiDifficultyEntryOf(table!, difficulty);
}

function general(id: string, faction: Faction, withUltimate: boolean, unlockReincarnation = 1): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: TEST_BATTLE_SKILL_ID, battlePrimarySkillId: TEST_BATTLE_SKILL_ID, tacticSlots: [],
        ultimateSlots: withUltimate ? [{ slot: 1, ultimateId: TEST_ULTIMATE_ID, unlockReincarnation }] : [],
        rebirthCount: 1,
    });
}

function playerTroop(lane: number): TroopUnit {
    const unit = new TroopUnit(`p-troop-${lane}`, TroopType.Infantry, Faction.Player, {
        hp: 100000, attack: 1, defense: 1, moveRange: 0, attackRange: 0,
    });
    unit.moveTo(lane, 1);
    return unit;
}

/** 建立戰場：敵方帶奧義、精力滿；玩家兵取 PLAYER_TROOP_LANES 前 playerTroopCount 格 */
function battle(entry: AiDifficultyEntry, playerTroopCount: number, unlockReincarnation = 1): { ctrl: BattleController; enemy: GeneralUnit } {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const enemy = general('e', Faction.Enemy, true, unlockReincarnation);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player, false), enemy);
    ctrl.configureAiDifficulty(entry);
    ctrl.placeGeneralOnBoard(2, 2);
    enemy.currentSp = enemy.maxSp;
    for (const lane of PLAYER_TROOP_LANES.slice(0, playerTroopCount)) {
        ctrl.state.addUnit(playerTroop(lane));
    }
    return { ctrl, enemy };
}

/** 跑一個完整回合，回傳期間敵方奧義施放次數 */
function runTurnCountingEnemyUltimates(ctrl: BattleController): number {
    let casts = 0;
    const off = services().event.on(EVENT_NAMES.GeneralSkillUsed, (data?: { faction?: Faction; sourceType?: SkillSourceType }) => {
        if (data?.faction === Faction.Enemy && data.sourceType === SkillSourceType.Ultimate) casts++;
    });
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
    off();
    return casts;
}

export function createAiEnemyUltimateFlowSuite(): TestSuite {
    const suite = new TestSuite('AiEnemyUltimateFlow (敵方奧義接進回合流程 AIS-07)');

    suite.test('EASY 難度表 canUseUltimate=false：條件成立也不施放', () => {
        const { ctrl } = battle(tableEntry('easy'), 4);
        assert.equals(null, ctrl.chooseEnemyUltimate());
        assert.equals(0, runTurnCountingEnemyUltimates(ctrl));
    });

    suite.test('NORMAL（MEDIUM）：精力滿、玩家存活 4 支 > 3，敵方階段施放一次奧義', () => {
        const { ctrl } = battle(tableEntry('normal'), 4);
        assert.isTrue(ctrl.chooseEnemyUltimate() !== null);
        assert.equals(1, runTurnCountingEnemyUltimates(ctrl));
    });

    suite.test('NORMAL：玩家存活只有 3 支（邊界不成立），不施放', () => {
        const { ctrl } = battle(tableEntry('normal'), 3);
        assert.equals(null, ctrl.chooseEnemyUltimate());
        assert.equals(0, runTurnCountingEnemyUltimates(ctrl));
    });

    suite.test('NORMAL：奧義槽未解鎖（需 5 轉）時不施放', () => {
        const { ctrl } = battle(tableEntry('normal'), 4, 5);
        assert.equals(null, ctrl.chooseEnemyUltimate());
        assert.equals(0, runTurnCountingEnemyUltimates(ctrl));
    });

    return suite;
}
