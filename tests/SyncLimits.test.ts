import { TestSuite, assert } from './TestRunner';
import { createDefaultPlayerStore, createSyncApp } from '../server/src/sync';
import { SyncRateLimiter } from '../server/src/sync-limits';

/**
 * 同步限流與大小限制（SYNC-05，PROG-2-1988）：第 11 次同步回 429/E008；body 超過 5MB 回 413/E007。
 * 端到端走 in-process express，fetch 用模組載入時的真實 fetch（其他 suite 會換成 mock）。
 */
const realFetch: typeof fetch | undefined = (globalThis as any).fetch;

async function withServer(app: ReturnType<typeof createSyncApp>, run: (base: string) => Promise<void>): Promise<void> {
    const server = await new Promise<{ close(cb?: () => void): void; address(): any }>((resolve) => {
        const listener = app.listen(0, '127.0.0.1', () => resolve(listener as any));
    });
    try {
        await run(`http://127.0.0.1:${server.address().port}`);
    } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
}

function post(base: string, body: string): Promise<Response> {
    return realFetch!(`${base}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}

export function createSyncLimitsSuite(): TestSuite {
    const suite = new TestSuite('SyncLimits（SYNC-05 限流與大小限制 PROG-2-1988）');

    suite.test('計數器：同鍵 60 秒內第 11 次被擋，視窗過後重算；不同鍵各自計', () => {
        let now = 0;
        const limiter = new SyncRateLimiter(10, 60_000, () => now);
        for (let i = 0; i < 10; i += 1) assert.isTrue(limiter.hit('p1'));
        assert.isFalse(limiter.hit('p1'));
        assert.isTrue(limiter.hit('p2'));
        now = 60_000;
        assert.isTrue(limiter.hit('p1'));
    });

    suite.test('端到端：第 11 次同步回 429 / E008', async () => {
        const app = createSyncApp(createDefaultPlayerStore(), { log: () => undefined, rateLimiter: new SyncRateLimiter() });
        await withServer(app, async (base) => {
            const body = JSON.stringify({ Player_ID: 'NOBODY' });
            for (let i = 0; i < 10; i += 1) assert.equals(404, (await post(base, body)).status);
            const blocked = await post(base, body);
            assert.equals(429, blocked.status);
            assert.equals('E008', (await blocked.json()).code);
        });
    });

    suite.test('端到端：body 超過 5MB 回 413 / E007', async () => {
        const app = createSyncApp(createDefaultPlayerStore(), { log: () => undefined });
        await withServer(app, async (base) => {
            const res = await post(base, JSON.stringify({ Player_ID: 'X', Pad: 'a'.repeat(5 * 1024 * 1024 + 16) }));
            assert.equals(413, res.status);
            assert.equals('E007', (await res.json()).code);
        });
    });

    return suite;
}
