/**
 * QActorPool.ts — 通用物件池（引擎中立）
 *
 * 管理器內部用它回收「演員狀態」，套用端用它回收「Q 頭節點」（QACT-01 §6：移出畫面、進店、
 * 換場景都還回池，不 destroy）。池只在「需要時」才建立新物件，`created` 永遠不會超過
 * 歷史同時使用的最大值，所以反覆註冊／註銷 1000 次物件數不增長。
 */
export class QActorPool<T> {
    private readonly freeList: T[] = [];
    private readonly factory: () => T;
    private readonly onReset?: (item: T) => void;
    private maxSize: number;
    /** 已建立的物件總數（測試用：驗證不增長） */
    created = 0;
    /** 目前借出數 */
    inUse = 0;

    /**
     * @param factory 建立新物件
     * @param maxSize 池上限（借出數不可超過）
     * @param onReset 還回池時重置（例如節點 active=false、狀態歸零）
     */
    constructor(factory: () => T, maxSize: number, onReset?: (item: T) => void) {
        this.factory = factory;
        this.maxSize = maxSize;
        this.onReset = onReset;
    }

    /** 領一個；已達上限回 null（呼叫端要降級，不是新增節點） */
    acquire(): T | null {
        if (this.inUse >= this.maxSize) return null;
        let item = this.freeList.pop();
        if (item === undefined) {
            item = this.factory();
            this.created++;
        }
        this.inUse++;
        return item;
    }

    /** 還回池 */
    release(item: T): void {
        if (this.inUse <= 0) return;
        if (this.onReset) this.onReset(item);
        this.freeList.push(item);
        this.inUse--;
    }

    setMaxSize(n: number): void {
        this.maxSize = n;
    }

    getMaxSize(): number {
        return this.maxSize;
    }

    get freeCount(): number {
        return this.freeList.length;
    }
}
