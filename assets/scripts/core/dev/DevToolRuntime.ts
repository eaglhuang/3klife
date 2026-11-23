// @spec-source → 測試工具 2.0（使用者 2026-11-23 定案）；PROG-2-9855
/**
 * DevToolRuntime — 測試工具的操作紀錄與進行中工作追蹤（純 TS，不依賴 cc）。
 *
 * - DevToolLog：每次按鈕、命令結果都記一行，面板可複製整份文字貼給回報者。
 * - DevToolJobs：debug.advanceTime／resetGame 這類「只回 ack、背景跑」的命令，宿主開工時登記、收工時結案，
 *   預設存檔（preset）要在步驟之間等工作跑完，才不會下一步搶在前面。
 */

export type DevToolLogKind = 'cmd' | 'ok' | 'fail' | 'info';

export interface DevToolLogEntry {
    readonly at: number;
    readonly kind: DevToolLogKind;
    readonly text: string;
}

const KIND_MARK: Record<DevToolLogKind, string> = { cmd: '>', ok: '+', fail: '!', info: '-' };

function formatClock(ms: number): string {
    const d = new Date(ms);
    const p = (n: number): string => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export class DevToolLog {
    private readonly _entries: DevToolLogEntry[] = [];
    private readonly _listeners: Array<() => void> = [];

    public constructor(private readonly _max = 200, private readonly _now: () => number = () => Date.now()) {}

    public append(kind: DevToolLogKind, text: string): void {
        this._entries.push({ at: this._now(), kind, text });
        if (this._entries.length > this._max) this._entries.splice(0, this._entries.length - this._max);
        for (const listener of this._listeners.slice()) listener();
    }

    public entries(): readonly DevToolLogEntry[] { return this._entries; }

    public clear(): void {
        this._entries.length = 0;
        for (const listener of this._listeners.slice()) listener();
    }

    /** 整份紀錄的純文字（時間用 HH:MM:SS），供「複製紀錄」 */
    public toText(): string {
        return this._entries.map((entry) => `${formatClock(entry.at)} ${KIND_MARK[entry.kind]} ${entry.text}`).join('\n');
    }

    public onChange(listener: () => void): () => void {
        this._listeners.push(listener);
        return () => {
            const index = this._listeners.indexOf(listener);
            if (index >= 0) this._listeners.splice(index, 1);
        };
    }
}

export class DevToolJobs {
    private _running = 0;
    private _waiters: Array<() => void> = [];

    /** 開工；回傳結案函式（重複呼叫只算一次） */
    public begin(): () => void {
        this._running += 1;
        let done = false;
        return () => {
            if (done) return;
            done = true;
            this._running -= 1;
            if (this._running === 0) {
                const waiters = this._waiters;
                this._waiters = [];
                for (const resolve of waiters) resolve();
            }
        };
    }

    public get busy(): boolean { return this._running > 0; }

    /** 等所有工作結束；timeoutMs 到了就放棄，回 false */
    public whenIdle(timeoutMs = 120_000): Promise<boolean> {
        if (this._running === 0) return Promise.resolve(true);
        return new Promise<boolean>((resolve) => {
            const onIdle = (): void => { clearTimeout(timer); resolve(true); };
            const timer = setTimeout(() => {
                this._waiters = this._waiters.filter((w) => w !== onIdle);
                resolve(false);
            }, timeoutMs);
            this._waiters.push(onIdle);
        });
    }
}

export const devToolLog = new DevToolLog();
export const devToolJobs = new DevToolJobs();
