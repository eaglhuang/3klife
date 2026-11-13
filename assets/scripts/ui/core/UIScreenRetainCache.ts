// @spec-source → Issue #2115；PROG-2-9017 換場保留已建好的 UI
/**
 * UIScreenRetainCache — 換場時把已建好的畫面節點「停放」起來，回來時直接接回，不重建。
 *
 * 只管帳（LRU、版本、失效），實際搬節點交給 adapter；Cocos 版見 CocosScreenRetainAdapter.ts。
 *
 *   離場前（例如 SceneManager.onBeforeSwitch）：cache.park('lobby/item-bag', hostNode, { version })
 *   進場時：const node = cache.take('lobby/item-bag', parentNode, { version });
 *           node ? 重新綁定按鈕／事件 : 照舊建新的
 *
 * 規則：
 * - 停放時節點會被移到常駐根節點下並停用（觸發 onDisable）；元件請在 onEnable/onDisable 訂閱／退訂事件，
 *   否則停放期間仍會收到其他場景的事件。
 * - 綁在舊場景元件上的回呼（按鈕 callback、閉包裡的 this）不會自動換成新場景的；take() 之後呼叫端要重新綁定。
 * - version 不同（換存檔、換語系、spec 改版）時 take() 會銷毀舊節點並回 null。
 * - 超過 maxEntries 時銷毀最久沒用的；記憶體吃緊可呼叫 trimTo()/clear()。
 *
 * Unity 對照：DontDestroyOnLoad 物件池 + LRU。
 */
export interface RetainAdapter<TNode> {
    /** 移到常駐根節點下並停用；不能銷毀。 */
    retain(node: TNode): void;
    /** 接回新場景的父節點（呼叫端決定何時啟用）。 */
    restore(node: TNode, parent: unknown): void;
    destroy(node: TNode): void;
    /** 節點已被銷毀時回 false（例如被其他程式 destroy 掉）。 */
    isValid(node: TNode): boolean;
}

export interface RetainOptions {
    /** 版本標記；park 與 take 不同時視為失效。 */
    version?: string;
}

interface RetainEntry<TNode> {
    node: TNode;
    version: string;
    lastUsed: number;
}

export class UIScreenRetainCache<TNode> {
    private readonly _entries = new Map<string, RetainEntry<TNode>>();
    private _clock = 0;

    constructor(private readonly _adapter: RetainAdapter<TNode>, private _maxEntries = 96) {}

    get size(): number { return this._entries.size; }
    get maxEntries(): number { return this._maxEntries; }

    has(key: string, options: RetainOptions = {}): boolean {
        const entry = this._entries.get(key);
        return !!entry && entry.version === (options.version ?? '') && this._adapter.isValid(entry.node);
    }

    keys(): string[] { return Array.from(this._entries.keys()); }

    /** 停放節點；同 key 已停放另一個節點時先銷毀舊的。回傳因超量被淘汰的 key。 */
    park(key: string, node: TNode, options: RetainOptions = {}): string[] {
        if (!this._adapter.isValid(node)) return [];
        const old = this._entries.get(key);
        if (old && old.node !== node) this._destroyEntry(key, old);
        this._adapter.retain(node);
        this._entries.set(key, { node, version: options.version ?? '', lastUsed: ++this._clock });
        return this.trimTo(this._maxEntries);
    }

    /** 取回並接到 parent；沒有、已失效或版本不同時回 null（失效的會被銷毀）。取回後不再由快取管理。 */
    take(key: string, parent: unknown, options: RetainOptions = {}): TNode | null {
        const entry = this._entries.get(key);
        if (!entry) return null;
        this._entries.delete(key);
        if (!this._adapter.isValid(entry.node)) return null;
        if (entry.version !== (options.version ?? '')) {
            this._adapter.destroy(entry.node);
            return null;
        }
        this._adapter.restore(entry.node, parent);
        return entry.node;
    }

    /** 銷毀單一項目（例如 spec 改版或該面板已不需要）。 */
    invalidate(key: string): boolean {
        const entry = this._entries.get(key);
        if (!entry) return false;
        this._destroyEntry(key, entry);
        return true;
    }

    /** 銷毀 key 以 prefix 開頭的全部項目，例如 invalidatePrefix('lobby/')。 */
    invalidatePrefix(prefix: string): number {
        let n = 0;
        for (const key of this.keys()) if (key.startsWith(prefix) && this.invalidate(key)) n++;
        return n;
    }

    /** 只留最近使用的 count 個，回傳被淘汰的 key。 */
    trimTo(count: number): string[] {
        const limit = Math.max(0, Math.floor(count));
        if (this._entries.size <= limit) return [];
        const sorted = Array.from(this._entries.entries()).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        const evicted: string[] = [];
        for (const [key, entry] of sorted.slice(0, this._entries.size - limit)) {
            this._destroyEntry(key, entry);
            evicted.push(key);
        }
        return evicted;
    }

    setMaxEntries(count: number): string[] {
        this._maxEntries = Math.max(0, Math.floor(count));
        return this.trimTo(this._maxEntries);
    }

    clear(): void {
        for (const [key, entry] of Array.from(this._entries.entries())) this._destroyEntry(key, entry);
    }

    private _destroyEntry(key: string, entry: RetainEntry<TNode>): void {
        this._entries.delete(key);
        if (this._adapter.isValid(entry.node)) this._adapter.destroy(entry.node);
    }
}
