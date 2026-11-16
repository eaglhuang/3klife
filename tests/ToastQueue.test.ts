/**
 * ToastQueue.test.ts — 連發 toast 不互相覆蓋（PROG-2-1775）
 *
 * Unity 對照：EditMode Test，只驗排隊規則，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { MAX_PENDING, MIN_READ_SECONDS, QUEUED_MAX_HOLD_SECONDS, ToastQueue, toastHoldSeconds } from '../assets/scripts/ui/core/ToastQueue';

function toast(message: string): { message: string } {
    return { message };
}

export function createToastQueueSuite(): TestSuite {
    const suite = new TestSuite('ToastQueue');

    suite.test('連發時第一句立刻顯示，其餘依序播放', () => {
        const queue = new ToastQueue<{ message: string }>();
        assert.isTrue(queue.offer(toast('a'), 10));
        assert.isFalse(queue.offer(toast('b'), 10));
        assert.isFalse(queue.offer(toast('c'), 10));
        assert.equals('b', queue.next(13)?.message);
        assert.equals('c', queue.next(16)?.message);
        assert.isTrue(queue.next(19) === null);
        assert.isTrue(queue.offer(toast('d'), 19));
    });

    suite.test('前一句已讀夠久且沒有排隊時直接取代', () => {
        const queue = new ToastQueue<{ message: string }>();
        queue.offer(toast('a'), 10);
        assert.isTrue(queue.offer(toast('b'), 10 + MIN_READ_SECONDS));
        assert.isTrue(queue.next(20) === null);
    });

    suite.test('有排隊時新句不插隊，重複內容略過', () => {
        const queue = new ToastQueue<{ message: string }>();
        queue.offer(toast('a'), 10);
        queue.offer(toast('b'), 10);
        assert.isFalse(queue.offer(toast('c'), 100));
        assert.isFalse(queue.offer(toast('a'), 100));
        assert.isFalse(queue.offer(toast('b'), 100));
        assert.equals('b', queue.next(101)?.message);
        assert.equals('c', queue.next(102)?.message);
        assert.isTrue(queue.next(103) === null);
    });

    suite.test('超過上限丟最舊的；clear 清空', () => {
        const queue = new ToastQueue<{ message: string }>();
        queue.offer(toast('first'), 10);
        for (let i = 0; i <= MAX_PENDING; i++) queue.offer(toast(`m${i}`), 10);
        assert.equals('m1', queue.next(11)?.message);
        queue.clear();
        assert.isTrue(queue.next(12) === null);
        assert.isTrue(queue.offer(toast('again'), 12));
    });

    suite.test('有人排隊時每句停留套上限，沒人排隊照原長度（PROG-2-9343）', () => {
        assert.equals(3, toastHoldSeconds(3, 0));
        assert.equals(QUEUED_MAX_HOLD_SECONDS, toastHoldSeconds(3, 1));
        assert.equals(1.2, toastHoldSeconds(1.2, 2), '本來就短的不拉長');
        const queue = new ToastQueue<{ message: string }>();
        queue.offer(toast('a'), 10);
        assert.equals(0, queue.pendingCount);
        queue.offer(toast('b'), 10);
        queue.offer(toast('c'), 10);
        assert.equals(2, queue.pendingCount);
        queue.next(12);
        assert.equals(1, queue.pendingCount);
    });

    return suite;
}
