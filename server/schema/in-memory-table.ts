// @spec-source → 001_minimal_six_tables.sql（MVP-12，PROG-2-0854）
/**
 * in-memory-table — 以列驗證包住的記憶體表，供 CRUD 測試使用（純 TS，不連資料庫）
 *
 * 行為對齊資料庫約束：主鍵重複會拒絕、寫入前跑列驗證、更新是合併後再驗證。
 * 這不是正式儲存層；正式表由 001_minimal_six_tables.sql 定義，尚未部署。
 */

export type RowValidator<Row> = (row: Partial<Row>) => string[];

export interface MemoryTable<Row> {
    insert(row: Row): Row;
    get(key: string): Row | undefined;
    update(key: string, patch: Partial<Row>): Row;
    delete(key: string): boolean;
    list(): Row[];
}

export function createMemoryTable<Row extends object>(
    name: string,
    keyOf: (row: Row) => string,
    validate: RowValidator<Row>,
): MemoryTable<Row> {
    const rows = new Map<string, Row>();

    function assertValid(row: Partial<Row>): void {
        const errors = validate(row);
        if (errors.length > 0) {
            throw new Error(`[${name}] 列驗證失敗：${errors.join('；')}`);
        }
    }

    return {
        insert(row) {
            assertValid(row);
            const key = keyOf(row);
            if (rows.has(key)) throw new Error(`[${name}] 主鍵重複：${key}`);
            const stored = { ...row };
            rows.set(key, stored);
            return { ...stored };
        },
        get(key) {
            const row = rows.get(key);
            return row ? { ...row } : undefined;
        },
        update(key, patch) {
            const current = rows.get(key);
            if (!current) throw new Error(`[${name}] 找不到列：${key}`);
            const merged = { ...current, ...patch } as Row;
            assertValid(merged);
            if (keyOf(merged) !== key) throw new Error(`[${name}] 不可更新主鍵`);
            rows.set(key, merged);
            return { ...merged };
        },
        delete(key) {
            return rows.delete(key);
        },
        list() {
            return [...rows.values()].map((row) => ({ ...row }));
        },
    };
}
