/**
 * AI 部署依 Profile 路線策略選路（AI武將強度 E-4／E-6，PROG-2-1463）headless 測試
 *
 * 覆蓋：六種策略的暫定挑線規則、同分隨機、null 隨機；
 * ai-profiles.json 的 generalProfiles 解析與武將 → 路線策略查詢；
 * EnemyAI 依策略部署、BattleController 開戰把敵將策略交給 EnemyAI。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { AI_CHARGE_DEFAULT_LANE, pickDeployLane } from '../assets/scripts/core/systems/AiLaneStrategy';
import { laneStrategyOfGeneral, parseAiProfileTable } from '../assets/scripts/core/systems/AiProfiles';
import { EnemyAI } from '../assets/scripts/battle/controllers/EnemyAI';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { Faction, GAME_CONFIG, TroopType, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';

const ALL = [0, 1, 2, 3, 4];
const first = () => 0;

function loadRealProfiles(): Record<string, unknown> {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-profiles.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function createAiLaneStrategySuite(): TestSuite {
    const suite = new TestSuite('AiLaneStrategy (AI 部署路線策略 PROG-2-1463)');

    suite.test('FOCUS_2_3：只挑中央 3 路，路內挑己方最少的線；中央滿了才用邊路', () => {
        const occ = { own: [0, 2, 1, 2, 0], opponent: [0, 0, 0, 0, 0] };
        assert.equals(2, pickDeployLane('FOCUS_2_3', ALL, occ, first));
        assert.equals(0, pickDeployLane('FOCUS_2_3', [0, 4], occ, first));
    });

    suite.test('SPREAD_5／ALL_5：挑己方最少的線', () => {
        const occ = { own: [1, 1, 0, 1, 1], opponent: [0, 0, 0, 0, 0] };
        assert.equals(2, pickDeployLane('SPREAD_5', ALL, occ, first));
        assert.equals(2, pickDeployLane('ALL_5', ALL, occ, first));
    });

    suite.test('SCOUT_WEAK：挑玩家部隊最少的線', () => {
        const occ = { own: [0, 0, 0, 0, 0], opponent: [2, 1, 3, 0, 2] };
        assert.equals(3, pickDeployLane('SCOUT_WEAK', ALL, occ, first));
    });

    suite.test('CAVALRY_CHARGE_1：開局中央；之後集中己方最多的線；滿了挑最近的空線', () => {
        const empty = { own: [0, 0, 0, 0, 0], opponent: [0, 0, 0, 0, 0] };
        assert.equals(AI_CHARGE_DEFAULT_LANE, pickDeployLane('CAVALRY_CHARGE_1', ALL, empty, first));
        const stacked = { own: [0, 0, 0, 3, 0], opponent: [0, 0, 0, 0, 0] };
        assert.equals(3, pickDeployLane('CAVALRY_CHARGE_1', ALL, stacked, first));
        assert.equals(4, pickDeployLane('CAVALRY_CHARGE_1', [0, 1, 4], stacked, first));
    });

    suite.test('EMPTIEST_1_2：挑雙方總數最少的線', () => {
        const occ = { own: [1, 0, 2, 0, 1], opponent: [0, 2, 0, 1, 0] };
        assert.equals(0, pickDeployLane('EMPTIEST_1_2', ALL, occ, first));
        assert.equals(3, pickDeployLane('EMPTIEST_1_2', [1, 2, 3], occ, first));
    });

    suite.test('同分隨機、null 隨機、沒有空線回傳 null', () => {
        const occ = { own: [0, 0, 0, 0, 0], opponent: [0, 0, 0, 0, 0] };
        assert.equals(0, pickDeployLane('SPREAD_5', ALL, occ, () => 0));
        assert.equals(4, pickDeployLane('SPREAD_5', ALL, occ, () => 0.99));
        assert.equals(3, pickDeployLane(null, [1, 3], occ, () => 0.99));
        assert.equals(null, pickDeployLane('SPREAD_5', [], occ, first));
    });

    suite.test('實際 ai-profiles.json：E-6 武將對到 Profile 路線；未列出或 BALANCED 為 null', () => {
        const parsed = parseAiProfileTable(loadRealProfiles());
        assert.equals(0, parsed.errors.length);
        assert.equals('CAVALRY_CHARGE_1', laneStrategyOfGeneral(parsed, 'lu-bu'));
        assert.equals('FOCUS_2_3', laneStrategyOfGeneral(parsed, 'cao-cao'));
        assert.equals('SCOUT_WEAK', laneStrategyOfGeneral(parsed, 'zhuge-liang'));
        assert.equals('ALL_5', laneStrategyOfGeneral(parsed, 'yuan-shao'));
        assert.equals('EMPTIEST_1_2', laneStrategyOfGeneral(parsed, 'guan-yu'));
        assert.equals(null, laneStrategyOfGeneral(parsed, 'liu-bei'), 'BALANCED 規格未定義路線');
        assert.equals(null, laneStrategyOfGeneral(parsed, 'zhang-fei'), '未列出的武將');
    });

    suite.test('generalProfiles 填錯 Profile 代號會回報錯誤且不產生表', () => {
        const raw = { ...loadRealProfiles(), generalProfiles: { 'lu-bu': 'BERSERK' } };
        const parsed = parseAiProfileTable(raw);
        assert.equals(null, parsed.table);
        assert.isTrue(parsed.errors.some((e) => e.includes('generalProfiles.lu-bu')));
        assert.equals(null, laneStrategyOfGeneral(parsed, 'lu-bu'));
    });

    suite.test('EnemyAI：CAVALRY_CHARGE_1 第一支下中央；SCOUT_WEAK 挑玩家最弱的線', () => {
        services().initialize();
        const pg = new GeneralUnit({ id: 'p', name: 'p', faction: Faction.Player, hp: 1000, str: 80, lea: 80 });
        const eg = new GeneralUnit({ id: 'e', name: 'e', faction: Faction.Enemy, hp: 1000, str: 80, lea: 80 });
        const ctrl = new BattleController();
        ctrl.initBattle(pg, eg, undefined, Weather.Clear);
        const ai = new EnemyAI(() => 0);
        ai.laneStrategy = 'CAVALRY_CHARGE_1';
        const charge = ai.decideDeploy(ctrl.state, 1000, 1);
        assert.equals(AI_CHARGE_DEFAULT_LANE, charge[0].lane);

        ai.laneStrategy = 'SCOUT_WEAK';
        for (let lane = 0; lane < GAME_CONFIG.GRID_LANES; lane++) {
            if (lane === 4) continue;
            const unit = new TroopUnit(`p-${lane}`, TroopType.Infantry, Faction.Player, { hp: 100, attack: 10, defense: 10, moveRange: 1, attackRange: 1 });
            unit.moveTo(lane, 1);
            ctrl.state.addUnit(unit);
        }
        assert.equals(4, ai.decideDeploy(ctrl.state, 1000, 1)[0].lane, '玩家空著的第 4 路最弱');
    });

    suite.test('BattleController.initBattle 把敵將 aiLaneStrategy 交給 EnemyAI', () => {
        services().initialize();
        const pg = new GeneralUnit({ id: 'p', name: 'p', faction: Faction.Player, hp: 1000, str: 80, lea: 80 });
        const eg = new GeneralUnit({ id: 'lu-bu', name: '呂布', faction: Faction.Enemy, hp: 1000, str: 80, lea: 80 });
        eg.aiLaneStrategy = 'CAVALRY_CHARGE_1';
        const ctrl = new BattleController();
        ctrl.initBattle(pg, eg, undefined, Weather.Clear);
        assert.equals('CAVALRY_CHARGE_1', ctrl['enemyAi'].laneStrategy);
        const plain = new GeneralUnit({ id: 'x', name: 'x', faction: Faction.Enemy, hp: 1000, str: 80, lea: 80 });
        ctrl.initBattle(pg, plain, undefined, Weather.Clear);
        assert.equals(null, ctrl['enemyAi'].laneStrategy);
    });

    return suite;
}
