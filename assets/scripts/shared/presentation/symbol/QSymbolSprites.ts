/**
 * QSymbolSprites.ts — 子精靈抽象與節點池
 *
 * 系統核心只認 ISymbolSprite，Cocos 端（QSymbolLayer）提供真正的節點實作。
 * 池容量固定（= 預算的子精靈總上限）：反覆切換活動只會借還，不會增加節點。
 */

export interface ISymbolSprite {
    /** 顯示並設定狀態：位置與尺寸為像素；rot 為度；rgb 0～255 */
    show(part: string, x: number, y: number, w: number, h: number, rot: number, alpha: number, flipX: boolean,
        r: number, g: number, b: number): void;
    hide(): void;
}

export class SymbolSpritePool {
    private readonly free: ISymbolSprite[] = [];
    private createdCount = 0;
    private inUseCount = 0;

    constructor(private readonly factory: () => ISymbolSprite, private capacity: number) {}

    /** 累計建立的節點數（驗收：反覆切換後不增長） */
    get created(): number { return this.createdCount; }
    get inUse(): number { return this.inUseCount; }
    get cap(): number { return this.capacity; }

    /** 換等級時調整上限（只影響之後新建，不回收既有節點） */
    setCapacity(n: number): void { this.capacity = n; }

    /** 借出一個；池空且已達上限回傳 null（呼叫端應該降級，而不是新建） */
    acquire(): ISymbolSprite | null {
        let s = this.free.pop();
        if (!s) {
            if (this.createdCount >= this.capacity) return null;
            s = this.factory();
            this.createdCount++;
        }
        this.inUseCount++;
        return s;
    }

    release(s: ISymbolSprite): void {
        s.hide();
        this.free.push(s);
        this.inUseCount--;
    }
}
