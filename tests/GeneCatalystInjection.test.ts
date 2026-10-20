/**
 * GeneCatalystInjection.test.ts — 因子媒介注入子嗣（BLT-10 接線，PROG-2-0864）
 *
 * Unity 對照：像 EditMode 測試，驗一個純函式 Command：擲骰命中才加入，媒介只在真的擲骰後消耗，
 * 輸入物件不被修改。
 */
import { assert, TestSuite } from './TestRunner';
import { CATALYST_BASE_INHERITANCE_CHANCE, injectCatalystFactor } from '../assets/scripts/core/systems/GeneCatalyst';

const RETIRED = { genes: [{ id: 'F1' }, { id: 'F2' }] };

export function createGeneCatalystInjectionSuite(): TestSuite {
    const suite = new TestSuite('GeneCatalystInjection (因子媒介注入 BLT-10)');

    suite.test('命中：子嗣加入退役武將第一個它還沒有的因子，媒介已消耗', () => {
        const child = { genes: [{ id: 'F1' }] };
        const result = injectCatalystFactor(RETIRED, child, () => 0);
        assert.equals('F2', result.injectedFactorId!);
        assert.equals('F1,F2', result.child.genes.map((g) => g.id).join(','));
        assert.isTrue(result.consumed);
    });

    suite.test('未命中：子嗣不變，但擲過骰所以媒介仍消耗', () => {
        const child = { genes: [{ id: 'F9' }] };
        const result = injectCatalystFactor(RETIRED, child, () => 0.99);
        assert.isTrue(result.injectedFactorId === null);
        assert.equals('F9', result.child.genes.map((g) => g.id).join(','));
        assert.isTrue(result.consumed);
    });

    suite.test('機率是基礎機率加 25 個百分點（暫定 0.5 → 0.75）', () => {
        assert.equals(0.5, CATALYST_BASE_INHERITANCE_CHANCE);
        const justBelow = injectCatalystFactor(RETIRED, { genes: [] }, () => 0.7499);
        const atLine = injectCatalystFactor(RETIRED, { genes: [] }, () => 0.75);
        assert.isTrue(justBelow.injectedFactorId !== null);
        assert.isTrue(atLine.injectedFactorId === null);
    });

    suite.test('沒有可注入的因子：不擲骰、不消耗', () => {
        let rolled = false;
        const result = injectCatalystFactor(RETIRED, { genes: [{ id: 'F1' }, { id: 'F2' }] }, () => {
            rolled = true;
            return 0;
        });
        assert.isFalse(rolled);
        assert.isFalse(result.consumed);
        assert.equals('NO_CANDIDATE', result.reason!);
    });

    suite.test('媒介已用過：不擲骰、不注入', () => {
        let rolled = false;
        const result = injectCatalystFactor({ ...RETIRED, catalystUsed: true }, { genes: [] }, () => {
            rolled = true;
            return 0;
        });
        assert.isFalse(rolled);
        assert.isFalse(result.consumed);
        assert.equals('ALREADY_USED', result.reason!);
    });

    suite.test('不改輸入：子嗣與退役武將的陣列都保持原狀', () => {
        const child = { genes: [{ id: 'F1' }] };
        injectCatalystFactor(RETIRED, child, () => 0);
        assert.equals(1, child.genes.length);
        assert.equals(2, RETIRED.genes.length);
    });

    return suite;
}
