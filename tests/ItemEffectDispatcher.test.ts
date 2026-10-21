import { assert, TestSuite } from './TestRunner';
import { createItemEffectDispatcher, isItemEffectType, vitalityRestoreAmount } from '../assets/scripts/core/systems/ItemEffectDispatcher';

export function createItemEffectDispatcherSuite(): TestSuite {
    const suite = new TestSuite('ItemEffectDispatcher (ITM-04a 道具效果派發)');

    suite.test('已註冊的效果：把 value 與 ctx 交給處理函式，回傳其結果', () => {
        const dispatcher = createItemEffectDispatcher<{ log: string[] }, number>({
            RESTORE_VITALITY: (value, ctx) => { ctx.log.push(`vit+${value}`); return value * 2; },
        });
        const ctx = { log: [] as string[] };
        const result = dispatcher.apply('RESTORE_VITALITY', 30, ctx);
        assert.isTrue(result.ok);
        assert.equals(60, (result as { ok: true; result: number }).result);
        assert.equals('vit+30', ctx.log[0]);
    });

    suite.test('未註冊的效果：回傳 UNREGISTERED_EFFECT，處理函式不被呼叫', () => {
        const dispatcher = createItemEffectDispatcher<null, number>({});
        const result = dispatcher.apply('ORACLE', 1, null);
        assert.isFalse(result.ok);
        assert.equals('UNREGISTERED_EFFECT', (result as { ok: false; reason: string }).reason);
    });

    suite.test('Effect_Value 非正數或非有限數：拒絕，處理函式不被呼叫', () => {
        let calls = 0;
        const dispatcher = createItemEffectDispatcher<null, number>({ REFRESH: () => { calls++; return 1; } });
        assert.equals('INVALID_VALUE', (dispatcher.apply('REFRESH', 0, null) as { reason: string }).reason);
        assert.equals('INVALID_VALUE', (dispatcher.apply('REFRESH', -1, null) as { reason: string }).reason);
        assert.equals('INVALID_VALUE', (dispatcher.apply('REFRESH', Number.NaN, null) as { reason: string }).reason);
        assert.equals(0, calls);
    });

    suite.test('效果類型判定：六種規格類型為真，其餘為假', () => {
        assert.isTrue(isItemEffectType('EQUIP'));
        assert.isTrue(isItemEffectType('BOOST_CONCEPTION'));
        assert.isFalse(isItemEffectType('HEAL'));
        assert.isFalse(isItemEffectType(undefined));
    });

    suite.test('回精力 50%：依上限取整數，上限非正數為 0', () => {
        assert.equals(60, vitalityRestoreAmount(120));
        assert.equals(50, vitalityRestoreAmount(101));
        assert.equals(0, vitalityRestoreAmount(0));
        assert.equals(0, vitalityRestoreAmount(Number.NaN));
    });

    return suite;
}
