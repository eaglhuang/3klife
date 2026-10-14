/**
 * MentorCard.ts
 *
 * 退役武將轉成的「教官傳承資料」。
 * 規格（武將壽命系統 §M-1）：退役只進教官 / 傳承路徑，不產生英靈卡（SpiritCard）；
 * 英靈卡只在最終死亡時結算。因此這裡與 SpiritCard 是兩張獨立的資料。
 *
 * Unity 對照：像一個 ScriptableObject 資料卡，記錄「退役當下的快照」，
 * 之後培育流程只讀它，不再回頭改原本的武將。
 */
import type { GeneralConfig } from './GeneralUnit';

/** 教官卡來源（教官系統 Schema：Source ENUM）；Gacha=支援卡池，Retire=退役轉化，Capture=戰場俘虜，Mercenary=傭兵結義，Offspring=5 歲分流 */
export const MENTOR_SOURCES = ['Gacha', 'Retire', 'Capture', 'Mercenary', 'Offspring'] as const;
export type MentorSource = typeof MENTOR_SOURCES[number];

export interface MentorCard {
    /** 教官卡 uid；預設 mentor-{武將 id}，一位武將只會有一張 */
    uid: string;
    /** 來源武將 id */
    sourceGeneralId: string;
    name: string;
    faction: string;
    /** 退役時的歲數 */
    retiredAge: number;
    /** 退役時的 totalSeasonsElapsed */
    retiredSeason: number;
    retiredYear: number;
    ep_snapshot: number;
    /** 因子 id 清單（教官不參與血統因子遺傳，只作為傳承依據保留） */
    gene_refs: string[];
    /** 父母 uid [父, 母] */
    parentUids: [string, string];
    /** 退役當下的完整武將快照，供培育教學事件讀取屬性 */
    generalSnapshot: GeneralConfig;
    /** 獲取來源；舊存檔沒有此欄位 */
    source?: MentorSource;
}
