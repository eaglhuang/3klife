// @spec-source → 名詞定義文件 §J「lore LRU 快取 LoreCache」（最多 20 位武將故事常駐記憶體）；WBS TERM-06；PROG-2-1023
/**
 * LoreCache — 武將故事的 LRU 快取（純邏輯，不依賴 cc）。
 *
 * - 最多 LORE_CACHE_CAPACITY（20）項常駐記憶體；超過時淘汰最久未使用的一項。
 * - get 會把該項標為最近使用；重複 set 同一 key 會更新值並標為最近使用，不增加容量。
 *
 * Unity 對照：像 LinkedHashMap 做的 LRU，或 Addressables 的常駐上限：超過上限就卸載最久沒用的那份資產。
 */

export const LORE_CACHE_CAPACITY = 20;

export class LoreCache<T> {
    private readonly entries = new Map<string, T>();

    constructor(private readonly capacity: number = LORE_CACHE_CAPACITY) {
        if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('LoreCache 容量必須是正整數');
    }

    get size(): number {
        return this.entries.size;
    }

    has(key: string): boolean {
        return this.entries.has(key);
    }

    /** 讀取並標為最近使用；沒有則回傳 undefined。 */
    get(key: string): T | undefined {
        if (!this.entries.has(key)) return undefined;
        const value = this.entries.get(key) as T;
        this.entries.delete(key);
        this.entries.set(key, value);
        return value;
    }

    /** 寫入並標為最近使用；超過容量時淘汰最久未使用的項目。 */
    set(key: string, value: T): void {
        if (this.entries.has(key)) this.entries.delete(key);
        this.entries.set(key, value);
        while (this.entries.size > this.capacity) {
            const oldest = this.entries.keys().next().value as string;
            this.entries.delete(oldest);
        }
    }

    /** 目前由舊到新的 key 順序，供測試與除錯用。 */
    keys(): string[] {
        return [...this.entries.keys()];
    }
}
