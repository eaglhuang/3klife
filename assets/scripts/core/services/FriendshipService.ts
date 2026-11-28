/**
 * 武將友誼／關係服務（第 8 共用框架種子）
 * 遵循 PROG-2-9601 PR3 總 PM 裁決：
 * 1. 通用介面：get、add、hasInteracted、getAllInteracted、onFriendshipChanged 事件
 * 2. 稀疏儲存：只有與玩家產生互動／祝賀之武將才寫入存檔
 * 3. 數值上限與保護：預設 [-100, 100]（與私塾規格 7.6 一致，負值為敵意區間），單次增減由呼叫端傳入 reason
 * 4. 平台與框架中立：純 TS 無狀態／可序列化，供大廳、私塾、學府、戰場通用接入
 */

export interface FriendshipChangeEvent {
    generalId: string;
    oldValue: number;
    newValue: number;
    delta: number;
    reason: string;
}

export type FriendshipChangeListener = (event: FriendshipChangeEvent) => void;

export interface IFriendshipService {
    get(generalId: string): number;
    add(generalId: string, delta: number, reason: string): number;
    hasInteracted(generalId: string): boolean;
    getAllInteracted(): Readonly<Record<string, number>>;
    loadSnapshot(data?: Record<string, number>): void;
    exportSnapshot(): Record<string, number>;
    onFriendshipChanged(listener: FriendshipChangeListener): () => void;
}

export class FriendshipService implements IFriendshipService {
    private static _instance: FriendshipService | null = null;

    private _friendships: Map<string, number> = new Map();
    /** 武將↔武將配對友誼（只存與我方接觸者）；鍵為兩 id 排序後以 | 相接 */
    private _pairs: Map<string, number> = new Map();
    /** 割袍斷義鎖死的配對：數值固定，addPair 不再改動（doc_spec_0743 §4，PROG-2-10207） */
    private _lockedPairs: Set<string> = new Set();
    private _listeners: Set<FriendshipChangeListener> = new Set();
    private _maxCap: number = 100;
    private _minCap: number = -100;

    constructor(initialData?: Record<string, number>, maxCap: number = 100) {
        this._maxCap = maxCap;
        if (initialData) {
            this.loadSnapshot(initialData);
        }
    }

    public static getInstance(): FriendshipService {
        if (!this._instance) {
            this._instance = new FriendshipService();
        }
        return this._instance;
    }

    public static resetInstance(): void {
        this._instance = null;
    }

    /**
     * 取得武將當前友誼值（未曾互動者回傳 0）
     */
    public get(generalId: string): number {
        if (!generalId) return 0;
        return this._friendships.get(generalId) ?? 0;
    }

    /**
     * 增加或減少武將友誼值（自動夾制於 [-100, 100]）
     */
    public add(generalId: string, delta: number, reason: string): number {
        if (!generalId || !Number.isFinite(delta) || delta === 0) {
            return this.get(generalId);
        }

        const oldValue = this.get(generalId);
        const rawNewValue = oldValue + delta;
        const newValue = Math.max(this._minCap, Math.min(this._maxCap, rawNewValue));

        if (oldValue !== newValue) {
            this._friendships.set(generalId, newValue);
            this._notifyChanged({
                generalId,
                oldValue,
                newValue,
                delta: newValue - oldValue,
                reason
            });
        }

        return newValue;
    }

    private static _pairKey(a: string, b: string): string {
        return a < b ? `${a}|${b}` : `${b}|${a}`;
    }

    /** 武將↔武將配對友誼值（無記錄回 0，與順序無關） */
    public getPair(a: string, b: string): number {
        if (!a || !b || a === b) return 0;
        return this._pairs.get(FriendshipService._pairKey(a, b)) ?? 0;
    }

    /** 增減配對友誼（夾制於 [-100, 100]），回傳新值；不發玩家友誼變更事件 */
    public addPair(a: string, b: string, delta: number, _reason: string): number {
        if (!a || !b || a === b || !Number.isFinite(delta) || delta === 0) return this.getPair(a, b);
        if (this._lockedPairs.has(FriendshipService._pairKey(a, b))) return this.getPair(a, b);
        const next = Math.max(this._minCap, Math.min(this._maxCap, this.getPair(a, b) + delta));
        this._pairs.set(FriendshipService._pairKey(a, b), next);
        return next;
    }

    /** 鎖死配對並設為指定值（夾在上下限內）；之後 addPair 不再改動。 */
    public lockPair(a: string, b: string, value: number): number {
        if (!a || !b || a === b) return 0;
        const key = FriendshipService._pairKey(a, b);
        const clamped = Math.max(this._minCap, Math.min(this._maxCap, value));
        this._pairs.set(key, clamped);
        this._lockedPairs.add(key);
        return clamped;
    }

    public isPairLocked(a: string, b: string): boolean {
        return this._lockedPairs.has(FriendshipService._pairKey(a, b));
    }

    /** 讀檔後依盟約狀態重新上鎖（鎖定集合本身不存，來源是 SwornState.severedPairs）。 */
    public setLockedPairs(keys: readonly string[]): void {
        this._lockedPairs = new Set(keys);
    }

    public exportPairs(): Record<string, number> {
        return Object.fromEntries(this._pairs.entries());
    }

    public loadPairs(data?: Record<string, number>): void {
        this._pairs.clear();
        if (!data || typeof data !== 'object') return;
        for (const [key, val] of Object.entries(data)) {
            if (typeof val === 'number' && Number.isFinite(val)) this._pairs.set(key, Math.max(this._minCap, Math.min(this._maxCap, val)));
        }
    }

    /**
     * 檢查是否與該武將有任何互動記錄
     */
    public hasInteracted(generalId: string): boolean {
        return this._friendships.has(generalId);
    }

    /**
     * 取得所有有互動記錄的武將友誼表（稀疏表）
     */
    public getAllInteracted(): Readonly<Record<string, number>> {
        const result: Record<string, number> = {};
        for (const [id, value] of this._friendships.entries()) {
            result[id] = value;
        }
        return result;
    }

    /**
     * 載入存檔快照（覆蓋當前資料）
     */
    public loadSnapshot(data?: Record<string, number>): void {
        this._friendships.clear();
        if (!data || typeof data !== 'object') return;

        for (const [id, val] of Object.entries(data)) {
            if (typeof val === 'number' && Number.isFinite(val)) {
                this._friendships.set(id, Math.max(this._minCap, Math.min(this._maxCap, val)));
            }
        }
    }

    /**
     * 導出稀疏存檔快照
     */
    public exportSnapshot(): Record<string, number> {
        return this.getAllInteracted() as Record<string, number>;
    }

    /**
     * 註冊友誼值變更監聽器（回傳解除註冊函數）
     */
    public onFriendshipChanged(listener: FriendshipChangeListener): () => void {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }

    private _notifyChanged(event: FriendshipChangeEvent): void {
        for (const listener of this._listeners) {
            try {
                listener(event);
            } catch (err) {
                // 防禦：個別監聽器例外不中斷其他監聽器
            }
        }
    }
}
