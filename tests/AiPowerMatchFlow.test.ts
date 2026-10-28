/**
 * AiPowerMatchFlow.test.ts — ±20% 戰力匹配接進開戰與多回合流程（AIS-09）
 *
 * 鎖住：
 * - 玩家帶轉生的出征武將（實戰戰力高於模板）對原始模板敵將：開戰時縮放有被拉回邊界，並在三個完整回合中維持不變。
 * - 模板對模板（差距不到 20%）：縮放維持難度表原值，不觸發匹配。
 *
 * Unity 對照：像開場時依玩家實際 CombatPower 調整敵方 StatMultiplier，之後每回合 Spawner 都沿用這個倍率，不會中途改回去。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { aiDifficultyEntryOf, parseAiDifficultyTable, type AiDifficultyEntry } from '../assets/scripts/core/systems/AiDifficultyTable';
import { EMPTY_AI_ADAPTIVE_STREAK } from '../assets/scripts/core/systems/AiAdaptiveDifficulty';
import { matchAiScaleToPlayerPower } from '../assets/scripts/core/systems/AiPowerMatch';
import { createGeneral, loadEnemyScale, playerPowerOfGeneral, templatePowerOf } from '../assets/scripts/battle/views/BattleSceneLoader';
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const ENCOUNTER_ID = 'encounter-001';
const ENEMY_ID = 'lu-bu';
const PLAYER_TEMPLATE_ID = 'zhang-fei';
const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');

function normalEntry(): AiDifficultyEntry {
    const { table } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
    return aiDifficultyEntryOf(table!, 'normal');
}

/** 轉生八次的玩家武將：實戰戰力遠高於模板，會觸發 ±20% 匹配 */
function veteranPlayer(): GeneralUnit {
    return new GeneralUnit({
        id: PLAYER_TEMPLATE_ID, name: PLAYER_TEMPLATE_ID, faction: Faction.Player, hp: 1000, maxSp: 100, initialSp: 0,
        str: 100, int: 60, lea: 80, pol: 40, cha: 60, luk: 60, tacticSlots: [],
        rebirthCount: 8,
    });
}

function startBattle(player: GeneralUnit, enemy: GeneralUnit, entry: AiDifficultyEntry): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(player, enemy);
    ctrl.configureAiDifficulty(entry);
    ctrl.placeGeneralOnBoard(2, 2);
    return ctrl;
}

export function createAiPowerMatchFlowSuite(): TestSuite {
    const suite = new TestSuite('AiPowerMatchFlow (±20% 匹配接開戰與多回合 AIS-09)');

    suite.test('玩家實戰戰力遠高於模板：開戰縮放被拉回邊界，三回合內不變', async () => {
        services().initialize();
        const playerPower = playerPowerOfGeneral(veteranPlayer());
        const enemyTemplatePower = await templatePowerOf(ENEMY_ID);
        assert.isTrue(enemyTemplatePower !== null);

        const scaleSetting = await loadEnemyScale(ENCOUNTER_ID, 'normal', EMPTY_AI_ADAPTIVE_STREAK, playerPower, ENEMY_ID);
        assert.isTrue(scaleSetting !== undefined);
        const expected = matchAiScaleToPlayerPower(enemyTemplatePower!, 1.0, playerPower);
        assert.isTrue(Math.abs(scaleSetting!.difficulty.statScale - expected) < 1e-9);
        assert.isTrue(Math.abs(scaleSetting!.difficulty.statScale - 1.0) > 1e-6);

        const enemy = await createGeneral(ENEMY_ID, Faction.Enemy, scaleSetting);
        const ctrl = startBattle(veteranPlayer(), enemy, normalEntry());
        const strAtStart = enemy.str;
        for (let turn = 0; turn < 3; turn++) {
            (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
            ctrl.resolvePlayerTurn();
            ctrl.resolveEnemyTurn();
            ctrl.finalizeEnemyTurn();
        }
        assert.equals(strAtStart, enemy.str);
    });

    suite.test('模板對模板（差距不到 20%）：縮放維持難度表原值', async () => {
        services().initialize();
        const playerTemplate = await createGeneral(PLAYER_TEMPLATE_ID, Faction.Player);
        const playerPower = playerPowerOfGeneral(playerTemplate);
        const scaleSetting = await loadEnemyScale(ENCOUNTER_ID, 'normal', EMPTY_AI_ADAPTIVE_STREAK, playerPower, ENEMY_ID);
        assert.equals(normalEntry().statScale, scaleSetting!.difficulty.statScale);
    });

    return suite;
}
