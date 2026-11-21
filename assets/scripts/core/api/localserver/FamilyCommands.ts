// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 3.1 配偶；首子誕生與少年名將開場流程規格書；PROG-2-9582
/**
 * FamilyCommands — 家族命令（family.enrollSpouse）在本機 adapter 的處理器。
 *
 * 配偶納入名冊屬於重要狀態：客戶端只送「來源」意圖，配偶本人（固定種子產生）、幕府等級上限與重複判定全在權威端（單機＝GameSession）。
 * 同來源重送冪等：已在名冊回 created=false，不是錯誤，首子流程中途斷線重進才不會卡住。
 */
import type { FamilyEnrollSpouseResult, FamilySpouseSource } from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import type { LocalApiAdapter } from './LocalApiAdapter';

/** 來源對應的生成型配偶 slot（單一出處；規格 3.1 與 PM 11/21 裁示：首子系統配偶 slot＝first-child） */
export const SPOUSE_SOURCE_SLOT: Record<FamilySpouseSource, string> = {
    'first-child': 'first-child',
};

export interface EnrollOutcome { ok: boolean; reason?: 'no-config' | 'duplicate' | 'cap-reached'; generalId?: string }

/** 權威端的家族宿主：單機由 GameSession 提供 */
export interface FamilyHost {
    /** 可回 Promise：單機的家族設定是延遲載入的，宿主要先等設定載好再納入 */
    enrollGeneratedSpouse(slot: string): EnrollOutcome | Promise<EnrollOutcome>;
}

export function registerFamilyCommands(adapter: LocalApiAdapter, getHost: () => FamilyHost | null): void {
    adapter.register('family.enrollSpouse', async (args) => {
        const host = getHost();
        if (!host) throw new ApiError('FAMILY_UNAVAILABLE', '家族服務尚未就緒');
        const extra = Object.keys(args).find((k) => k !== 'source');
        if (extra) throw new ApiError('FORBIDDEN_FIELD', `命令不得帶欄位 ${extra}`);
        const source = args.source;
        if (typeof source !== 'string' || !Object.prototype.hasOwnProperty.call(SPOUSE_SOURCE_SLOT, source)) {
            throw new ApiError('FAMILY_SOURCE_UNKNOWN', `未知的配偶來源 ${String(source)}`);
        }
        const out = await host.enrollGeneratedSpouse(SPOUSE_SOURCE_SLOT[source as FamilySpouseSource]);
        if (!out.ok && out.reason === 'no-config') throw new ApiError('FAMILY_NO_CONFIG', '家族設定尚未載入');
        if (!out.ok && out.reason === 'cap-reached') throw new ApiError('FAMILY_CAP_REACHED', '配偶人數已達幕府等級上限');
        if (!out.generalId) throw new ApiError('FAMILY_UNAVAILABLE', '配偶納入失敗');
        const result: FamilyEnrollSpouseResult = { generalId: out.generalId, created: out.ok };
        return { result, delta: out.ok ? [{ path: `/family/${out.generalId}`, op: 'add' as const, value: null }] : [] };
    });
}
