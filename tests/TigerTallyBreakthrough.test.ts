/**
 * TigerTallyBreakthrough — 虎符星級突破（TRP-11 / PROG-2-0839；PROG-2-0931 依 F-5 目標星級修正）的 headless 測試
 *
 * 鎖住：
 *   - 成本與成功率以目標星級為鍵：3→4 為 3000／50／80%，4→5 為 10000／200／50%，UR 各加 10%
 *   - 失敗扣一半材料、不降星；保底符必成功
 *   - 阻擋：星級不可突破、品質封頂不足、金幣或精華不足時不扣材料
 *   - 不擲骰
 */
import { assert, TestSuite } from './TestRunner';
import {
    breakthroughSuccessRate,
    breakthroughTargetStar,
    resolveTallyBreakthrough,
    TallyBreakthroughInput,
    TallyBreakthroughResult,
} from '../assets/scripts/core/systems/TigerTallyBreakthrough';

function input(overrides: Partial<TallyBreakthroughInput> = {}): TallyBreakthroughInput {
    return { quality: 'SSR', star: 4, gold: 10000, essence: 200, guaranteeTokens: 0, roll: 0.5, ...overrides };
}

function reasonOf(value: TallyBreakthroughInput): string | null {
    const result: TallyBreakthroughResult = resolveTallyBreakthrough(value);
    return result.ok ? null : result.reason;
}

export function createTigerTallyBreakthroughSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyBreakthrough (虎符星級突破 TRP-11 / PROG-2-0931)');

    suite.test('目標星級：3★ 突破到 4★、4★ 突破到 5★，其他星級不可突破', () => {
        assert.equals(4, breakthroughTargetStar(3));
        assert.equals(5, breakthroughTargetStar(4));
        assert.equals(null, breakthroughTargetStar(2));
        assert.equals(null, breakthroughTargetStar(5));
    });

    suite.test('成功率依目標星級：3→4 為 80%、4→5 為 50%，UR 各加 10%', () => {
        assert.equals(0.8, breakthroughSuccessRate('SSR', 4));
        assert.equals(0.9, breakthroughSuccessRate('UR', 4));
        assert.equals(0.5, breakthroughSuccessRate('SSR', 5));
        assert.equals(0.6, breakthroughSuccessRate('UR', 5));
    });

    suite.test('4→5 成功：升到 5★，扣 10000 金幣與 200 精華', () => {
        const result = resolveTallyBreakthrough(input({ roll: 0.49 }));
        assert.isTrue(result.ok && result.success);
        assert.equals(5, result.ok ? result.star : 0);
        assert.equals(10000, result.ok ? result.goldSpent : 0);
        assert.equals(200, result.ok ? result.essenceSpent : 0);
    });

    suite.test('3→4 成功：升到 4★，扣 3000 金幣與 50 精華', () => {
        const result = resolveTallyBreakthrough(input({ star: 3, roll: 0.79 }));
        assert.isTrue(result.ok && result.success);
        assert.equals(4, result.ok ? result.star : 0);
        assert.equals(3000, result.ok ? result.goldSpent : 0);
        assert.equals(50, result.ok ? result.essenceSpent : 0);
    });

    suite.test('失敗：不降星，4→5 扣一半（5000 金幣、100 精華），3→4 扣一半（1500、25）', () => {
        const fail45 = resolveTallyBreakthrough(input({ roll: 0.5 }));
        assert.isTrue(fail45.ok && !fail45.success);
        assert.equals(4, fail45.ok ? fail45.star : 0);
        assert.equals(5000, fail45.ok ? fail45.goldSpent : 0);
        assert.equals(100, fail45.ok ? fail45.essenceSpent : 0);

        const fail34 = resolveTallyBreakthrough(input({ star: 3, roll: 0.8 }));
        assert.isTrue(fail34.ok && !fail34.success);
        assert.equals(3, fail34.ok ? fail34.star : 0);
        assert.equals(1500, fail34.ok ? fail34.goldSpent : 0);
        assert.equals(25, fail34.ok ? fail34.essenceSpent : 0);
    });

    suite.test('UR 的 roll 0.55 成功、SSR 同樣 roll 失敗（4→5）', () => {
        assert.isTrue(resolveTallyBreakthrough(input({ quality: 'UR', roll: 0.55 })).ok);
        const ssr = resolveTallyBreakthrough(input({ quality: 'SSR', roll: 0.55 }));
        assert.isTrue(ssr.ok && !ssr.success);
    });

    suite.test('保底符：必定成功，只消耗 1 張保底符，不看骰', () => {
        const result = resolveTallyBreakthrough(input({ roll: 0.99, guaranteeTokens: 2 }));
        assert.isTrue(result.ok && result.success);
        assert.equals(1, result.ok ? result.guaranteeTokensSpent : 0);
    });

    suite.test('阻擋：星級不可突破、品質封頂不足、金幣或精華不足時不扣材料', () => {
        assert.equals('NOT_BREAKTHROUGH_STAR', reasonOf(input({ star: 2 })));
        assert.equals('NOT_BREAKTHROUGH_STAR', reasonOf(input({ star: 5 })));
        assert.equals('CAP_REACHED', reasonOf(input({ quality: 'R', star: 3 })));
        assert.equals('CAP_REACHED', reasonOf(input({ quality: 'SR', star: 4 })));
        assert.equals('NOT_ENOUGH_GOLD', reasonOf(input({ gold: 9999 })));
        assert.equals('NOT_ENOUGH_ESSENCE', reasonOf(input({ essence: 199 })));
        assert.equals('NOT_ENOUGH_GOLD', reasonOf(input({ star: 3, gold: 2999 })));
        assert.equals('NOT_ENOUGH_ESSENCE', reasonOf(input({ star: 3, essence: 49 })));
    });

    suite.test('同樣輸入每次結果相同（不擲骰）', () => {
        const a = resolveTallyBreakthrough(input({ roll: 0.6 }));
        const b = resolveTallyBreakthrough(input({ roll: 0.6 }));
        assert.equals(JSON.stringify(a), JSON.stringify(b));
    });

    return suite;
}
