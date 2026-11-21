// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §10 人員占用登記（Q-B）、§12 OCC-M；家業規格 (doc_spec_1181) 互斥規則；PROG-2-9207
/**
 * OccupancyTypes — 人員占用登記的型別與常數（零依賴，不 import 引擎或 UI）。
 *
 * 中立版（Q-B 尚未裁決）：介面只描述「誰、被什麼占用、占到何時」，
 * 不論日後併入任務框架（QST）或獨立成第七套框架，型別與命令都可原封不動搬過去。
 */

/** 可寫入登記表的占用種類（學府、教官指派、哺乳；其餘種類第二版各自遷入）。nursing 為 PROG-2-9442 新增（doc_spec_1241 第 3.5 節） */
export const WRITABLE_OCCUPANCY_KINDS = ['academy', 'mentorAssign', 'nursing'] as const;
export type WritableOccupancyKind = (typeof WRITABLE_OCCUPANCY_KINDS)[number];

/** 只讀轉接器的占用種類（現況各系統自己存狀態，登記表只讀不寫） */
export const READONLY_OCCUPANCY_KINDS = ['governance', 'hallMission', 'dispatch', 'mercenary', 'expedition', 'medical'] as const;
export type ReadonlyOccupancyKind = (typeof READONLY_OCCUPANCY_KINDS)[number];

export type OccupancyKind = WritableOccupancyKind | ReadonlyOccupancyKind;

/** 一筆占用：personId 被 kind 占用，來源物件為 refId（任務、職缺、教官卡 uid…） */
export interface OccupancyRecord {
    personId: string;
    kind: OccupancyKind;
    refId: string;
    /** 起算時間（呼叫端自定刻度，學府用「已過季數」）；只讀轉接器沒有時間資訊時為 0 */
    since: number;
    /** 預計結束；null＝到明確釋放為止 */
    until: number | null;
}

export type OccupancyErrorCode = 'CONFLICT' | 'KIND_UNKNOWN' | 'READONLY_KIND' | 'REF_MISMATCH' | 'INVALID';

export class OccupancyError extends Error {
    public readonly code: OccupancyErrorCode;
    /** 衝突時：擋下這次登記的既有占用 */
    public readonly blockedBy?: OccupancyRecord;

    public constructor(code: OccupancyErrorCode, message: string, blockedBy?: OccupancyRecord) {
        super(message);
        this.name = 'OccupancyError';
        this.code = code;
        this.blockedBy = blockedBy;
    }
}

/** 只讀轉接器：回傳該系統目前占用中的人員（每次查詢才呼叫，不快取） */
export type OccupancyReader = () => readonly OccupancyRecord[];

/**
 * 互斥矩陣：兩種占用能否同時掛在同一個人身上。
 * 沒有載入矩陣時預設全部互斥（修業、教官指派、任務、派遣、傭兵、待產都是「這個人忙」）；
 * 載入 occupancy-matrix.json（OccupancyMatrix.ts）後由設定決定，只改 JSON，不改呼叫端。
 */
export type OccupancyCompatibility = (a: OccupancyKind, b: OccupancyKind) => boolean;
