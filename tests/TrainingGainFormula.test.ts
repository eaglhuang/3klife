/**
 * TrainingGainFormula.test.ts — 培育屬性增長總公式與各乘區（FORM-01，PROG-2-1290）headless 測試
 *
 * 鎖住：加法區、資質、運勢、陪伴（加法後乘入）、傾囊相授（唯一連乘）、人數補正，以及整條公式的數值。
 */
import { assert, TestSuite } from './TestRunner';
import { trainingGainBreakdown, type TrainingGainInput } from '../assets/scripts/core/systems/TrainingGainFormula';

/** 所有乘區都是中性值的輸入，個別案例只改自己要測的那一項 */
function neutral(overrides: Partial<TrainingGainInput> = {}): TrainingGainInput {
    return {
        base: 10,
        cardBonuses: [],
        generalGrowth: 0,
        baseMorale: 0,
        moraleBoosts: [],
        trainingBoosts: [],
        friendshipBursts: [],
        extraCrowd: 0,
        ...overrides,
    };
}

function near(actual: number, expected: number): boolean {
    return Math.abs(actual - expected) < 1e-9;
}

export function createTrainingGainFormulaSuite(): TestSuite {
    const suite = new TestSuite('TrainingGainFormula (培育屬性增長總公式 FORM-01)');

    suite.test('加法區：基礎值與教官加值直接相加', () => {
        const result = trainingGainBreakdown(neutral({ base: 10, cardBonuses: [5, 3] }));
        assert.isTrue(near(result.additive, 18));
        assert.isTrue(near(result.gain, 18));
    });

    suite.test('資質：Gr 0.2 = +20%，乘在加法區之後', () => {
        const result = trainingGainBreakdown(neutral({ generalGrowth: 0.2 }));
        assert.isTrue(near(result.growth, 1.2));
        assert.isTrue(near(result.gain, 12));
    });

    suite.test('運勢：預設基礎係數 0.2；教官運勢效果先加總再放大基礎係數', () => {
        assert.isTrue(near(trainingGainBreakdown(neutral({ baseMorale: undefined })).morale, 1.2));
        assert.isTrue(near(trainingGainBreakdown(neutral({ baseMorale: undefined, moraleBoosts: [0.5] })).morale, 1 + 0.2 * 1.5));
    });

    suite.test('陪伴：各教官效果加法相加後乘入，不是逐個連乘', () => {
        const result = trainingGainBreakdown(neutral({ trainingBoosts: [0.1, 0.2] }));
        assert.isTrue(near(result.training, 1.3));
    });

    suite.test('傾囊相授：多位教官逐個連乘（唯一的連乘區）', () => {
        const single = trainingGainBreakdown(neutral({ friendshipBursts: [0.25] }));
        const pair = trainingGainBreakdown(neutral({ friendshipBursts: [0.5, 0.5] }));
        assert.isTrue(near(single.friendship, 1.25));
        // 連乘得 2.25；若誤用加法只會得 2.0
        assert.isTrue(near(pair.friendship, 2.25));
    });

    suite.test('傾囊相授：沒有觸發時為 1，不影響結果', () => {
        assert.isTrue(near(trainingGainBreakdown(neutral()).friendship, 1));
    });

    suite.test('人數補正：每位閒雜角色 +5%', () => {
        assert.isTrue(near(trainingGainBreakdown(neutral({ extraCrowd: 0 })).crowd, 1));
        assert.isTrue(near(trainingGainBreakdown(neutral({ extraCrowd: 2 })).crowd, 1.1));
    });

    suite.test('總公式：各乘區依序相乘，數值與手冊一致', () => {
        // (10 + 5) × 1.2 × 1.2 × 1.25 × 1.1 = 29.7
        const result = trainingGainBreakdown(neutral({
            baseMorale: undefined,
            cardBonuses: [5],
            generalGrowth: 0.2,
            friendshipBursts: [0.25],
            extraCrowd: 2,
        }));
        assert.isTrue(near(result.gain, 29.7));
    });

    suite.test('基礎運勢係數可以覆寫', () => {
        const result = trainingGainBreakdown(neutral({ baseMorale: 0.1 }));
        assert.isTrue(near(result.morale, 1.1));
    });

    return suite;
}
