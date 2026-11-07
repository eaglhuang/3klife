/**
 * AiTurnEndRecalculate — AI 季度全軍強度重算（doc_data_0002 E 段；AIS-13；PROG-2-2055）
 */
import { assert, TestSuite } from './TestRunner';
import { AI_TALLY_EXP_PER_TURN, aiTallyAutoStar, recalculateAiNation, shouldShiftDefensive } from '../assets/scripts/core/systems/AiTurnEndRecalculate';
import { evaluateAiPower } from '../assets/scripts/core/systems/AiPowerEvaluation';

const stats = { STR: 80, INT: 60, LEA: 70, POL: 50, CHA: 40, LUK: 30 };
const gen = (uid: string, age: number) => ({ uid, age, stats, specialTroop: null, tacticTpCosts: [20], reincarnation: 0 });

export function createAiTurnEndRecalculateSuite(): TestSuite {
    const suite = new TestSuite('AiTurnEndRecalculate (AI 季度強度重算 AIS-13 PROG-2-2055)');

    suite.test('年齡每季 +0.25 並重判分段（39.75 → 40 進入 Peak）', () => {
        const r = recalculateAiNation({ generals: [gen('a', 39.75)], tallies: [] });
        assert.equals(40, r.generals[0].age);
        assert.equals('Peak', r.agePhases[0]);
    });

    suite.test('虎符 1~3★ 自動升星，到 3★ 或品質上限即停', () => {
        assert.equals(2, aiTallyAutoStar({ quality: 'SSR', star: 1, exp: 100 - AI_TALLY_EXP_PER_TURN }).star);
        assert.equals(1, aiTallyAutoStar({ quality: 'SSR', star: 1, exp: 0 }).star);
        assert.equals(3, aiTallyAutoStar({ quality: 'UR', star: 3, exp: 9999 }).star);
    });

    suite.test('軍力指數為全體戰力加總，且沿用 evaluateAiPower', () => {
        const r = recalculateAiNation({ generals: [gen('a', 30), gen('b', 50)], tallies: [] });
        const expectA = evaluateAiPower({ stats, specialTroop: null, tacticTpCosts: [20], reincarnation: 0, agePhase: 'Prime' });
        assert.equals(expectA, r.powers[0]);
        assert.equals(r.powers[0] + r.powers[1], r.militaryIndex);
    });

    suite.test('低於平均 0.7 倍轉守勢；平均為 0 不轉', () => {
        assert.equals(true, shouldShiftDefensive(69, 100));
        assert.equals(false, shouldShiftDefensive(70, 100));
        assert.equals(false, shouldShiftDefensive(0, 0));
    });

    return suite;
}
