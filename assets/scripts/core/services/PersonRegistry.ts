// @spec-source → 名詞定義文件 §J「人物登記冊 PersonRegistry」「人物記錄 PersonRecord」；WBS TERM-06；PROG-2-1023
/**
 * PersonRegistry — 去重的中央人物主檔（純邏輯，不依賴 cc）。
 *
 * - 每個 uid 只有一筆 PersonRecord；重複登記回 DUPLICATE_UID，不覆蓋原紀錄。
 * - 欄位形狀不合回 INVALID_RECORD，不補預設值。
 * - 讀取回傳副本，呼叫端改動不會影響登冊內容。
 *
 * Unity 對照：像一張 ScriptableObject 總表（以 uid 為 key 的 Dictionary），每個角色只存一份，其他系統只拿引用或副本。
 */

export interface PersonRecord {
    uid: string;
    template_id: string;
    name: string;
    gene_refs: string[];
    ep_base: number;
    faction: string;
    is_virtual: boolean;
}

export type PersonRegistryRejectReason = 'INVALID_RECORD' | 'DUPLICATE_UID';

export type PersonRegistryResult = { ok: true } | { ok: false; reason: PersonRegistryRejectReason };

function isPersonRecord(value: unknown): value is PersonRecord {
    if (!value || typeof value !== 'object') return false;
    const r = value as Record<string, unknown>;
    return typeof r.uid === 'string' && r.uid.length > 0
        && typeof r.template_id === 'string' && r.template_id.length > 0
        && typeof r.name === 'string'
        && Array.isArray(r.gene_refs) && r.gene_refs.every((g) => typeof g === 'string')
        && typeof r.ep_base === 'number' && Number.isFinite(r.ep_base) && r.ep_base >= 0
        && typeof r.faction === 'string'
        && typeof r.is_virtual === 'boolean';
}

function copyRecord(record: PersonRecord): PersonRecord {
    return { ...record, gene_refs: [...record.gene_refs] };
}

export class PersonRegistry {
    private readonly records = new Map<string, PersonRecord>();

    /** 登記一個人物；uid 已存在時不覆蓋，回傳 DUPLICATE_UID。 */
    register(record: PersonRecord): PersonRegistryResult {
        if (!isPersonRecord(record)) return { ok: false, reason: 'INVALID_RECORD' };
        if (this.records.has(record.uid)) return { ok: false, reason: 'DUPLICATE_UID' };
        this.records.set(record.uid, copyRecord(record));
        return { ok: true };
    }

    has(uid: string): boolean {
        return this.records.has(uid);
    }

    /** 依 uid 讀取副本；沒有則回傳 undefined。 */
    get(uid: string): PersonRecord | undefined {
        const record = this.records.get(uid);
        return record ? copyRecord(record) : undefined;
    }

    get size(): number {
        return this.records.size;
    }

    /** 依 uid 排序列出所有人物副本，順序固定。 */
    list(): PersonRecord[] {
        return Array.from(this.records.keys()).sort().map((uid) => copyRecord(this.records.get(uid) as PersonRecord));
    }
}
