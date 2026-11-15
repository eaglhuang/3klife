/**
 * LazySlotSerialQueue.test.ts — 延遲插槽切換序列化（PROG-2-9037）
 *
 * 驗證：同一插槽的切換一次只跑一個（不會新舊片段同時掛上）；排隊期間過期的請求略過，只執行最後一次；
 * 前一次失敗不卡住後面的切換；不同插槽互不影響。
 */
import { assert, TestSuite } from './TestRunner';
import { LazySlotSerialQueue } from '../assets/scripts/ui/core/LazySlotSerialQueue';

interface Gate {
    promise: Promise<void>;
    open: () => void;
}

function flush(): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function gate(): Gate {
    let open!: () => void;
    const promise = new Promise<void>((resolve) => { open = resolve; });
    return { promise, open };
}

export function createLazySlotSerialQueueSuite(): TestSuite {
    const suite = new TestSuite('LazySlotSerialQueue (延遲插槽切換序列化 PROG-2-9037)');

    suite.test('同一插槽的切換不重疊：前一個沒做完，後一個不開始', async () => {
        const queue = new LazySlotSerialQueue<object>();
        const slot = {};
        const events: string[] = [];
        const first = gate();
        const second = gate();
        const a = queue.run(slot, async () => {
            events.push('a:start');
            await first.promise;
            events.push('a:end');
        });
        // a 真的開始後才排 b，b 才不會把尚未開始的 a 判為過期
        await flush();
        const b = queue.run(slot, async () => {
            events.push('b:start');
            await second.promise;
            events.push('b:end');
        });
        await flush();
        assert.equals('a:start', events.join(','));
        first.open();
        await a;
        second.open();
        await b;
        assert.equals('a:start,a:end,b:start,b:end', events.join(','));
    });

    suite.test('排隊期間過期的請求略過，只執行最後一次', async () => {
        const queue = new LazySlotSerialQueue<object>();
        const slot = {};
        const ran: string[] = [];
        const block = gate();
        const head = queue.run(slot, async () => { ran.push('head'); await block.promise; });
        // 等 head 真的開始執行，之後排入的才是「執行中又來的新請求」
        await flush();
        const stale1 = queue.run(slot, async () => { ran.push('stale1'); });
        const stale2 = queue.run(slot, async () => { ran.push('stale2'); });
        const last = queue.run(slot, async () => { ran.push('last'); });
        block.open();
        await Promise.all([head, stale1, stale2, last]);
        assert.equals('head,last', ran.join(','));
    });

    suite.test('前一次失敗不卡住後面的切換', async () => {
        const queue = new LazySlotSerialQueue<object>();
        const slot = {};
        const failing = queue.run(slot, async () => { throw new Error('load failed'); });
        let failed = false;
        try { await failing; } catch { failed = true; }
        assert.isTrue(failed);
        const ran: string[] = [];
        await queue.run(slot, async () => { ran.push('next'); });
        assert.equals('next', ran.join(','));
    });

    suite.test('不同插槽各自獨立，互不等待', async () => {
        const queue = new LazySlotSerialQueue<object>();
        const slotA = {};
        const slotB = {};
        const blockA = gate();
        const ran: string[] = [];
        const a = queue.run(slotA, async () => { ran.push('A'); await blockA.promise; });
        const b = queue.run(slotB, async () => { ran.push('B'); });
        await b;
        assert.equals('A,B', ran.join(','));
        blockA.open();
        await a;
    });

    return suite;
}
