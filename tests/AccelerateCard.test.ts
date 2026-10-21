/**
 * AccelerateCard.test.ts — 加速卡縮短剩餘時間（ECO-08 / PROG-2-1019）
 *
 * Unity 對照：像 Timer 道具的單元測試：每張卡縮短固定時間、不會縮成負數、
 * 多的卡不被消耗，輸入異常時一律當成 0。
 */
import { assert, TestSuite } from './TestRunner';
import { ACCELERATE_CARD_MS, accelerateRemaining } from '../assets/scripts/core/systems/AccelerateCard';

const HOUR = 60 * 60 * 1000;

export function createAccelerateCardSuite(): TestSuite {
    const suite = new TestSuite('AccelerateCard (ECO-08 加速卡)');

    suite.test('每張加速卡縮短 2 小時，剩餘時間足夠時全部消耗', () => {
        assert.equals(ACCELERATE_CARD_MS, 2 * HOUR);
        const result = accelerateRemaining(10 * HOUR, 3);
        assert.equals(4 * HOUR, result.remainingMs);
        assert.equals(3, result.cardsUsed);
    });

    suite.test('剩餘時間不足時不低於 0，只消耗需要的張數', () => {
        const result = accelerateRemaining(1 * HOUR, 3);
        assert.equals(0, result.remainingMs);
        assert.equals(1, result.cardsUsed, '1 小時只需要 1 張');
    });

    suite.test('已經是 0 或沒有卡時不消耗、剩餘不變', () => {
        const none = accelerateRemaining(0, 5);
        assert.equals(0, none.remainingMs);
        assert.equals(0, none.cardsUsed);
        const noCards = accelerateRemaining(5 * HOUR, 0);
        assert.equals(5 * HOUR, noCards.remainingMs);
        assert.equals(0, noCards.cardsUsed);
    });

    suite.test('異常輸入：非有限數或負數視為 0；卡數取整數向下', () => {
        assert.equals(0, accelerateRemaining(Number.NaN, 2).cardsUsed);
        assert.equals(0, accelerateRemaining(-HOUR, 2).remainingMs);
        assert.equals(1, accelerateRemaining(10 * HOUR, 1.9).cardsUsed);
        assert.equals(0, accelerateRemaining(10 * HOUR, Number.NaN).cardsUsed);
    });

    return suite;
}
