/**
 * TigerTallyBreakthrough — 虎符 4★→5★ 精華突破（TRP-11 / PROG-2-0839）的 headless 測試
 *
 * 鎖住：成功率 80% / UR 90%、失敗扣一半材料、保底符必成功、材料與品質封頂的阻擋、不擲骰。
 */
import { assert, TestSuite } from './TestRunner';
import {
    breakthroughSuccessRate,
    resolveTallyBreakthrough,
    TallyBreakthroughInput,
} from '../assets/scripts/core/systems/TigerTallyBreakthrough';

function input(overrides: Partial<TallyBreakthroughInput> = {}): TallyBreakthroughInput {
    return { quality: 'SSR', star: 4, gold: 3000, essence: 50, guaranteeTokens: 0, roll: 0.5, ...overrides };
}

export function createTigerTallyBreakthroughSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyBreakthrough (虎符精華突破 TRP-11)');

    suite.test('成功率：一般 80%，UR 加 10% 為 90%', () => {
        assert.equals(0.8, breakthroughSuccessRate('SSR'));
        assert.equals(0.9, breakthroughSuccessRate('UR'));
    });

    suite.test('roll 小於成功率即成功，升到 5★ 並扣完整材料', () => {
        const result = resolveTallyBreakthrough(input({ roll: 0.79 }));
        assert.isTrue(result.ok && result.success);
        assert.equals(5, result.ok ? result.star : 0);
        assert.equals(3000, result.ok ? result.goldSpent : 0);
        assert.equals(50, result.ok ? result.essenceSpent : 0);
    });

    suite.test('失敗：不降星、扣一半材料（暫定同時套用金幣與精華）', () => {
        const result = resolveTallyBreakthrough(input({ roll: 0.8 }));
        assert.isTrue(result.ok && !result.success);
        assert.equals(4, result.ok ? result.star : 0);
        assert.equals(1500, result.ok ? result.goldSpent : 0);
        assert.equals(25, result.ok ? result.essenceSpent : 0);
    });

    suite.test('UR 的 roll 0.85 成功、SSR 同樣 roll 失敗', () => {
        assert.isTrue(resolveTallyBreakthrough(input({ quality: 'UR', roll: 0.85 })).ok);
        const ssr = resolveTallyBreakthrough(input({ quality: 'SSR', roll: 0.85 }));
        assert.isTrue(ssr.ok && !ssr.success);
    });

    suite.test('保底符：必定成功，只消耗 1 張保底符，不看骰', () => {
        const result = resolveTallyBreakthrough(input({ roll: 0.99, guaranteeTokens: 2 }));
        assert.isTrue(result.ok && result.success);
        assert.equals(1, result.ok ? result.guaranteeTokensSpent : 0);
    });

    suite.test('阻擋：非 4★、品質封頂不足、金幣或精華不足時不扣材料', () => {
        assert.equals('NOT_4_STAR', reasonOf(input({ star: 3 })));
        assert.equals('CAP_REACHED', reasonOf(input({ quality: 'SR' })));
        assert.equals('NOT_ENOUGH_GOLD', reasonOf(input({ gold: 2999 })));
        assert.equals('NOT_ENOUGH_ESSENCE', reasonOf(input({ essence: 49 })));
    });

    suite.test('同樣輸入每次結果相同（不擲骰）', () => {
        const a = resolveTallyBreakthrough(input({ roll: 0.6 }));
        const b = resolveTallyBreakthrough(input({ roll: 0.6 }));
        assert.equals(JSON.stringify(a), JSON.stringify(b));
    });

    return suite;
}

function reasonOf(value: TallyBreakthroughInput): string {
    const result = resolveTallyBreakthrough(value);
    return result.ok ? '' : result.reason;
}
