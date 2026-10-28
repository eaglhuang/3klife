/**
 * AiPowerEvaluation.test.ts — AI 特殊兵種戰力與總戰力評估（E-2b、F-1，PROG-2-1471）
 */
import {
    aiGeneralStatBonus, aiPowerMatchDiff, aiSpecialTroopPower, evaluateAiPower, isAiPowerMatched,
    type AiGeneralStats,
} from '../assets/scripts/core/systems/AiPowerEvaluation';
import { TestSuite, assert } from './TestRunner';

const STATS: AiGeneralStats = { STR: 100, INT: 200, LEA: 300, POL: 400, CHA: 500, LUK: 50 };

function near(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

export function createAiPowerEvaluationSuite(): TestSuite {
    const suite = new TestSuite('AiPowerEvaluation (AI 戰力評估 E-2b F-1 PROG-2-1471)');

    suite.test('屬性修正依兵種主副屬性：(主×0.7＋副×0.3)/1000', () => {
        near((100 * 0.7 + 300 * 0.3) / 1000, aiGeneralStatBonus(STATS, 'CAVALRY'));
        near((300 * 0.7 + 100 * 0.3) / 1000, aiGeneralStatBonus(STATS, 'SHIELD'));
        near((300 * 0.7 + 500 * 0.3) / 1000, aiGeneralStatBonus(STATS, 'NAVY'));
    });

    suite.test('特殊兵種攻防：品質×星級×屬性×適性×共鳴，防禦屬性修正減半並取整', () => {
        const bonus = (200 * 0.7 + 300 * 0.3) / 1000; // ARCHER：INT＋LEA
        const common = 1.5 * (1 + 3 * 0.08) * 1.2 * 1.1; // UR、3 星、S、共鳴
        const power = aiSpecialTroopPower({
            stats: STATS, baseType: 'ARCHER', aptitude: 'S', troopAttack: 100, troopDefense: 80,
            quality: 'UR', star: 3, resonance: true,
        });
        assert.equals(Math.floor(100 * common * (1 + bonus)), power.attack);
        assert.equals(Math.floor(80 * common * (1 + bonus * 0.5)), power.defense);
    });

    suite.test('適性缺值視為 B、無共鳴', () => {
        const bonus = (100 * 0.7 + 300 * 0.3) / 1000;
        const power = aiSpecialTroopPower({
            stats: STATS, baseType: 'INFANTRY', troopAttack: 100, troopDefense: 100,
            quality: 'R', star: 0, resonance: false,
        });
        assert.equals(Math.floor(100 * (1 + bonus)), power.attack);
    });

    suite.test('總戰力：六圍＋兵種×2＋TP×10＋轉生×2000＋年齡×1000', () => {
        const total = evaluateAiPower({
            stats: STATS, specialTroop: { attack: 150, defense: 100 }, tacticTpCosts: [3, 5],
            reincarnation: 1, agePhase: 'Peak',
        });
        near(1550 + 500 + 80 + 2000 + 1.1 * 1000, total);
        near(1550 + 1000, evaluateAiPower({ stats: STATS, specialTroop: null, tacticTpCosts: [], reincarnation: 0, agePhase: 'Prime' }));
    });

    suite.test('難度匹配：±20% 內算匹配，玩家戰力 0 不匹配', () => {
        assert.isTrue(isAiPowerMatched(1200, 1000));
        assert.isTrue(isAiPowerMatched(800, 1000));
        assert.isTrue(!isAiPowerMatched(1201, 1000));
        assert.equals(Infinity, aiPowerMatchDiff(100, 0));
        assert.isTrue(isAiPowerMatched(1300, 1000, 0.3));
    });

    return suite;
}
