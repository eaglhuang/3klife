/**
 * FormulaRuntime — 公式註冊中心執行期（doc_spec_0338；PROG-2-2023）
 */
import { assert, TestSuite } from './TestRunner';
import { createFormulaRuntime, type IFormula } from '../assets/scripts/core/config/FormulaRuntime';

const COUNTER: IFormula<{ base: number; advantage: boolean }, number> = {
    id: 'combat.counter',
    description: '兵種剋制倍率',
    calculate: (input, config) => {
        const combat = (config.combat ?? {}) as Record<string, number>;
        return input.base * (input.advantage ? combat.counterMultiplierAdvantage : combat.counterMultiplierDisadvantage);
    },
};

export function createFormulaRuntimeSuite(): TestSuite {
    const suite = new TestSuite('FormulaRuntime (公式註冊中心 doc_spec_0338 PROG-2-2023)');

    suite.test('§3 註冊後執行；未註冊丟錯', () => {
        const rt = createFormulaRuntime();
        rt.register(COUNTER);
        rt.loadConfig({ combat: { counterMultiplierAdvantage: 1.2, counterMultiplierDisadvantage: 0.8 } });
        assert.isTrue(rt.has('combat.counter'));
        assert.equals(120, Math.round(rt.execute<{ base: number; advantage: boolean }, number>('combat.counter', { base: 100, advantage: true })));
        let threw = false;
        try { rt.execute('nope', {}); } catch { threw = true; }
        assert.isTrue(threw);
    });

    suite.test('§4.1 設定深度凍結，不受來源物件後續修改影響', () => {
        const rt = createFormulaRuntime();
        const src = { combat: { counterMultiplierAdvantage: 1.2 } };
        rt.loadConfig(src);
        src.combat.counterMultiplierAdvantage = 9;
        assert.equals(1.2, rt.readNumber('combat.counterMultiplierAdvantage', 1));
        assert.isTrue(Object.isFrozen(rt.config()));
        assert.isTrue(Object.isFrozen(rt.config().combat as object));
    });

    suite.test('§4.3 重新載入立即生效', () => {
        const rt = createFormulaRuntime();
        rt.register(COUNTER);
        rt.loadConfig({ combat: { counterMultiplierAdvantage: 1.2, counterMultiplierDisadvantage: 0.8 } });
        rt.loadConfig({ combat: { counterMultiplierAdvantage: 1.5, counterMultiplierDisadvantage: 0.8 } });
        assert.equals(150, Math.round(rt.execute<{ base: number; advantage: boolean }, number>('combat.counter', { base: 100, advantage: true })));
    });

    suite.test('§1.3 缺鍵回退基準值並記警告', () => {
        const logs: string[] = [];
        const rt = createFormulaRuntime((m) => logs.push(m));
        rt.loadConfig({ vitality: { battleCost: 'x' } });
        assert.equals(30, rt.readNumber('vitality.battleCost', 30));
        assert.equals(0.005, rt.readNumber('aging.decayRatePerQuarter', 0.005));
        assert.equals(2, logs.length);
    });

    return suite;
}
