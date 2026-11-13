// @spec-source → Issue #2115；PROG-2-9017 子視窗背景載入
/**
 * UIDeferredMountQueue — 子視窗／面板的背景掛載佇列（不依賴 Cocos，可在 Node 測試）。
 *
 * 用法：主畫面先顯示，再把其餘面板排進來慢慢掛；使用者點到某個面板時用 ensure() 插隊立刻掛。
 *
 *   const queue = new UIDeferredMountQueue({ concurrency: 2 });
 *   queue.enqueue('item-bag', () => this._mountItemBag(), 10);   // priority 越大越先
 *   queue.enqueue('season-pass', () => this._mountSeasonPass());
 *   await openMainView();
 *   queue.start();                         // 主畫面出來後才開始背景掛載
 *   await queue.ensure('item-bag');        // 點按鈕時：還沒掛就插隊立刻掛，已在掛就等它
 *   onDestroy() { queue.dispose(); }       // 換場時取消尚未開始的工作
 *
 * Unity 對照：Addressables 非同步載入 + 自訂優先權佇列。
 */
export type DeferredMountStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

export interface UIDeferredMountQueueOptions {
    /** 同時進行的背景掛載數，預設 2；ensure() 插隊不受此限制。 */
    concurrency?: number;
    /** 每完成一項後讓出主執行緒，避免連續建節點卡畫面；預設 setTimeout(0)。 */
    yieldBetween?: () => Promise<void>;
    /** 單項失敗時通知；失敗不會中斷其他項目。 */
    onError?: (key: string, error: unknown) => void;
    /** 每完成（含失敗）一項時通知，可接進度條。 */
    onProgress?: (completed: number, total: number) => void;
}

export class DeferredMountCancelledError extends Error {
    constructor(key: string) {
        super(`[UIDeferredMountQueue] 已取消：${key}`);
        this.name = 'DeferredMountCancelledError';
    }
}

interface Entry {
    key: string;
    run: () => Promise<unknown>;
    priority: number;
    order: number;
    status: DeferredMountStatus;
    promise: Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
}

const defaultYield = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export class UIDeferredMountQueue {
    private readonly _entries = new Map<string, Entry>();
    private readonly _concurrency: number;
    private readonly _yield: () => Promise<void>;
    private readonly _opts: UIDeferredMountQueueOptions;
    private _running = 0;
    private _started = false;
    private _disposed = false;
    private _order = 0;
    private _completed = 0;
    private _idleWaiters: Array<() => void> = [];

    constructor(options: UIDeferredMountQueueOptions = {}) {
        this._opts = options;
        this._concurrency = Math.max(1, Math.floor(options.concurrency ?? 2));
        this._yield = options.yieldBetween ?? defaultYield;
    }

    /** 排入一項；同 key 已存在時不重排，回傳同一個 Promise（priority 取較高者）。 */
    enqueue<T>(key: string, run: () => Promise<T>, priority = 0): Promise<T> {
        if (this._disposed) return Promise.reject(new DeferredMountCancelledError(key));
        const existing = this._entries.get(key);
        if (existing) {
            if (existing.status === 'queued' && priority > existing.priority) existing.priority = priority;
            return existing.promise as Promise<T>;
        }
        let resolve!: (value: unknown) => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<unknown>((res, rej) => { resolve = res; reject = rej; });
        // 背景項目沒人 await 時不要變成 unhandled rejection；呼叫端 await 時仍拿得到錯誤。
        promise.catch(() => undefined);
        this._entries.set(key, { key, run, priority, order: this._order++, status: 'queued', promise, resolve, reject });
        this._pump();
        return promise as Promise<T>;
    }

    /** 開始背景掛載（通常在主畫面顯示後呼叫）。 */
    start(): void {
        if (this._disposed) return;
        this._started = true;
        this._pump();
    }

    /** 暫停排程新的背景項目；進行中的照常完成，ensure() 仍可插隊。 */
    pause(): void {
        this._started = false;
    }

    /** 需要某面板時呼叫：尚未開始就立刻執行（不等 start、不受併發限制），已在執行或完成就等它。 */
    ensure<T = unknown>(key: string): Promise<T> {
        const entry = this._entries.get(key);
        if (!entry) return Promise.reject(new Error(`[UIDeferredMountQueue] 未排入：${key}`));
        if (entry.status === 'queued') this._run(entry, true);
        return entry.promise as Promise<T>;
    }

    status(key: string): DeferredMountStatus | undefined {
        return this._entries.get(key)?.status;
    }

    has(key: string): boolean {
        return this._entries.has(key);
    }

    /** 尚未完成（排隊中＋執行中）的數量。 */
    get pending(): number {
        let n = 0;
        this._entries.forEach((e) => { if (e.status === 'queued' || e.status === 'running') n++; });
        return n;
    }

    /** 全部項目結束（成功、失敗或取消）時 resolve。 */
    whenIdle(): Promise<void> {
        if (this.pending === 0) return Promise.resolve();
        return new Promise((resolve) => this._idleWaiters.push(resolve));
    }

    /** 換場或元件銷毀時呼叫：尚未開始的項目以 DeferredMountCancelledError 結束，執行中的不中斷但之後不再排程。 */
    dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this._started = false;
        this._entries.forEach((e) => {
            if (e.status !== 'queued') return;
            e.status = 'cancelled';
            e.reject(new DeferredMountCancelledError(e.key));
        });
        this._notifyIdle();
    }

    private _nextQueued(): Entry | null {
        let best: Entry | null = null;
        this._entries.forEach((e) => {
            if (e.status !== 'queued') return;
            if (!best || e.priority > best.priority || (e.priority === best.priority && e.order < best.order)) best = e;
        });
        return best;
    }

    private _pump(): void {
        while (this._started && !this._disposed && this._running < this._concurrency) {
            const next = this._nextQueued();
            if (!next) break;
            this._run(next, false);
        }
    }

    private _run(entry: Entry, urgent: boolean): void {
        entry.status = 'running';
        this._running++;
        let task: Promise<unknown>;
        try { task = Promise.resolve(entry.run()); } catch (error) { task = Promise.reject(error); }
        task.then((value) => {
            entry.status = 'done';
            entry.resolve(value);
        }, (error) => {
            entry.status = 'failed';
            this._opts.onError?.(entry.key, error);
            entry.reject(error);
        }).then(async () => {
            this._completed++;
            this._opts.onProgress?.(this._completed, this._entries.size);
            if (!urgent) await this._yield();
            this._running--;
            this._notifyIdle();
            this._pump();
        });
    }

    private _notifyIdle(): void {
        if (this.pending !== 0 || this._idleWaiters.length === 0) return;
        const waiters = this._idleWaiters;
        this._idleWaiters = [];
        waiters.forEach((w) => w());
    }
}
