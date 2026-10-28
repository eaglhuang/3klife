/**
 * DuelAcceptanceMultiRoundE2E.test.ts — 單挑 AI 接受判定的多回合真實流程（PROG-2-0692）
 *
 * 真實 BattleController 與接進 session 的亂數來源：守方主將血量與兵力逐回合下降，
 * 確認接受判定由接受翻為拒絕後不再回頭、評估不改動戰場狀態，且相同亂數序列得到相同結果。
 *
 * Unity 對照：像一段 PlayMode 測試，讓守方一路掉血，每回合都問一次「還敢接單挑嗎」。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
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

/** 確定性亂數序列（LCG），值域 [0, 1) */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function newBattle(seed: number): BattleController {
    services().initialize();
    services().session.setRandomSource(seededRandom(seed));
    const ctrl = new BattleController();
    const challenger = general('challenger', Faction.Player);
    const defender = general('defender', Faction.Enemy);
    ctrl.initBattle(challenger, defender);
    ctrl.state.aiDifficulty = 'normal';
    for (let i = 0; i < 3; i += 1) ctrl.state.addUnit(troop(`p-${i}`, Faction.Player, 2, 1 + i));
    for (let i = 0; i < 3; i += 1) ctrl.state.addUnit(troop(`e-${i}`, Faction.Enemy, 2, 6 - i));
    return ctrl;
}

/** 守方逐回合掉血：回傳每回合的接受結果 */
function runRounds(seed: number, rounds: number): { accepted: boolean; score: number }[] {
    const ctrl = newBattle(seed);
    const defender = ctrl.state.getGeneral(Faction.Enemy)!;
    const results: { accepted: boolean; score: number }[] = [];
    for (let round = 0; round < rounds; round += 1) {
        const ratio = 1 - round / (rounds - 1);
        defender.currentHp = Math.max(1, Math.round(defender.maxHp * ratio));
        for (const unit of ctrl.state.units.values()) {
            if (unit.faction === Faction.Enemy) unit.currentHp = Math.max(1, Math.round(unit.maxHp * ratio));
        }
        const result = ctrl['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        results.push({ accepted: result.accepted, score: result.score });
    }
    return results;
}

export function createDuelAcceptanceMultiRoundE2ESuite(): TestSuite {
    const suite = new TestSuite('DuelAcceptanceMultiRoundE2E (PROG-2-0692 單挑接受判定多回合)');

    suite.test('守方逐回合掉血：首回合（滿血）接受，最後（殘血）拒絕，分數單調下降', () => {
        const results = runRounds(7, 8);
        assert.isTrue(results[0].accepted, `首回合守方滿血應接受，score=${results[0].score}`);
        assert.isFalse(results[results.length - 1].accepted, '殘血守方應拒絕');
        for (let i = 1; i < results.length; i += 1) {
            assert.isTrue(results[i].score <= results[i - 1].score + 1e-9, `第 ${i} 回合分數不應回升`);
        }
    });

    suite.test('相同亂數序列得到相同的逐回合結果；評估本身不改動戰場狀態', () => {
        const a = runRounds(21, 8);
        const b = runRounds(21, 8);
        assert.equals(JSON.stringify(a), JSON.stringify(b));

        const ctrl = newBattle(21);
        const defender = ctrl.state.getGeneral(Faction.Enemy)!;
        defender.currentHp = 400;
        const hpBefore = [...ctrl.state.units.values()].map((u) => u.currentHp).join(',');
        const defenderHpBefore = defender.currentHp;
        ctrl['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        ctrl['duelFlow'].evaluateDuelAcceptance(Faction.Player);
        assert.equals(hpBefore, [...ctrl.state.units.values()].map((u) => u.currentHp).join(','));
        assert.equals(defenderHpBefore, defender.currentHp);
    });

    suite.test('不同亂數種子下，明顯強勢的守方（高分）總是接受、殘血守方總是拒絕', () => {
        for (const seed of [1, 2, 3, 4, 5, 99, 12345]) {
            const results = runRounds(seed, 6);
            assert.isTrue(results[0].accepted, `seed=${seed} 滿血守方應接受 score=${results[0].score}`);
            assert.isFalse(results[results.length - 1].accepted, `seed=${seed} 殘血守方應拒絕`);
        }
    });

    return suite;
}
