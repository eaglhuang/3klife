/**
 * 武將友誼／關係服務（第 8 共用框架種子）
 * 遵循 PROG-2-9601 PR3 總 PM 裁決：
 * 1. 通用介面：get、add、hasInteracted、getAllInteracted、onFriendshipChanged 事件
 * 2. 稀疏儲存：只有與玩家產生互動／祝賀之武將才寫入存檔
 * 3. 數值上限與保護：預設 [0, 100]，單次增減由呼叫端傳入 reason
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
    private _listeners: Set<FriendshipChangeListener> = new Set();
    private _maxCap: number = 100;
    private _minCap: number = 0;

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
     * 增加或減少武將友誼值（自動夾制於 [0, 100]）
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
