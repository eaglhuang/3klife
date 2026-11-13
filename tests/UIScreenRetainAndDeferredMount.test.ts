// @spec-source → Issue #2115；PROG-2-9017
import { assert, TestSuite } from './TestRunner';
import { UIDeferredMountQueue, DeferredMountCancelledError } from '../assets/scripts/ui/core/UIDeferredMountQueue';
import { UIScreenRetainCache, RetainAdapter } from '../assets/scripts/ui/core/UIScreenRetainCache';
const cc = require('cc');

const noYield = () => Promise.resolve();
const flush = async (n = 10) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
function deferred<T = void>() {
    let resolve!: (v: T) => void; let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

interface FakeNode { name: string; parent: unknown; valid: boolean; active: boolean }
function fakeAdapter() {
    const log: string[] = [];
    const adapter: RetainAdapter<FakeNode> = {
        retain: (n) => { n.active = false; n.parent = 'ROOT'; log.push(`retain:${n.name}`); },
        restore: (n, p) => { n.parent = p; log.push(`restore:${n.name}`); },
        destroy: (n) => { n.valid = false; log.push(`destroy:${n.name}`); },
        isValid: (n) => n.valid,
    };
    return { adapter, log };
}
const node = (name: string): FakeNode => ({ name, parent: 'SCENE', valid: true, active: true });

export function createUIScreenRetainAndDeferredMountSuite(): TestSuite {
    const suite = new TestSuite('UIScreenRetainAndDeferredMount');

    suite.test('佇列：start 前不跑，之後依 priority 再依排入順序', async () => {
        const order: string[] = [];
        const q = new UIDeferredMountQueue({ concurrency: 1, yieldBetween: noYield });
        q.enqueue('a', async () => { order.push('a'); });
        q.enqueue('b', async () => { order.push('b'); }, 5);
        q.enqueue('c', async () => { order.push('c'); });
        await flush();
        assert.equals(0, order.length);
        q.start();
        await q.whenIdle();
        assert.equals('b,a,c', order.join(','));
    });

    suite.test('佇列：併發上限生效', async () => {
        const gates = [deferred(), deferred(), deferred()]; let running = 0; let peak = 0;
        const q = new UIDeferredMountQueue({ concurrency: 2, yieldBetween: noYield });
        gates.forEach((g, i) => q.enqueue(`k${i}`, async () => { running++; peak = Math.max(peak, running); await g.promise; running--; }));
        q.start(); await flush();
        assert.equals(2, running);
        gates.forEach((g) => g.resolve()); await q.whenIdle();
        assert.equals(2, peak);
        assert.equals(0, q.pending);
    });

    suite.test('佇列：ensure 未開始就插隊立刻跑，同 key 不重複執行', async () => {
        let runs = 0;
        const q = new UIDeferredMountQueue({ concurrency: 1, yieldBetween: noYield });
        const p1 = q.enqueue('bag', async () => { runs++; return 'built'; });
        const p2 = q.enqueue('bag', async () => { runs++; return 'dup'; });
        const value = await q.ensure<string>('bag');
        assert.equals('built', value);
        assert.equals('built', await p1);
        assert.equals('built', await p2);
        assert.equals(1, runs);
        assert.equals('done', q.status('bag'));
    });

    suite.test('佇列：單項失敗不擋其他項，回報錯誤與進度', async () => {
        const errors: string[] = []; const progress: string[] = [];
        const q = new UIDeferredMountQueue({ concurrency: 1, yieldBetween: noYield,
            onError: (k) => errors.push(k), onProgress: (d, t) => progress.push(`${d}/${t}`) });
        const bad = q.enqueue('bad', async () => { throw new Error('boom'); }, 9);
        q.enqueue('good', async () => 1);
        q.start(); await q.whenIdle();
        let caught = false; try { await bad; } catch { caught = true; }
        assert.equals(true, caught);
        assert.equals('bad', errors.join(','));
        assert.equals('done', q.status('good'));
        assert.equals('1/2,2/2', progress.join(','));
    });

    suite.test('佇列：dispose 取消尚未開始的項目', async () => {
        const gate = deferred(); let laterRan = false;
        const q = new UIDeferredMountQueue({ concurrency: 1, yieldBetween: noYield });
        q.enqueue('first', () => gate.promise);
        const later = q.enqueue('later', async () => { laterRan = true; });
        q.start(); await flush();
        q.dispose();
        let cancelled = false; try { await later; } catch (e) { cancelled = e instanceof DeferredMountCancelledError; }
        gate.resolve(); await flush();
        assert.equals(true, cancelled);
        assert.equals(false, laterRan);
        assert.equals('cancelled', q.status('later'));
    });

    suite.test('保留快取：park 停放、take 接回且只取一次', () => {
        const { adapter, log } = fakeAdapter();
        const cache = new UIScreenRetainCache(adapter, 10);
        const n = node('bag');
        cache.park('lobby/bag', n);
        assert.equals('ROOT', n.parent); assert.equals(false, n.active);
        assert.equals(true, cache.has('lobby/bag'));
        assert.equals(n, cache.take('lobby/bag', 'NEW_SCENE'));
        assert.equals('NEW_SCENE', n.parent);
        assert.equals(null, cache.take('lobby/bag', 'NEW_SCENE'));
        assert.equals('retain:bag,restore:bag', log.join(','));
    });

    suite.test('保留快取：版本不同視為失效並銷毀', () => {
        const { adapter } = fakeAdapter();
        const cache = new UIScreenRetainCache(adapter);
        const n = node('hall');
        cache.park('lobby/hall', n, { version: 'save-1' });
        assert.equals(false, cache.has('lobby/hall', { version: 'save-2' }));
        assert.equals(null, cache.take('lobby/hall', 'S', { version: 'save-2' }));
        assert.equals(false, n.valid);
        assert.equals(0, cache.size);
    });

    suite.test('保留快取：超過上限淘汰最久沒用的，invalidatePrefix／clear 會銷毀', () => {
        const { adapter } = fakeAdapter();
        const cache = new UIScreenRetainCache(adapter, 2);
        const a = node('a'), b = node('b'), c = node('c'), d = node('d');
        cache.park('lobby/a', a); cache.park('lobby/b', b);
        assert.equals('lobby/a', cache.park('battle/c', c).join(','));
        assert.equals(false, a.valid);
        assert.equals(1, cache.invalidatePrefix('lobby/'));
        assert.equals(false, b.valid);
        cache.park('lobby/d', d); cache.clear();
        assert.equals(false, c.valid); assert.equals(false, d.valid); assert.equals(0, cache.size);
    });

    suite.test('保留快取：已被別處銷毀的節點 take 回 null', () => {
        const { adapter } = fakeAdapter();
        const cache = new UIScreenRetainCache(adapter);
        const n = node('x'); cache.park('k', n); n.valid = false;
        assert.equals(false, cache.has('k'));
        assert.equals(null, cache.take('k', 'S'));
    });

    suite.test('SceneManager：onBeforeSwitch 在 loadScene 前執行，失敗不擋換場，可取消', () => {
        const calls: string[] = [];
        const oldDirector = cc.director;
        cc.director = { loadScene: (name: string) => calls.push(`load:${name}`) };
        const oldWarn = console.warn; console.warn = () => undefined;
        try {
            const { SceneManager } = require('../assets/scripts/core/managers/SceneManager');
            const sm = new SceneManager();
            sm.onBeforeSwitch(() => { throw new Error('bad'); });
            const off = sm.onBeforeSwitch((target: string) => calls.push(`before:${target}`));
            sm.switchScene('BattleScene');
            off();
            sm.switchScene('LobbyScene');
            assert.equals('before:BattleScene,load:LoadingScene,load:LoadingScene', calls.join(','));
        } finally { cc.director = oldDirector; console.warn = oldWarn; }
    });

    return suite;
}
