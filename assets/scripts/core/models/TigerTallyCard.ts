// @spec-source → 兵種（虎符）系統.md (doc_spec_0012)；PROG-2-1429 依建檔紀錄補標出處
/** 虎符為可移交的獨立卡片；來源異動不改寫原始產出季節。 */
export type TigerTallyQuality = 'R' | 'SR' | 'SSR' | 'UR';

export interface TigerTallyCard {
    uid: string;
    templateId: string;
    sourceGeneralUid: string;
    quality: TigerTallyQuality;
    score: number;
    source: 'death' | 'retire' | 'surrender' | 'reward';
    producedSeason: number;
    troopType?: string;
    /** 星級 1~5（TRP-10）；舊存檔缺欄位時讀回 1★ */
    stars?: number;
    /** 戰鬥經驗（TRP-10）；舊存檔缺欄位時讀回 0 */
    battleExp?: number;
    /** 對季節 BOSS 的克制標籤（名將挑戰賽 E-10，PROG-2-1356）；新發行虎符自帶，沒有時依兵種推得 */
    bossTags?: string[];
}
