/**
 * AiEnemyTallyDeployFlow.test.ts — AI 虎符配發接進敵方部署的多回合流程（PROG-2-1337）
 *
 * 用 BattleController 真實的「玩家階段 → 敵方階段 → 收尾」跑回合，鎖住：
 * - normal 難度、敵將適性為騎兵：配發的騎兵虎符讓敵方每回合都出騎兵（3 回合皆然）。
 * - easy 難度不配發：敵方沒有虎符兵種，部署照舊路徑（不強制任何兵種）。
 *
 * Unity 對照：像 AI 的 Loadout：卡組裡有騎兵卡，每回合出牌都優先出它，而不是每回合重新挑。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { aiDifficultyEntryOf, parseAiDifficultyTable, type AiDifficultyEntry } from '../assets/scripts/core/systems/AiDifficultyTable';
import type { AiDifficulty } from '../assets/scripts/core/systems/AiSpCharge';
import { TestSuite, assert } from './TestRunner';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');
const PLAYER_TROOP_LANES = [0, 1, 3, 4];

function difficultyEntry(id: AiDifficulty): AiDifficultyEntry {
    const { table } = parseAiDifficultyTable(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8')));
    return aiDifficultyEntryOf(table!, id);
}

function enemyGeneral(): GeneralUnit {
    return new GeneralUnit({
        id: 'e', name: 'e', faction: Faction.Enemy, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        tacticSlots: [], ultimateSlots: [], rebirthCount: 1,
        troopAptitude: { CAVALRY: 'S' },
    });
}

function playerTroop(lane: number): TroopUnit {
    const unit = new TroopUnit(`p-troop-${lane}`, TroopType.Infantry, Faction.Player, {
        hp: 100000, attack: 1, defense: 1, moveRange: 0, attackRange: 0,
    });
    unit.moveTo(lane, 1);
    return unit;
}

function battle(difficulty: AiDifficulty): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(new GeneralUnit({
        id: 'p', name: 'p', faction: Faction.Player, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        tacticSlots: [], ultimateSlots: [], rebirthCount: 1,
    }), enemyGeneral());
    ctrl.configureAiDifficulty(difficultyEntry(difficulty));
    ctrl.placeGeneralOnBoard(2, 2);
    PLAYER_TROOP_LANES.forEach(lane => ctrl.state.addUnit(playerTroop(lane)));
    return ctrl;
}

function runCycle(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 100000;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

/** 目前場上的敵方兵種（只算 TroopUnit，且沒有陣亡） */
function enemyTroopTypes(ctrl: BattleController): TroopType[] {
    const types: TroopType[] = [];
    ctrl.state.units.forEach(unit => {
        if (unit instanceof TroopUnit && unit.faction === Faction.Enemy && !unit.isDead()) types.push(unit.type);
    });
    return types;
}

export function createAiEnemyTallyDeployFlowSuite(): TestSuite {
    const suite = new TestSuite('AiEnemyTallyDeployFlow (AI 虎符配發接進敵方部署 PROG-2-1337)');

    suite.test('normal 配發騎兵虎符：3 回合敵方皆出騎兵', () => {
        const ctrl = battle('normal');
        for (let cycle = 1; cycle <= 3; cycle++) {
            runCycle(ctrl);
            const types = enemyTroopTypes(ctrl);
            assert.isTrue(types.length > 0, `cycle ${cycle}: 敵方應有部署`);
            assert.isTrue(types.every(type => type === TroopType.Cavalry), `cycle ${cycle}: 應全為騎兵，實際 ${types.join(',')}`);
        }
    });

    suite.test('easy 不配發：沒有虎符兵種，敵方部署不強制騎兵', () => {
        const ctrl = battle('easy');
        const tallyTypes = (ctrl as unknown as { enemyAi: { tallyTroopTypes: readonly TroopType[] } }).enemyAi.tallyTroopTypes;
        assert.equals(0, tallyTypes.length);
        runCycle(ctrl);
        assert.isTrue(enemyTroopTypes(ctrl).length > 0);
    });

    return suite;
}
