/**
 * AiDuelFlowWiring.test.ts — 單挑 AI 接受判定接進戰鬥單挑流程（AIS-10 接線 / PROG-2-1323）
 *
 * 鎖住：敵方 AI 防守時依難度閾值與抖動決定接受（EASY 0.45、一般 0.58）；
 * 玩家防守時不受難度與抖動影響，仍用 0.58。
 * 以真實 BattleController 的單挑評估流程驗證，不直接呼叫純函式。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { AiDifficulty } from '../assets/scripts/core/systems/AiSpCharge';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1,
    });
    unit.moveTo(lane, depth);
    return unit;
}

/** 3 對 3 兵力、雙方主將半血（E-7 血量項 0.5，兵力與戰力勢均），單挑分數恰為 0.5；難度與骰子由呼叫端設定 */
function evenBattle(difficulty: AiDifficulty, roll: number): BattleController {
    services().initialize();
    // 骰子必須在 [0, 1)，1 會讓亂數索引越界並污染後續測試
    services().session.setRandomSource(() => roll);
    const ctrl = new BattleController();
    const challenger = general('challenger', Faction.Player);
    const defender = general('defender', Faction.Enemy);
    ctrl.initBattle(challenger, defender);
    challenger.currentHp = challenger.maxHp / 2;
    defender.currentHp = defender.maxHp / 2;
    ctrl.state.aiDifficulty = difficulty;
    for (let i = 0; i < 3; i += 1) ctrl.state.addUnit(troop(`p-${i}`, Faction.Player, 2, 1 + i));
    for (let i = 0; i < 3; i += 1) ctrl.state.addUnit(troop(`e-${i}`, Faction.Enemy, 2, 6 - i));
    return ctrl;
}

export function createAiDuelFlowWiringSuite(): TestSuite {
    const suite = new TestSuite('AiDuelFlowWiring (單挑 AI 接受判定接線 AIS-10 / PROG-2-1323)');

    suite.test('分數恰為 0.5（血量 0.5、兵力與戰力勢均），後續案例才有意義', () => {
        const result = evenBattle('normal', 0.5)['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        assert.isTrue(Math.abs(result.score - 0.5) < 1e-9, `score=${result.score}`);
    });

    suite.test('敵方 AI 防守、一般難度：即使抖動到最高（+0.05）仍低於 0.58，拒絕', () => {
        const result = evenBattle('normal', 0.999)['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        assert.isFalse(result.accepted);
        assert.equals(Faction.Enemy, result.defenderFaction);
    });

    suite.test('敵方 AI 防守：EASY 閾值 0.45，同一分數在 EASY 接受、一般拒絕', () => {
        const easy = evenBattle('easy', 0.25)['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        const normal = evenBattle('normal', 0.25)['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        assert.isTrue(easy.accepted);
        assert.isFalse(normal.accepted);
    });

    suite.test('多情境掃描骰子：EASY 每次都接受，一般每次都拒絕；回傳的 score 不受抖動影響', () => {
        const rolls = [0.25, 0.5, 0.75, 0.999];
        const baseline = evenBattle('normal', 0.5)['duelFlow'].evaluateDuelAcceptance(Faction.Player).score;
        for (const roll of rolls) {
            const easy = evenBattle('easy', roll)['duelFlow'].evaluateDuelAcceptance(Faction.Player);
            const normal = evenBattle('normal', roll)['duelFlow'].evaluateDuelAcceptance(Faction.Player);
            assert.isTrue(easy.accepted, `EASY roll=${roll} score=${easy.score}`);
            assert.isFalse(normal.accepted, `一般 roll=${roll} score=${normal.score}`);
            assert.isTrue(Math.abs(easy.score - baseline) < 1e-9, `score 不應受抖動影響 roll=${roll}`);
        }
    });

    suite.test('玩家防守（敵方 AI 挑戰）：不受難度與抖動影響，仍用 0.58 門檻，EASY 與骰子接近 1 也拒絕', () => {
        const result = evenBattle('easy', 0.999)['duelFlow'].evaluateDuelAcceptance(Faction.Enemy);
        assert.equals(Faction.Player, result.defenderFaction);
        assert.isFalse(result.accepted);
    });

    return suite;
}
