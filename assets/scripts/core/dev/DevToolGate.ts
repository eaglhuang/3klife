// @spec-source → 測試工具 2.0（使用者 2026-11-23 定案）；PROG-2-9858
/**
 * DevToolGate — 測試工具「開不開」的判斷（純 TS，不依賴 cc，方便單元測試）。
 *
 * 規則（預設關閉）：
 * 1. 正式版建置用旗標排除：全域 `__3K_DEVTOOL_DISABLED__ === true` 時一律關閉，網址與 localStorage 都不能開。
 * 2. 網址帶 `?dev=1` 開（只管這一次載入）；`?dev=0` 同時清掉 localStorage 記號。
 * 3. 設定頁連點版本號 7 次（3 秒內）開，記在 localStorage，之後每次載入都開，直到關掉。
 *
 * Unity 對照：像 `#if DEVELOPMENT_BUILD` 加上隱藏的作弊選單（連點版本號）。
 */

export const DEVTOOL_STORAGE_KEY = '3klife.devtool.enabled';
export const VERSION_TAP_COUNT = 7;
export const VERSION_TAP_WINDOW_MS = 3000;
/** 正式版建置在啟動頁注入的全域旗標名稱 */
export const DEVTOOL_DISABLED_GLOBAL = '__3K_DEVTOOL_DISABLED__';

export interface DevToolStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** 解析網址 dev 參數：1 開、0 關、其他或沒帶為 null */
export function parseDevParam(search: string | undefined | null): 'on' | 'off' | null {
    if (!search) return null;
    const match = /(?:^|[?&])dev=([^&#]*)/.exec(search);
    if (!match) return null;
    if (match[1] === '1' || match[1] === 'true') return 'on';
    if (match[1] === '0' || match[1] === 'false') return 'off';
    return null;
}

/** 正式版旗標：全域為 true 代表建置時已排除測試工具 */
export function isDevToolBuildAllowed(globalRef: unknown = globalThis): boolean {
    return (globalRef as Record<string, unknown> | null | undefined)?.[DEVTOOL_DISABLED_GLOBAL] !== true;
}

export interface DevToolGateInput {
    search?: string | null;
    storage?: DevToolStorage | null;
    buildAllowed?: boolean;
}

/** 單次判斷（純函式）：副作用只有 ?dev=0 清記號 */
export function resolveDevToolEnabled(input: DevToolGateInput): boolean {
    if (input.buildAllowed === false) return false;
    const param = parseDevParam(input.search);
    if (param === 'off') {
        try { input.storage?.removeItem(DEVTOOL_STORAGE_KEY); } catch { /* 隱私模式拿不到 storage 就當沒有 */ }
        return false;
    }
    if (param === 'on') return true;
    try { return input.storage?.getItem(DEVTOOL_STORAGE_KEY) === '1'; } catch { return false; }
}

/** 連點計數器：視窗內累積達門檻就觸發一次並歸零 */
export class VersionTapCounter {
    private _count = 0;
    private _firstAt = 0;

    public constructor(private readonly _need = VERSION_TAP_COUNT, private readonly _windowMs = VERSION_TAP_WINDOW_MS) {}

    /** 回傳目前連點數與是否剛好觸發 */
    public tap(nowMs: number): { count: number; triggered: boolean } {
        if (this._count === 0 || nowMs - this._firstAt > this._windowMs) {
            this._count = 0;
            this._firstAt = nowMs;
        }
        this._count += 1;
        if (this._count >= this._need) {
            this._count = 0;
            return { count: this._need, triggered: true };
        }
        return { count: this._count, triggered: false };
    }

    public reset(): void { this._count = 0; }
}

type GateListener = (enabled: boolean) => void;

/** 全遊戲共用的開關狀態；場景與全域 overlay 都問它 */
export class DevToolGate {
    private _enabled: boolean;
    private readonly _listeners: GateListener[] = [];

    public constructor(private readonly _read: () => DevToolGateInput) {
        this._enabled = resolveDevToolEnabled(_read());
    }

    public isEnabled(): boolean { return this._enabled; }

    public buildAllowed(): boolean { return this._read().buildAllowed !== false; }

    /** 設定頁連點版本號：開（記 localStorage）或關（清記號）；被正式版旗標排除時不動 */
    public setPersisted(on: boolean): boolean {
        const input = this._read();
        if (input.buildAllowed === false) return false;
        try {
            if (on) input.storage?.setItem(DEVTOOL_STORAGE_KEY, '1');
            else input.storage?.removeItem(DEVTOOL_STORAGE_KEY);
        } catch { /* 寫不進去仍讓本次載入生效 */ }
        this._enabled = on || parseDevParam(input.search) === 'on';
        for (const listener of this._listeners.slice()) listener(this._enabled);
        return true;
    }

    public onChange(listener: GateListener): () => void {
        this._listeners.push(listener);
        return () => {
            const index = this._listeners.indexOf(listener);
            if (index >= 0) this._listeners.splice(index, 1);
        };
    }
}

let sharedGate: DevToolGate | null = null;

/** 取得共用開關；讀瀏覽器網址與 localStorage（沒有瀏覽器環境時一律關） */
export function devToolGate(): DevToolGate {
    if (!sharedGate) {
        sharedGate = new DevToolGate(() => {
            const g = globalThis as { location?: { search?: string }; localStorage?: DevToolStorage };
            let storage: DevToolStorage | null = null;
            try { storage = g.localStorage ?? null; } catch { storage = null; }
            return { search: g.location?.search ?? '', storage, buildAllowed: isDevToolBuildAllowed(globalThis) };
        });
    }
    return sharedGate;
}

/** 測試用：丟掉共用實例 */
export function resetDevToolGateForTest(): void { sharedGate = null; }

export function isDevToolEnabled(): boolean { return devToolGate().isEnabled(); }
