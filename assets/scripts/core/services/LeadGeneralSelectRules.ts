// @spec-source → MVP遊戲驗證規格書.md (doc_spec_0045) §E
/**
 * LeadGeneralSelectRules — 大廳「選主將」清單分頁（純邏輯，不依賴 cc）
 *
 * Unity 對照：像 ScrollView 的資料來源，只算「這一頁顯示哪幾列、哪列是目前主將」，不碰節點。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import type { BattleRosterGeneral } from '../systems/BattleRoster';

export const LEAD_SELECT_PAGE_SIZE = 3;

export interface LeadSelectRow {
    id: string;
    label: string;
    selected: boolean;
}

export interface LeadSelectView {
    rows: LeadSelectRow[];
    page: number;
    pageCount: number;
}

function labelOf(general: GeneralConfig): string {
    const rating = (general as BattleRosterGeneral).graduationRating;
    return rating ? `${general.name}（${rating}）` : general.name;
}

/** page 超出範圍會被夾回有效頁；沒有可出戰武將時 pageCount 為 1、rows 為空 */
export function buildLeadSelectView(
    deployable: readonly GeneralConfig[],
    leadId: string | null,
    page: number,
    pageSize: number = LEAD_SELECT_PAGE_SIZE,
): LeadSelectView {
    const pageCount = Math.max(1, Math.ceil(deployable.length / pageSize));
    const safePage = Math.min(Math.max(0, Math.floor(page)), pageCount - 1);
    const rows = deployable.slice(safePage * pageSize, safePage * pageSize + pageSize).map((general) => ({
        id: general.id,
        label: labelOf(general),
        selected: general.id === leadId,
    }));
    return { rows, page: safePage, pageCount };
}

/** 點到已是主將的那列 → 取消指定（回到遭遇戰預設）；否則改選該武將 */
export function nextLeadId(currentLeadId: string | null, clickedId: string): string | null {
    return currentLeadId === clickedId ? null : clickedId;
}
