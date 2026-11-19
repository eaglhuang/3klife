/**
 * ToastQueue.test.ts — 連發 toast 不互相覆蓋（PROG-2-1775）
 *
 * Unity 對照：EditMode Test，只驗排隊規則，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { MAX_PENDING, mergeHeldToasts, MIN_READ_SECONDS, QUEUED_MAX_HOLD_SECONDS, ToastQueue, toastHoldSeconds } from '../assets/scripts/ui/core/ToastQueue';
import { turnBannerVisibleSeconds } from '../assets/scripts/ui/core/TurnBannerTiming';

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

    suite.test('drain 依顯示順序取出目前這句與排隊的，並清空（PROG-2-9416）', () => {
        const queue = new ToastQueue<{ message: string }>();
        assert.equals(0, queue.drain().length, '沒東西時回空陣列');
        queue.offer(toast('a'), 10);
        queue.offer(toast('b'), 10);
        queue.offer(toast('c'), 10);
        assert.equals('a,b,c', queue.drain().map((t) => t.message).join(','));
        assert.equals(0, queue.pendingCount);
        assert.isTrue(queue.next(20) === null, '清空後沒有下一句');
        assert.isTrue(queue.offer(toast('a'), 10), '清空後同一句可馬上再播');
    });

    suite.test('橫幅期間暫停的提示：先後合併、同句只留一次、最多保留 MAX_PENDING 句（PROG-2-9416）', () => {
        const merged = mergeHeldToasts([toast('部署已用完'), toast('甘寧 不適')], [toast('甘寧 不適'), toast('新提示')]);
        assert.equals('部署已用完,甘寧 不適,新提示', merged.map((t) => t.message).join(','));
        const many = Array.from({ length: MAX_PENDING + 3 }, (_, i) => toast(`m${i}`));
        const capped = mergeHeldToasts(many.slice(0, 4), many.slice(4));
        assert.equals(MAX_PENDING, capped.length);
        assert.equals(`m${MAX_PENDING + 2}`, capped[capped.length - 1].message, '保留最新的');
        assert.equals('m3', capped[0].message, '丟掉最舊的');
    });

    suite.test('提示框暫停到橫幅完全淡出為止，短橫幅也至少等完淡入淡出（PROG-2-9416）', () => {
        assert.isTrue(turnBannerVisibleSeconds(1.4) > 1.4, '比排定時間多留掛載餘裕');
        assert.isTrue(turnBannerVisibleSeconds(1.4) < 2, '不會拖太久');
        assert.isTrue(turnBannerVisibleSeconds(0.2) >= 0.8, '短橫幅仍有淡入＋最短停留＋淡出');
    });

    return suite;
}
