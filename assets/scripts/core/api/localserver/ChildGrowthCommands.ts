// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.5 權威原則、§5.7 存檔即 API；PROG-2-10058 子嗣成長帳本
/**
 * ChildGrowthCommands — 子嗣成長帳本（親子好感、天賦小名碎片、同窗好友）在本機 adapter 的處理器。
 *
 * 帳本屬於重要存檔狀態：客戶端只能經命令讀取，不直接碰 GameSession 欄位；寫入由權威端（單機＝GameSession）
 * 在成長事件結算時入帳（PROG-2-10059 的 family.resolveGrowthEvent）。
 */
import type { FamilyChildLedgerResult } from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import type { LocalApiAdapter } from './LocalApiAdapter';

/** 權威端的子嗣成長宿主：單機由 GameSession 提供，連線時由伺服器取代 */
export interface ChildGrowthHost {
    childLedger(): FamilyChildLedgerResult;
}

export function registerChildGrowthCommands(adapter: LocalApiAdapter, getHost: () => ChildGrowthHost | null): void {
    const requireHost = (): ChildGrowthHost => {
        const host = getHost();
        if (!host) throw new ApiError('FAMILY_UNAVAILABLE', '家族服務尚未就緒');
        return host;
    };

    adapter.register('family.childLedger', () => ({ result: requireHost().childLedger() }));
}
