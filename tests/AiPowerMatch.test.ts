/**
 * AiPowerMatch.test.ts — AI 戰力評估 F-1 與 ±20% 縮放匹配（AIS-09）
 *
 * 鎖住：F-1 各項加總（屬性、戰法 TP×10、轉生×2000、年齡×1000）；
 * 差在 ±20% 內不動；超出時拉回 ±20% 邊界；結果夾在 0.7 ~ 2.5。
 *
 * Unity 對照：像比對兩個角色的 CombatPower，差太多就調整敵方 StatMultiplier，再用設計師設的上下限夾住。
 */
import { assert, TestSuite } from './TestRunner';
import { evaluateAiPower, matchAiScaleToPlayerPower, type AiPowerInput } from '../assets/scripts/core/systems/AiPowerMatch';

function baseInput(overrides: Partial<AiPowerInput> = {}): AiPowerInput {
    return {
        str: 100, int: 50, lea: 80, pol: 20, cha: 70, luk: 60,
        ageStage: 'Prime', tacticTpCosts: [], reincarnation: 1, ...overrides,
    };
}

export function createAiPowerMatchSuite(): TestSuite {
    const suite = new TestSuite('AiPowerMatch (AI 戰力評估與匹配 AIS-09)');

    suite.test('F-1 加總：屬性＋戰法 TP×10＋轉生×2000＋年齡×1000', () => {
        // 屬性 380；戰法 TP 3+2 → 50；轉生 1 → 2000；Prime 年齡修正 1.0 → 1000
        const power = evaluateAiPower(baseInput({ tacticTpCosts: [3, 2] }));
        assert.equals(380 + 50 + 2000 + 1000, power);
    });

    suite.test('虎符兵種戰力會加進總戰力，沒傳就是 0', () => {
        assert.equals(evaluateAiPower(baseInput()) + 300, evaluateAiPower(baseInput({ tallyPower: 300 })));
    });

    suite.test('差在 ±20% 內不調整縮放', () => {
        assert.equals(1.0, matchAiScaleToPlayerPower(1000, 1.0, 1150));
        assert.equals(1.0, matchAiScaleToPlayerPower(1000, 1.0, 850));
    });

    suite.test('AI 強過玩家 20% 以上：縮放往下拉回 ×1.2 邊界', () => {
        // AI 1500 vs 玩家 1000：目標 1200，縮放 1.0 × 1200/1500 = 0.8
        const scale = matchAiScaleToPlayerPower(1500, 1.0, 1000);
        assert.isTrue(Math.abs(scale - 0.8) < 1e-9);
    });

    suite.test('AI 弱於玩家 20% 以上：縮放往上拉回 ×0.8 邊界', () => {
        // AI 500 vs 玩家 1000：目標 800，縮放 1.0 × 800/500 = 1.6
        const scale = matchAiScaleToPlayerPower(500, 1.0, 1000);
        assert.isTrue(Math.abs(scale - 1.6) < 1e-9);
    });

    suite.test('調整結果夾在 0.7 ~ 2.5', () => {
        assert.equals(2.5, matchAiScaleToPlayerPower(100, 1.0, 10000));
        assert.equals(0.7, matchAiScaleToPlayerPower(100000, 1.0, 100));
    });

    return suite;
}
