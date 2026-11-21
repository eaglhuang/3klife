// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §10 人員占用登記、§12 OCC-M；PROG-2-9207
/**
 * OccupancyService — 人員占用登記表（零依賴）。
 *
 * - 登記表：只存 academy／mentorAssign／nursing 三種，acquire／release 冪等（同一筆重送不重複、不報錯）。
 * - 轉接器：其餘六處（太守府、大廳任務、派遣、傭兵、歷練、待產重傷）由宿主以唯讀函式接上，
 *   查詢與互斥判定都納入，但本服務不改它們的狀態。
 * - 互斥：預設同一個人同時只能被一種來源占用；載入互斥矩陣後由設定決定哪些種類可並存（例：哺乳可兼太守、教官指派）；同種占用換 refId 也算衝突。
 * - 活動指派檢查（checkAssign／assertAssignable）：在「指派當下」問某人能不能做某活動（出征、太守、傭兵…），不是事後在畫面報錯。
 */
import {
    activityBlockedBy, isKnownActivity, kindsCompatible, type OccupancyMatrixV1,
} from './OccupancyMatrix';
import {
    OccupancyError, READONLY_OCCUPANCY_KINDS, WRITABLE_OCCUPANCY_KINDS,
    type OccupancyCompatibility, type OccupancyKind, type OccupancyReader, type OccupancyRecord,
    type ReadonlyOccupancyKind, type WritableOccupancyKind,
} from './OccupancyTypes';

export interface OccupancyServiceDeps {
    readers?: Partial<Record<ReadonlyOccupancyKind, OccupancyReader>>;
    compatible?: OccupancyCompatibility;
    /** 互斥矩陣（occupancy-matrix.json 解析結果）；未給且沒有 compatible 時全互斥 */
    matrix?: OccupancyMatrixV1;
}

/** MVP 預設：全部互斥 */
const DEFAULT_COMPATIBLE: OccupancyCompatibility = () => false;

function isWritableKind(kind: string): kind is WritableOccupancyKind {
    return (WRITABLE_OCCUPANCY_KINDS as readonly string[]).indexOf(kind) >= 0;
}

function isReadonlyKind(kind: string): kind is ReadonlyOccupancyKind {
    return (READONLY_OCCUPANCY_KINDS as readonly string[]).indexOf(kind) >= 0;
}

/** 正規化存檔帶來的一筆紀錄；壞資料回 null */
export function normalizeOccupancyRecord(raw: unknown): OccupancyRecord | null {
    const r = raw as Partial<OccupancyRecord> | null;
    if (!r || typeof r !== 'object') return null;
    if (typeof r.personId !== 'string' || r.personId === '' || typeof r.refId !== 'string' || r.refId === '') return null;
    if (typeof r.kind !== 'string' || !isWritableKind(r.kind)) return null;
    const since = typeof r.since === 'number' && Number.isFinite(r.since) ? r.since : 0;
    const until = typeof r.until === 'number' && Number.isFinite(r.until) ? r.until : null;
    return { personId: r.personId, kind: r.kind, refId: r.refId, since, until };
}

export function normalizeOccupancyRecords(raw: unknown): OccupancyRecord[] {
    if (!Array.isArray(raw)) return [];
    const out: OccupancyRecord[] = [];
    for (const item of raw) {
        const rec = normalizeOccupancyRecord(item);
        if (rec && !out.some((x) => x.personId === rec.personId && x.kind === rec.kind)) out.push(rec);
    }
    return out;
}

export class OccupancyService {
    private _records: OccupancyRecord[] = [];
    private readonly _readers: Partial<Record<ReadonlyOccupancyKind, OccupancyReader>>;
    private _compatible: OccupancyCompatibility;
    private _matrix: OccupancyMatrixV1 | null;

    public constructor(deps: OccupancyServiceDeps = {}) {
        this._readers = deps.readers ?? {};
        this._matrix = deps.matrix ?? null;
        this._compatible = deps.compatible ?? this._matrixCompatible();
    }

    private _matrixCompatible(): OccupancyCompatibility {
        const matrix = this._matrix;
        return matrix ? (a, b) => kindsCompatible(matrix, a, b) : DEFAULT_COMPATIBLE;
    }

    /** 載入（或替換）互斥矩陣；宿主在設定載入後呼叫，已登記的紀錄不重新檢查 */
    public setMatrix(matrix: OccupancyMatrixV1 | null): void {
        this._matrix = matrix;
        this._compatible = this._matrixCompatible();
    }

    public get matrix(): OccupancyMatrixV1 | null {
        return this._matrix;
    }

    /**
     * 活動指派檢查：某人現在能不能被指派做 activity（sortie 出征、gov 太守、mercenary 傭兵…）。
     * 有矩陣時依規則（任一占用沒明列放行就擋）；沒矩陣時任何占用都擋。activity 不在矩陣活動表丟 INVALID。
     */
    public checkAssign(personId: string, activity: string): { allowed: boolean; blockedBy?: OccupancyRecord } {
        if (typeof personId !== 'string' || personId === '') throw new OccupancyError('INVALID', 'personId 必須是非空字串');
        if (typeof activity !== 'string' || activity === '') throw new OccupancyError('INVALID', 'activity 必須是非空字串');
        const records = this.query(personId);
        if (!this._matrix) return records.length === 0 ? { allowed: true } : { allowed: false, blockedBy: records[0] };
        if (!isKnownActivity(this._matrix, activity)) throw new OccupancyError('INVALID', `未知的活動 ${activity}`);
        const blocker = activityBlockedBy(this._matrix, records, activity);
        return blocker ? { allowed: false, blockedBy: { ...blocker } } : { allowed: true };
    }

    /** 同 checkAssign，被擋時丟 OccupancyError('CONFLICT')（命令層對應 E330） */
    public assertAssignable(personId: string, activity: string): void {
        const out = this.checkAssign(personId, activity);
        if (!out.allowed) {
            const b = out.blockedBy as OccupancyRecord;
            throw new OccupancyError('CONFLICT', `${personId} 已被 ${b.kind}（${b.refId}）占用，不能指派 ${activity}`, b);
        }
    }

    /** 登記表快照（只含可寫的兩種），給存檔用 */
    public snapshot(): OccupancyRecord[] {
        return this._records.map((r) => ({ ...r }));
    }

    public restore(records: unknown): void {
        this._records = normalizeOccupancyRecords(records);
    }

    /** 轉接器讀到的占用（不含登記表） */
    private _adapted(): OccupancyRecord[] {
        const out: OccupancyRecord[] = [];
        for (const kind of READONLY_OCCUPANCY_KINDS) {
            const reader = this._readers[kind];
            if (!reader) continue;
            for (const rec of reader()) out.push({ ...rec, kind });
        }
        return out;
    }

    /** 某人目前所有占用（登記表＋六處轉接器） */
    public query(personId: string): OccupancyRecord[] {
        return [...this._records, ...this._adapted()].filter((r) => r.personId === personId).map((r) => ({ ...r }));
    }

    /** 全部占用（登記表＋六處轉接器） */
    public listAll(): OccupancyRecord[] {
        return [...this._records, ...this._adapted()].map((r) => ({ ...r }));
    }

    /** 登記表（academy／mentorAssign／nursing）中被占用的人員 id；清單過濾用，轉接器那六處各清單本來就會自查 */
    public registeredIds(): Set<string> {
        return new Set(this._records.map((r) => r.personId));
    }

    /** 登記表是否占用該人 */
    public isRegistered(personId: string): boolean {
        return this._records.some((r) => r.personId === personId);
    }

    /** 任何來源（登記表＋轉接器）都算：該人是否忙碌 */
    public isOccupied(personId: string): boolean {
        return this.query(personId).length > 0;
    }

    /** 候選清單過濾：排除被任何來源占用的人，保留原順序 */
    public filterFree<T extends string>(personIds: readonly T[]): T[] {
        const busy = new Set(this.listAll().map((r) => r.personId));
        return personIds.filter((id) => !busy.has(id));
    }

    /**
     * 登記占用。冪等：同一人、同種類、同 refId 已存在時回傳既有紀錄（acquired=false），不改 since／until。
     * 衝突（已被別種來源或同種不同 refId 占用）丟 OccupancyError('CONFLICT')，登記表不變。
     */
    public acquire(input: { personId: string; kind: string; refId: string; since?: number; until?: number | null }): { acquired: boolean; record: OccupancyRecord } {
        if (typeof input.personId !== 'string' || input.personId === '') throw new OccupancyError('INVALID', 'personId 必須是非空字串');
        if (typeof input.refId !== 'string' || input.refId === '') throw new OccupancyError('INVALID', 'refId 必須是非空字串');
        if (isReadonlyKind(input.kind)) throw new OccupancyError('READONLY_KIND', `${input.kind} 由原系統管理，登記表只讀`);
        if (!isWritableKind(input.kind)) throw new OccupancyError('KIND_UNKNOWN', `未知的占用種類 ${input.kind}`);
        const kind = input.kind;
        const existing = this._records.find((r) => r.personId === input.personId && r.kind === kind);
        if (existing && existing.refId === input.refId) return { acquired: false, record: { ...existing } };
        const blocker = this.query(input.personId).find((r) => r.kind === kind || !this._compatible(kind, r.kind));
        if (blocker) throw new OccupancyError('CONFLICT', `${input.personId} 已被 ${blocker.kind}（${blocker.refId}）占用`, blocker);
        const record: OccupancyRecord = {
            personId: input.personId, kind, refId: input.refId,
            since: typeof input.since === 'number' && Number.isFinite(input.since) ? input.since : 0,
            until: typeof input.until === 'number' && Number.isFinite(input.until) ? input.until : null,
        };
        this._records.push(record);
        return { acquired: true, record: { ...record } };
    }

    /**
     * 釋放占用。冪等：沒有該筆回 false；refId 對不上（別人的占用）丟 REF_MISMATCH，不誤放。
     */
    public release(input: { personId: string; kind: string; refId: string }): boolean {
        if (isReadonlyKind(input.kind)) throw new OccupancyError('READONLY_KIND', `${input.kind} 由原系統管理，登記表只讀`);
        if (!isWritableKind(input.kind)) throw new OccupancyError('KIND_UNKNOWN', `未知的占用種類 ${input.kind}`);
        const index = this._records.findIndex((r) => r.personId === input.personId && r.kind === input.kind);
        if (index < 0) return false;
        if (this._records[index].refId !== input.refId) {
            throw new OccupancyError('REF_MISMATCH', `${input.personId} 的 ${input.kind} 占用屬於 ${this._records[index].refId}，不是 ${input.refId}`, { ...this._records[index] });
        }
        this._records.splice(index, 1);
        return true;
    }

    /** 某種類目前占用的人員 id */
    public idsOfKind(kind: WritableOccupancyKind): string[] {
        return this._records.filter((r) => r.kind === kind).map((r) => r.personId);
    }

    /** 某種類的占用紀錄（宿主對帳用，例如學府讀檔後重建） */
    public recordsOfKind(kind: WritableOccupancyKind): OccupancyRecord[] {
        return this._records.filter((r) => r.kind === kind).map((r) => ({ ...r }));
    }
}
