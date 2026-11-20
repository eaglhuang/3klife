// @spec-source → PROG-2-9196 大廳背景預載動態加載優化
/**
 * 大廳背景面板排程器（純邏輯，不依賴 Cocos）。
 *
 * 舊做法：大廳出現後把 40 多個彈窗／子畫面一個接一個連續建構，只讓出 0 幀，玩家操作時照樣卡頓。
 * 新做法：
 *   1. 熱門清單（hotIds，設定檔）先建，其餘排在後面。
 *   2. 非熱門項目只在「玩家閒置一段時間、上一幀不卡」時才建；兩項之間隔 gapMs。
 *      等太久（maxDeferMs）仍會建，避免玩家一直操作造成永遠不補齊（年終換年等流程會等補齊）。
 *   3. 點到尚未建好的介面：demand(id) 立刻補建（共用同一個 Promise，不會重複建）。
 *   4. cancel()：換場景／大廳銷毀時取消，尚未開始的項目不再建構，進行中的不再往後接。
 * Unity 對照：Addressables 的背景預載佇列＋依需求同步補載。
 */

export interface LobbyMountEntry {
    id: string;
    /** 此項建好後會註冊的 UIID；玩家 open 該 UIID 時若尚未建好，由 UIManager 呼叫 demand 補建 */
    uiId?: string;
    run: () => Promise<void>;
}

export interface LobbyMountConfig {
    /** 先建的熱門介面 id（玩家最可能先點，通常是底欄常用 3 到 5 個） */
    hotIds: string[];
    /** 非熱門項目開建前，玩家需閒置多久（毫秒） */
    inputPauseMs: number;
    /** 兩項之間的間隔（毫秒），把卡頓攤開 */
    gapBetweenMountsMs: number;
    /** 上一幀超過這個毫秒數就視為忙碌，先不開建 */
    startWhenFrameMsBelow: number;
    /** 非熱門項目最久等多久（毫秒）後無論如何都建 */
    maxDeferMs: number;
    /** 背景進度條是否顯示（預載期間預設不顯示，避免遮擋右下角信箱） */
    showBackgroundProgress: boolean;
}

export const DEFAULT_LOBBY_MOUNT_CONFIG: LobbyMountConfig = {
    hotIds: [],
    inputPauseMs: 500,
    gapBetweenMountsMs: 100,
    startWhenFrameMsBelow: 24,
    maxDeferMs: 1200,
    showBackgroundProgress: false,
};

/** 環境注入點：測試用假時鐘，執行時用 Cocos 幀事件與 performance.now */
export interface LobbyMountEnv {
    now(): number;
    /** 等下一幀 */
    nextFrame(): Promise<void>;
    /** 等指定毫秒 */
    wait(ms: number): Promise<void>;
    /** 上一幀耗時（毫秒） */
    lastFrameMs(): number;
    /** 玩家最後一次操作的時間（now() 同一時間軸） */
    lastInputAt(): number;
}

/** 讀設定檔後補預設值；欄位型別不對就用預設，不丟例外 */
export function normalizeLobbyMountConfig(raw: unknown): LobbyMountConfig {
    const d = DEFAULT_LOBBY_MOUNT_CONFIG;
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const num = (v: unknown, fallback: number, min = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= min ? v : fallback);
    return {
        hotIds: Array.isArray(r.hotIds) ? r.hotIds.filter((x): x is string => typeof x === 'string') : [...d.hotIds],
        inputPauseMs: num(r.inputPauseMs, d.inputPauseMs),
        gapBetweenMountsMs: num(r.gapBetweenMountsMs, d.gapBetweenMountsMs),
        startWhenFrameMsBelow: num(r.startWhenFrameMsBelow, d.startWhenFrameMsBelow, 1),
        maxDeferMs: num(r.maxDeferMs, d.maxDeferMs),
        showBackgroundProgress: typeof r.showBackgroundProgress === 'boolean' ? r.showBackgroundProgress : d.showBackgroundProgress,
    };
}

export class LobbyMountScheduler {
    private readonly _entries: LobbyMountEntry[];
    private readonly _runs = new Map<string, Promise<void>>();
    private readonly _done = new Set<string>();
    private _cancelled = false;
    private _settledResolve: (() => void) | null = null;
    private readonly _settled: Promise<void>;

    constructor(
        entries: LobbyMountEntry[],
        private readonly _config: LobbyMountConfig,
        private readonly _env: LobbyMountEnv,
        private readonly _onProgress?: (completed: number, total: number) => void,
    ) {
        // 熱門項目照設定順序排前面，其餘保持原順序
        const hot = _config.hotIds;
        const rank = (id: string) => { const i = hot.indexOf(id); return i < 0 ? hot.length : i; };
        this._entries = entries
            .map((entry, index) => ({ entry, index }))
            .sort((a, b) => rank(a.entry.id) - rank(b.entry.id) || a.index - b.index)
            .map((x) => x.entry);
        this._settled = new Promise<void>((resolve) => { this._settledResolve = resolve; });
    }

    get total(): number { return this._entries.length; }
    get completed(): number { return this._done.size; }
    get cancelled(): boolean { return this._cancelled; }
    /** 依 UIID 找排程項目 id；沒有對應回傳 null */
    idForUi(uiId: string): string | null { return this._entries.find((e) => e.uiId === uiId)?.id ?? null; }
    get order(): string[] { return this._entries.map((e) => e.id); }
    isMounted(id: string): boolean { return this._done.has(id); }
    /** 全部建完或被取消時 resolve（年終換年等流程等這個） */
    whenSettled(): Promise<void> { return this._settled; }

    /** 取消：尚未開始的項目不再建構；已在進行的那一項讓它自然結束 */
    cancel(): void {
        this._cancelled = true;
        this._settledResolve?.();
    }

    /** 立刻建指定項目（玩家點到尚未建好的介面）；已建好或進行中共用同一個 Promise */
    demand(id: string): Promise<void> {
        const entry = this._entries.find((e) => e.id === id);
        if (!entry || this._cancelled) return Promise.resolve();
        return this._start(entry);
    }

    private _start(entry: LobbyMountEntry): Promise<void> {
        const existing = this._runs.get(entry.id);
        if (existing) return existing;
        const p = (async () => {
            try {
                await entry.run();
            } finally {
                this._done.add(entry.id);
                this._onProgress?.(this._done.size, this._entries.length);
                if (this._done.size >= this._entries.length) this._settledResolve?.();
            }
        })();
        this._runs.set(entry.id, p);
        return p;
    }

    /**
     * 依序跑完。單項失敗交給 onError（呼叫端記錄），不中斷後面的項目。
     * 取消後立刻返回。
     */
    async runAll(onError?: (id: string, error: unknown) => void): Promise<void> {
        const hot = new Set(this._config.hotIds);
        let first = true;
        for (const entry of this._entries) {
            if (this._cancelled) return;
            if (this._runs.has(entry.id)) continue; // 玩家已點開、補建中或已完成
            if (!first) {
                if (!hot.has(entry.id)) {
                    await this._waitForQuiet();
                } else {
                    await this._env.nextFrame();
                }
                if (this._cancelled) return;
                if (this._runs.has(entry.id)) continue;
            }
            first = false;
            try {
                await this._start(entry);
            } catch (error) {
                if (this._cancelled) return;
                onError?.(entry.id, error);
            }
            if (this._cancelled) return;
        }
    }

    /** 等到玩家閒置且上一幀不卡，最多等 maxDeferMs；先固定隔 gapBetweenMountsMs 把卡頓攤開 */
    private async _waitForQuiet(): Promise<void> {
        const c = this._config;
        if (c.gapBetweenMountsMs > 0) await this._env.wait(c.gapBetweenMountsMs);
        const startedAt = this._env.now();
        for (;;) {
            if (this._cancelled) return;
            const idleFor = this._env.now() - this._env.lastInputAt();
            const busy = idleFor < c.inputPauseMs || this._env.lastFrameMs() > c.startWhenFrameMsBelow;
            if (!busy) return;
            if (this._env.now() - startedAt >= c.maxDeferMs) return;
            await this._env.nextFrame();
        }
    }
}
