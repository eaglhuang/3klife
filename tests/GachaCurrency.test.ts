/**
 * GachaCurrency.test.ts — 轉蛋貨幣分流與扣款規則 headless 測試（PROG-2-0336 / WBS GCH-04）
 *
 * Unity 對照：EditMode Test，逐條檢查商店櫃位的可買規則與定向保底計數。
 */
import { assert, TestSuite } from './TestRunner';
import {
    activateDirectedPity,
    advanceDirectedPity,
    checkGachaSpend,
    createDirectedPity,
    DIRECTED_PITY_CAP,
    isDirectedPityDue,
    isPoolAcceptingCurrency,
    quoteGachaCost,
} from '../assets/scripts/core/systems/GachaCurrency';

export function createGachaCurrencySuite(): TestSuite {
    const suite = new TestSuite('GachaCurrency (貨幣分流 GCH-04)');

    suite.test('靈玉：名將池、支援卡池、限定池皆可用', () => {
        assert.isTrue(isPoolAcceptingCurrency('SPIRIT_JADE', 'HERO'));
        assert.isTrue(isPoolAcceptingCurrency('SPIRIT_JADE', 'SUPPORT'));
        assert.isTrue(isPoolAcceptingCurrency('SPIRIT_JADE', 'LIMITED'));
    });

    suite.test('銅錢符：僅常設池可用，限定池不支援', () => {
        assert.isTrue(isPoolAcceptingCurrency('BRONZE_CHARM', 'HERO'));
        assert.isTrue(isPoolAcceptingCurrency('BRONZE_CHARM', 'SUPPORT'));
        assert.isFalse(isPoolAcceptingCurrency('BRONZE_CHARM', 'LIMITED'));
    });

    suite.test('費用：單抽 150、十連 1500，其他次數依單抽價計', () => {
        assert.equals(150, quoteGachaCost(1));
        assert.equals(1500, quoteGachaCost(10));
        assert.equals(450, quoteGachaCost(3));
        assert.equals(0, quoteGachaCost(0));
        assert.equals(0, quoteGachaCost(Number.NaN));
    });

    suite.test('扣款：池不允許直接拒絕（不論餘額多少）', () => {
        const check = checkGachaSpend('BRONZE_CHARM', 'LIMITED', 1, 99999);
        assert.isFalse(check.ok);
        assert.equals('POOL_NOT_ALLOWED', check.reason);
    });

    suite.test('扣款：餘額不足拒絕並回報差額，足夠則通過', () => {
        const short = checkGachaSpend('SPIRIT_JADE', 'HERO', 10, 1000);
        assert.isFalse(short.ok);
        assert.equals('INSUFFICIENT', short.reason);
        assert.equals(500, short.shortfall);
        assert.isTrue(checkGachaSpend('SPIRIT_JADE', 'HERO', 10, 1500).ok);
        assert.isTrue(checkGachaSpend('BRONZE_CHARM', 'SUPPORT', 1, 150).ok);
    });

    suite.test('求籤令：未啟用時不強制；啟用後第 100 抽強制目標', () => {
        assert.equals(100, DIRECTED_PITY_CAP);
        let state = createDirectedPity();
        assert.isFalse(isDirectedPityDue(state));
        state = activateDirectedPity('ZHUGE_LIANG');
        for (let i = 0; i < DIRECTED_PITY_CAP - 1; i++) {
            assert.isFalse(isDirectedPityDue(state), `第 ${i + 1} 抽前不應強制`);
            state = advanceDirectedPity(state, 'OTHER');
        }
        assert.isTrue(isDirectedPityDue(state));
    });

    suite.test('求籤令：抽到目標即清空；其他角色只累加計數', () => {
        let state = activateDirectedPity('ZHUGE_LIANG');
        state = advanceDirectedPity(state, 'OTHER');
        assert.equals(1, state.pullsSinceTarget);
        state = advanceDirectedPity(state, 'ZHUGE_LIANG');
        assert.equals(null, state.targetId);
        assert.equals(0, state.pullsSinceTarget);
    });

    suite.test('求籤令：目標不可為空；重新鎖定會重新計數', () => {
        assert.throws(() => activateDirectedPity(''));
        let state = activateDirectedPity('A');
        state = advanceDirectedPity(state, 'X');
        state = activateDirectedPity('B');
        assert.equals('B', state.targetId);
        assert.equals(0, state.pullsSinceTarget);
    });

    return suite;
}
