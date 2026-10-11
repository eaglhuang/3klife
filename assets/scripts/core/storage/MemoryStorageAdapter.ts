/**
 * MemoryStorageAdapter — 記憶體版 DataStorageAdapter
 *
 * 用途：
 * 1. headless 測試（不需要瀏覽器 IndexedDB）
 * 2. 平台沒有可用持久化後端時的暫存備援（重開即消失）
 *
 * Unity 對照：像測試時用 Dictionary 取代 PlayerPrefs 的假實作。
 */
import { DataStorageAdapter, StorageQueryFilter, StorageStats } from './DataStorageAdapter';

function cloneValue<T>(value: T): T {
    return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

export class MemoryStorageAdapter extends DataStorageAdapter {
    readonly adapterName = 'Memory';

    private readonly _store = new Map<string, unknown>();

    async init(): Promise<void> {
        // 記憶體後端不需要初始化
    }

    async get<T>(key: string): Promise<T | null> {
        return this._store.has(key) ? cloneValue(this._store.get(key) as T) : null;
    }

    async set<T>(key: string, value: T): Promise<void> {
        // 以 JSON 複製模擬真實後端的序列化邊界，避免呼叫端事後改物件影響已存資料
        this._store.set(key, cloneValue(value));
    }

    async delete(key: string): Promise<void> {
        this._store.delete(key);
    }

    async clear(): Promise<void> {
        this._store.clear();
    }

    async query<T>(_storeName: string, _filters: StorageQueryFilter[], _limit?: number, _offset?: number): Promise<T[]> {
        return [];
    }

    async getStorageStats(): Promise<StorageStats> {
        return { usedBytes: -1, quotaBytes: -1, recordCount: this._store.size };
    }

    async dispose(): Promise<void> {
        this._store.clear();
    }
}
